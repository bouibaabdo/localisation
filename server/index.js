import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'DELETE'],
}));
app.use(express.json({ limit: '50kb' }));

// In-memory store for location requests
// Key: token, Value: LocationRequest object
const requestsStore = new Map();

// Rate limiter map: IP -> timestamp array
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const MAX_REQUESTS_PER_WINDOW = 20;

function checkRateLimit(ip) {
  const now = Date.now();
  const timestamps = (rateLimitMap.get(ip) || []).filter(t => now - t < RATE_LIMIT_WINDOW_MS);
  if (timestamps.length >= MAX_REQUESTS_PER_WINDOW) {
    return false;
  }
  timestamps.push(now);
  rateLimitMap.set(ip, timestamps);
  return true;
}

// Background cleanup routine to auto-purge expired and revoked requests
setInterval(() => {
  const now = Date.now();
  for (const [token, req] of requestsStore.entries()) {
    // Purge records older than expiresAt + 1 hour or revoked > 30 minutes ago
    if (now > req.expiresAt + 60 * 60 * 1000 || (req.revokedAt && now > req.revokedAt + 30 * 60 * 1000)) {
      requestsStore.delete(token);
    } else if (now > req.expiresAt && req.status === 'PENDING') {
      req.status = 'EXPIRED';
      req.historyLog.push({ action: 'EXPIRED', timestamp: now, details: 'Validity window elapsed' });
    }
  }
}, 30 * 1000);

// Helper to sanitize text
function sanitize(str, maxLen = 100) {
  if (!str || typeof str !== 'string') return '';
  return str.trim().slice(0, maxLen).replace(/[<>]/g, '');
}

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'TrustLocate Secure Consent Server', uptime: process.uptime() });
});

// 1. Create a new location request
app.post('/api/requests', (req, res) => {
  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
  if (!checkRateLimit(clientIp)) {
    return res.status(429).json({ error: 'Too many requests. Please wait before creating new links.' });
  }

  const { requesterName, purpose, durationMinutes = 15, isMockMode = false } = req.body;

  const validDurations = [5, 15, 30, 60, 120];
  const duration = validDurations.includes(Number(durationMinutes)) ? Number(durationMinutes) : 15;

  const now = Date.now();
  const token = crypto.randomBytes(16).toString('hex'); // 128-bit cryptographically secure random token
  const id = uuidv4();

  const newRequest = {
    id,
    token,
    requesterName: sanitize(requesterName, 60) || 'Anonymous Requester',
    purpose: sanitize(purpose, 150) || 'One-time meeting location sharing',
    createdAt: now,
    expiresAt: now + duration * 60 * 1000,
    durationMinutes: duration,
    status: 'PENDING',
    isMockMode: Boolean(isMockMode),
    locationPoint: null,
    revokedAt: null,
    historyLog: [
      { action: 'CREATED', timestamp: now, details: `Created with ${duration}m validity` }
    ]
  };

  requestsStore.set(token, newRequest);

  // Security: Do NOT log sensitive details to standard output
  console.log(`[REQ CREATED] ID: ${id} | Duration: ${duration}m | Mock: ${isMockMode}`);

  res.status(201).json({
    id: newRequest.id,
    token: newRequest.token,
    expiresAt: newRequest.expiresAt,
    durationMinutes: newRequest.durationMinutes,
    status: newRequest.status,
    isMockMode: newRequest.isMockMode
  });
});

// 2. Get request status by token (Used by both Requester dashboard and Recipient consent page)
app.get('/api/requests/:token', (req, res) => {
  const { token } = req.params;
  const request = requestsStore.get(token);

  if (!request) {
    return res.status(404).json({ error: 'Request not found or has been permanently deleted.' });
  }

  const now = Date.now();
  // Check expiration dynamically
  if (now > request.expiresAt && request.status === 'PENDING') {
    request.status = 'EXPIRED';
    request.historyLog.push({ action: 'EXPIRED', timestamp: now, details: 'Validity window elapsed' });
  }

  res.json({
    id: request.id,
    token: request.token,
    requesterName: request.requesterName,
    purpose: request.purpose,
    createdAt: request.createdAt,
    expiresAt: request.expiresAt,
    durationMinutes: request.durationMinutes,
    status: request.status,
    isMockMode: request.isMockMode,
    locationPoint: request.locationPoint,
    revokedAt: request.revokedAt,
    historyLog: request.historyLog
  });
});

// 3. Recipient submits consent decision (ACCEPT with 1-time location, or REJECT)
app.post('/api/requests/:token/consent', (req, res) => {
  const { token } = req.params;
  const request = requestsStore.get(token);

  if (!request) {
    return res.status(404).json({ error: 'Request not found or expired.' });
  }

  const now = Date.now();
  if (now > request.expiresAt) {
    request.status = 'EXPIRED';
    return res.status(410).json({ error: 'This request has expired and can no longer be answered.' });
  }

  if (request.status !== 'PENDING') {
    return res.status(409).json({ error: `Request has already been processed with status: ${request.status}` });
  }

  const { decision, location } = req.body;

  if (decision === 'DECLINE') {
    request.status = 'REJECTED';
    request.historyLog.push({ action: 'DECLINED_BY_RECIPIENT', timestamp: now });
    console.log(`[REQ REJECTED] ID: ${request.id}`);
    return res.json({ status: 'REJECTED', message: 'You have safely declined sharing your location.' });
  }

  if (decision === 'ACCEPT') {
    if (!location || typeof location.lat !== 'number' || typeof location.lng !== 'number') {
      return res.status(400).json({ error: 'Valid single-point coordinates are required when accepting.' });
    }

    // Validate coordinate range
    const lat = Number(location.lat);
    const lng = Number(location.lng);
    const accuracy = Number(location.accuracy) || 20;

    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return res.status(400).json({ error: 'Coordinates are out of geographic boundaries.' });
    }

    // Single point-in-time capture
    request.locationPoint = {
      lat,
      lng,
      accuracy: Math.round(accuracy),
      capturedAt: now
    };
    request.status = 'ACCEPTED';
    request.historyLog.push({
      action: 'ACCEPTED_BY_RECIPIENT',
      timestamp: now,
      details: `1-time point recorded with ~${Math.round(accuracy)}m accuracy`
    });

    console.log(`[REQ ACCEPTED] ID: ${request.id} | Single point recorded (Zero coordinates logged)`);
    return res.json({ status: 'ACCEPTED', message: 'Location shared successfully.' });
  }

  res.status(400).json({ error: 'Invalid decision. Must be ACCEPT or DECLINE.' });
});

// 4. Revoke and completely purge location data (Recipient or Requester)
app.post('/api/requests/:token/revoke', (req, res) => {
  const { token } = req.params;
  const request = requestsStore.get(token);

  if (!request) {
    return res.status(404).json({ error: 'Request not found or already deleted.' });
  }

  const now = Date.now();
  // Erase location coordinates immediately
  request.locationPoint = null;
  request.status = 'REVOKED';
  request.revokedAt = now;
  request.historyLog.push({ action: 'DATA_REVOKED_AND_DELETED', timestamp: now, details: 'Coordinates permanently wiped' });

  console.log(`[REQ REVOKED] ID: ${request.id} - Coordinates purged from memory.`);
  res.json({ status: 'REVOKED', message: 'Location data has been permanently deleted.' });
});

app.listen(PORT, () => {
  console.log(`[TrustLocate Server] Running securely on http://localhost:${PORT}`);
});
