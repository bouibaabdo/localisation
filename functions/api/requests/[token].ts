import { getStoredRequest, jsonResponse } from '../_store';

export async function onRequestGet(context: any) {
  const { params, env } = context;
  const token = params.token as string;

  const request = await getStoredRequest(token, env);
  if (!request) {
    return jsonResponse({ error: 'Request not found or has expired.' }, 404);
  }

  const now = Date.now();
  if (now > request.expiresAt && request.status === 'PENDING') {
    request.status = 'EXPIRED';
  }

  return jsonResponse({
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
    historyLog: request.historyLog || [],
  });
}

export async function onRequestOptions() {
  return jsonResponse({}, 204);
}
