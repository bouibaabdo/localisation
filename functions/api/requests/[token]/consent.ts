import { getStoredRequest, setStoredRequest, jsonResponse } from '../../_store';

export async function onRequestPost(context: any) {
  const { params, request, env } = context;
  const token = params.token as string;

  const reqData = await getStoredRequest(token, env);
  if (!reqData) {
    return jsonResponse({ error: 'Request not found or expired.' }, 404);
  }

  const now = Date.now();
  if (now > reqData.expiresAt) {
    reqData.status = 'EXPIRED';
    await setStoredRequest(token, reqData, 60, env);
    return jsonResponse({ error: 'This request has expired and can no longer be answered.' }, 410);
  }

  if (reqData.status !== 'PENDING') {
    return jsonResponse({ error: `Request has already been processed with status: ${reqData.status}` }, 409);
  }

  try {
    const { decision, location } = await request.json();

    if (decision === 'DECLINE') {
      reqData.status = 'REJECTED';
      reqData.historyLog.push({ action: 'DECLINED_BY_RECIPIENT', timestamp: now });
      await setStoredRequest(token, reqData, Math.max(60, Math.floor((reqData.expiresAt - now) / 1000)), env);
      return jsonResponse({ status: 'REJECTED', message: 'You have safely declined sharing your location.' });
    }

    if (decision === 'ACCEPT') {
      if (!location || typeof location.lat !== 'number' || typeof location.lng !== 'number') {
        return jsonResponse({ error: 'Valid single-point coordinates required when accepting.' }, 400);
      }

      const lat = Number(location.lat);
      const lng = Number(location.lng);
      const accuracy = Number(location.accuracy) || 20;

      if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        return jsonResponse({ error: 'Coordinates are out of boundaries.' }, 400);
      }

      reqData.locationPoint = {
        lat,
        lng,
        accuracy: Math.round(accuracy),
        capturedAt: now,
      };
      reqData.status = 'ACCEPTED';
      reqData.historyLog.push({
        action: 'ACCEPTED_BY_RECIPIENT',
        timestamp: now,
        details: `1-time point recorded with ~${Math.round(accuracy)}m accuracy`,
      });

      await setStoredRequest(token, reqData, Math.max(60, Math.floor((reqData.expiresAt - now) / 1000)), env);
      return jsonResponse({ status: 'ACCEPTED', message: 'Location shared successfully.' });
    }

    return jsonResponse({ error: 'Decision must be ACCEPT or DECLINE' }, 400);
  } catch (err: any) {
    return jsonResponse({ error: err.message || 'Invalid payload' }, 400);
  }
}

export async function onRequestOptions() {
  return jsonResponse({}, 204);
}
