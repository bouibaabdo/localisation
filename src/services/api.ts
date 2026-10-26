import type { LocationPoint, LocationRequestData } from '../types';

const API_BASE = '/api';

export async function createRequest(params: {
  requesterName: string;
  purpose: string;
  durationMinutes: number;
  isMockMode: boolean;
}): Promise<{ id: string; token: string; expiresAt: number }> {
  try {
    const res = await fetch(`${API_BASE}/requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Error ${res.status}`);
    }
    return await res.json();
  } catch (e) {
    console.warn('Backend unavailable, falling back to local simulation mode:', e);
    // Offline simulation fallback
    const id = 'sim-' + Math.random().toString(36).substring(2, 9);
    const token = 'sim-token-' + Math.random().toString(36).substring(2, 10);
    const now = Date.now();
    const expiresAt = now + params.durationMinutes * 60 * 1000;
    const simData: LocationRequestData = {
      id,
      token,
      requesterName: params.requesterName || 'طالب المشاركة',
      purpose: params.purpose || 'مشاركة لمرة واحدة',
      createdAt: now,
      expiresAt,
      durationMinutes: params.durationMinutes,
      status: 'PENDING',
      isMockMode: params.isMockMode,
      locationPoint: null,
      revokedAt: null,
      historyLog: [{ action: 'CREATED_LOCAL', timestamp: now }],
    };
    localStorage.setItem(`trustlocate_${token}`, JSON.stringify(simData));
    return { id, token, expiresAt };
  }
}

export async function getRequest(token: string): Promise<LocationRequestData> {
  try {
    const res = await fetch(`${API_BASE}/requests/${token}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Error ${res.status}`);
    }
    return await res.json();
  } catch (e) {
    const local = localStorage.getItem(`trustlocate_${token}`);
    if (local) {
      const data: LocationRequestData = JSON.parse(local);
      if (Date.now() > data.expiresAt && data.status === 'PENDING') {
        data.status = 'EXPIRED';
      }
      return data;
    }
    throw e;
  }
}

export async function submitConsent(
  token: string,
  decision: 'ACCEPT' | 'DECLINE',
  location?: LocationPoint
): Promise<{ status: string; message: string }> {
  try {
    const res = await fetch(`${API_BASE}/requests/${token}/consent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision, location }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Error ${res.status}`);
    }
    return await res.json();
  } catch (e) {
    const local = localStorage.getItem(`trustlocate_${token}`);
    if (local) {
      const data: LocationRequestData = JSON.parse(local);
      if (decision === 'DECLINE') {
        data.status = 'REJECTED';
      } else if (decision === 'ACCEPT' && location) {
        data.status = 'ACCEPTED';
        data.locationPoint = location;
      }
      localStorage.setItem(`trustlocate_${token}`, JSON.stringify(data));
      return { status: data.status, message: 'Updated locally' };
    }
    throw e;
  }
}

export async function revokeRequest(token: string): Promise<{ status: string; message: string }> {
  try {
    const res = await fetch(`${API_BASE}/requests/${token}/revoke`, {
      method: 'POST',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Error ${res.status}`);
    }
    return await res.json();
  } catch (e) {
    const local = localStorage.getItem(`trustlocate_${token}`);
    if (local) {
      const data: LocationRequestData = JSON.parse(local);
      data.status = 'REVOKED';
      data.locationPoint = null;
      data.revokedAt = Date.now();
      localStorage.setItem(`trustlocate_${token}`, JSON.stringify(data));
      return { status: 'REVOKED', message: 'Revoked locally' };
    }
    throw e;
  }
}
