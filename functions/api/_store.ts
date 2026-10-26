// Shared storage helper for Cloudflare Pages Functions
// Supports Cloudflare KV (production) with automatic in-memory fallback (local development)

const memoryStore = new Map<string, any>();

export async function getStoredRequest(token: string, env: any) {
  if (env && env.TRUSTLOCATE_KV) {
    const raw = await env.TRUSTLOCATE_KV.get(token);
    if (!raw) return null;
    return JSON.parse(raw);
  }
  return memoryStore.get(token) || null;
}

export async function setStoredRequest(token: string, data: any, durationSeconds: number, env: any) {
  if (env && env.TRUSTLOCATE_KV) {
    // Cloudflare KV supports native automatic TTL expiration!
    await env.TRUSTLOCATE_KV.put(token, JSON.stringify(data), {
      expirationTtl: Math.max(60, durationSeconds),
    });
  } else {
    memoryStore.set(token, data);
  }
}

export async function deleteStoredRequest(token: string, env: any) {
  if (env && env.TRUSTLOCATE_KV) {
    await env.TRUSTLOCATE_KV.delete(token);
  } else {
    memoryStore.delete(token);
  }
}

export function jsonResponse(body: any, status = 200) {
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
