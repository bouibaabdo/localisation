// Cloudflare Pages Function: /api/health
export async function onRequestGet() {
  return new Response(
    JSON.stringify({
      status: 'ok',
      service: 'TrustLocate on Cloudflare Pages & Workers',
      platform: 'Cloudflare Edge',
      timestamp: Date.now()
    }),
    {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    }
  );
}
