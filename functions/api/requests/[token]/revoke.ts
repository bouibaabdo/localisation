import { getStoredRequest, setStoredRequest, jsonResponse } from '../../_store';

export async function onRequestPost(context: any) {
  const { params, env } = context;
  const token = params.token as string;

  const reqData = await getStoredRequest(token, env);
  if (!reqData) {
    return jsonResponse({ error: 'Request not found or already deleted.' }, 404);
  }

  const now = Date.now();
  // Erase coordinates immediately
  reqData.locationPoint = null;
  reqData.status = 'REVOKED';
  reqData.revokedAt = now;
  reqData.historyLog.push({ action: 'REVOKED_AND_PURGED', timestamp: now });

  // Store the revoked state for a short TTL before automatic purge
  await setStoredRequest(token, reqData, 300, env);

  return jsonResponse({ status: 'REVOKED', message: 'Location coordinates permanently deleted.' });
}

export async function onRequestOptions() {
  return jsonResponse({}, 204);
}
