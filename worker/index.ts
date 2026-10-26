// Cloudflare Worker entry point with Static Assets support
// Handles /api/* routes and serves React frontend via env.ASSETS

interface Env {
  ASSETS: {
    fetch: (request: Request) => Promise<Response>;
  };
  TRUSTLOCATE_KV?: any;
}

// In-memory fallback map for requests
const memoryStore = new Map<string, any>();

function jsonResponse(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return jsonResponse({}, 204);
    }

    // --- API ROUTES (/api/*) ---
    if (path.startsWith('/api/')) {
      // 1. Health check
      if (path === '/api/health' && request.method === 'GET') {
        return jsonResponse({
          status: 'ok',
          service: 'TrustLocate Cloudflare Worker & Assets',
          timestamp: Date.now(),
        });
      }

      // 2. Create request: POST /api/requests
      if (path === '/api/requests' && request.method === 'POST') {
        try {
          const body = (await request.json()) as any;
          const { requesterName, purpose, durationMinutes = 15, isMockMode = false } = body;
          const validDurations = [5, 15, 30, 60, 120];
          const duration = validDurations.includes(Number(durationMinutes)) ? Number(durationMinutes) : 15;

          const now = Date.now();
          const array = new Uint8Array(16);
          crypto.getRandomValues(array);
          const token = Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('');
          const id = crypto.randomUUID();

          const newRequest = {
            id,
            token,
            requesterName: (requesterName || 'طالب المشاركة').slice(0, 60),
            purpose: (purpose || 'مشاركة لمرة واحدة').slice(0, 150),
            createdAt: now,
            expiresAt: now + duration * 60 * 1000,
            durationMinutes: duration,
            status: 'PENDING',
            isMockMode: Boolean(isMockMode),
            locationPoint: null,
            revokedAt: null,
            historyLog: [{ action: 'CREATED_ON_CLOUDFLARE', timestamp: now }],
          };

          if (env.TRUSTLOCATE_KV) {
            await env.TRUSTLOCATE_KV.put(token, JSON.stringify(newRequest), {
              expirationTtl: duration * 60,
            });
          } else {
            memoryStore.set(token, newRequest);
          }

          return jsonResponse(
            {
              id: newRequest.id,
              token: newRequest.token,
              expiresAt: newRequest.expiresAt,
              durationMinutes: newRequest.durationMinutes,
              status: newRequest.status,
              isMockMode: newRequest.isMockMode,
            },
            201
          );
        } catch (err: any) {
          return jsonResponse({ error: err.message || 'Invalid payload' }, 400);
        }
      }

      // 3. Match /api/requests/:token routes
      const match = path.match(/^\/api\/requests\/([a-zA-Z0-9_\-]+)(\/(consent|revoke))?$/);
      if (match) {
        const token = match[1];
        const subAction = match[3];

        let reqData: any = null;
        if (env.TRUSTLOCATE_KV) {
          const raw = await env.TRUSTLOCATE_KV.get(token);
          if (raw) reqData = JSON.parse(raw);
        } else {
          reqData = memoryStore.get(token) || null;
        }

        if (!reqData) {
          return jsonResponse({ error: 'Request not found or expired.' }, 404);
        }

        const now = Date.now();

        // 3a. GET request status
        if (!subAction && request.method === 'GET') {
          if (now > reqData.expiresAt && reqData.status === 'PENDING') {
            reqData.status = 'EXPIRED';
          }
          return jsonResponse(reqData);
        }

        // 3b. POST consent
        if (subAction === 'consent' && request.method === 'POST') {
          if (now > reqData.expiresAt) {
            reqData.status = 'EXPIRED';
            return jsonResponse({ error: 'This request has expired.' }, 410);
          }
          if (reqData.status !== 'PENDING') {
            return jsonResponse({ error: `Request already processed: ${reqData.status}` }, 409);
          }

          const { decision, location } = (await request.json()) as any;
          if (decision === 'DECLINE') {
            reqData.status = 'REJECTED';
            reqData.historyLog.push({ action: 'DECLINED_BY_RECIPIENT', timestamp: now });
          } else if (decision === 'ACCEPT') {
            if (!location || typeof location.lat !== 'number' || typeof location.lng !== 'number') {
              return jsonResponse({ error: 'Coordinates required' }, 400);
            }
            reqData.locationPoint = {
              lat: Number(location.lat),
              lng: Number(location.lng),
              accuracy: Math.round(Number(location.accuracy) || 20),
              capturedAt: now,
              formattedAddress: location.formattedAddress ? String(location.formattedAddress).slice(0, 200) : undefined,
              city: location.city ? String(location.city).slice(0, 100) : undefined,
              country: location.country ? String(location.country).slice(0, 100) : undefined,
            };
            reqData.status = 'ACCEPTED';
            reqData.historyLog.push({ action: 'ACCEPTED_BY_RECIPIENT', timestamp: now });
          } else {
            return jsonResponse({ error: 'Invalid decision' }, 400);
          }

          if (env.TRUSTLOCATE_KV) {
            await env.TRUSTLOCATE_KV.put(token, JSON.stringify(reqData), {
              expirationTtl: Math.max(60, Math.floor((reqData.expiresAt - now) / 1000)),
            });
          } else {
            memoryStore.set(token, reqData);
          }

          return jsonResponse({ status: reqData.status });
        }

        // 3c. POST revoke
        if (subAction === 'revoke' && request.method === 'POST') {
          reqData.locationPoint = null;
          reqData.status = 'REVOKED';
          reqData.revokedAt = now;

          if (env.TRUSTLOCATE_KV) {
            await env.TRUSTLOCATE_KV.put(token, JSON.stringify(reqData), { expirationTtl: 300 });
          } else {
            memoryStore.set(token, reqData);
          }
          return jsonResponse({ status: 'REVOKED' });
        }
      }

      return jsonResponse({ error: 'API endpoint not found' }, 404);
    }

    // --- STATIC ASSETS (React Frontend) ---
    // If env.ASSETS is available, serve frontend with SPA fallback to /index.html
    if (env.ASSETS) {
      try {
        const response = await env.ASSETS.fetch(request);
        if (response.status === 404 && request.method === 'GET') {
          // SPA fallback for client-side routing
          const indexRequest = new Request(new URL('/index.html', request.url), request);
          return await env.ASSETS.fetch(indexRequest);
        }
        return response;
      } catch {
        return new Response('Assets loading error', { status: 500 });
      }
    }

    return new Response('TrustLocate is running.', { status: 200 });
  },
};
