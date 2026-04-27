/**
 * Skróty z importu FB często = tytuł + treść — na liście i pod nagłówkiem wygodniej bez powtórzenia.
 */
export function stripLeadingTitleFromExcerpt(title: string, excerpt: string): string {
  const normTitle = title.trim().replace(/\s+/g, ' ');
  const original = excerpt.trim();
  let body = original;
  if (normTitle.length < 8 || body.length <= normTitle.length) return original;
  if (body.toLowerCase().startsWith(normTitle.toLowerCase())) {
    body = body.slice(normTitle.length).replace(/^[\s.:;–—\-!🦬⚽️]+/u, '').trim();
  }
  return body.length >= 24 ? body : original;
}
