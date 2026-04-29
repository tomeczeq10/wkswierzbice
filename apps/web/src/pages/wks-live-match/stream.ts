import type { APIRoute } from 'astro'

const CMS_INTERNAL_URL: string =
  process.env.CMS_INTERNAL_URL ||
  process.env.CMS_URL ||
  import.meta.env.CMS_INTERNAL_URL ||
  import.meta.env.CMS_URL ||
  'http://localhost:3000'

/**
 * Proxy SSE z CMS — ścieżka poza `/api/*` (Caddy → Astro), upstream pod `/api/...` na kontenerze CMS.
 */
export const GET: APIRoute = async ({ request }) => {
  const upstream = new URL('/api/live-match/stream', CMS_INTERNAL_URL)

  const res = await fetch(upstream.toString(), {
    headers: {
      cookie: request.headers.get('cookie') ?? '',
      accept: 'text/event-stream',
    },
  })

  if (!res.ok || !res.body) {
    return new Response('upstream error', {
      status: res.status || 502,
      headers: { 'cache-control': 'no-store' },
    })
  }

  return new Response(res.body, {
    status: 200,
    headers: {
      'content-type': 'text/event-stream; charset=utf-8',
      'cache-control': 'no-store, no-transform',
      connection: 'keep-alive',
    },
  })
}
