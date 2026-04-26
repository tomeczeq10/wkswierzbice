/**
 * Lexical RichText (z Payload) → HTML string.
 *
 * Używamy oficjalnego serializera `convertLexicalToHTMLAsync` z `@payloadcms/richtext-lexical/html-async`.
 * Output wstrzykujemy w Astro przez `<Fragment set:html={...}>` w stronie pojedynczego newsa.
 *
 * Jeśli `body` jest puste/null (czyli Astro dostaje news z `body: { type: 'empty' }` po adapterze),
 * zwracamy pusty string — strona po prostu nie wyrenderuje sekcji treści.
 *
 * Konwerter ZWRACA TYLKO BEZPIECZNE NODY znane Payloadowi (paragraph, heading, list, link,
 * blockquote, etc.). Nie ma raw HTML ani <script> więc set:html jest OK.
 *
 * disableContainer=true — Payload domyślnie owija output w <div class="payload-richtext">,
 * a my chcemy renderować nago wewnątrz `<div class="prose-club">` z BaseLayout.
 */
import {
  convertLexicalToHTMLAsync,
  type ConvertLexicalToHTMLAsyncArgs,
} from '@payloadcms/richtext-lexical/html-async';
import type { LexicalBody } from './cms';

export async function lexicalToHtml(body: LexicalBody | null | undefined): Promise<string> {
  if (!body || !body.root) return '';

  const data = body as unknown as ConvertLexicalToHTMLAsyncArgs['data'];

  return await convertLexicalToHTMLAsync({
    data,
    disableContainer: true,
  });
}
