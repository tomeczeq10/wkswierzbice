import type { APIRoute } from 'astro'
import { fetchLiveMatch } from '@/lib/cms-live'

/** Publiczny JSON relacji — poza `/api/*`, bo Caddy kieruje `/api*` do Payload CMS. */
export const GET: APIRoute = async () => {
  const data = await fetchLiveMatch()
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  })
}
