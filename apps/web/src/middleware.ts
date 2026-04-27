import type { MiddlewareHandler } from 'astro'

/**
 * Bez tego Cloudflare / przeglądarka mogą trzymać HTML strony mimo SSR —
 * po edycji w CMS widać „stare” dane do czasu wygaszenia cache.
 */
export const onRequest: MiddlewareHandler = async (_context, next) => {
  const response = await next()
  const ct = response.headers.get('content-type') ?? ''
  if (ct.includes('text/html')) {
    response.headers.set('Cache-Control', 'private, no-store, max-age=0, must-revalidate')
    response.headers.set('Pragma', 'no-cache')
  }
  return response
}
