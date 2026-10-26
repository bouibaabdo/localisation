import { setStoredRequest, jsonResponse } from '../_store';

export async function onRequestPost(context: any) {
  const { request, env } = context;

  try {
    const body = await request.json();
    const { requesterName, purpose, durationMinutes = 15, isMockMode = false } = body;

    const validDurations = [5, 15, 30, 60, 120];
    const duration = validDurations.includes(Number(durationMinutes)) ? Number(durationMinutes) : 15;

    const now = Date.now();
    // Cryptographically secure random token in Web Crypto API (Native to Cloudflare Workers)
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    const token = Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
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
      historyLog: [
        { action: 'CREATED_ON_CLOUDFLARE', timestamp: now, details: `${duration}m validity` }
      ],
    };

    // Store in KV / memory with TTL
    await setStoredRequest(token, newRequest, duration * 60, env);

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
    return jsonResponse({ error: err.message || 'Invalid request body' }, 400);
  }
}

export async function onRequestOptions() {
  return jsonResponse({}, 204);
}
