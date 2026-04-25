/**
 * Konwertuje tekst (np. tytuł newsa) na URL-friendly slug.
 *
 * Przykłady:
 *   "Zwycięska seria trwa! 🫡"        → "zwycieska-seria-trwa"
 *   "WKS Wierzbice 2:0 Orzeł Marszowice" → "wks-wierzbice-2-0-orzel-marszowice"
 *   "Życzenia świąteczne"             → "zyczenia-swiateczne"
 *
 * Implementacja zero-dep:
 * 1. NFD (decomposed unicode) — rozdziela znaki z akcentami na bazowy znak +
 *    combining mark (np. é → e + ́), potem usuwamy combining marks.
 * 2. Specjalne mapowanie dla `ł` / `Ł` — Unicode NFD ich nie rozkłada.
 * 3. Wszystko poza [a-z0-9] zamieniamy na pojedynczy myślnik.
 * 4. Usuwamy myślniki z brzegów + ograniczamy długość do 100 znaków
 *    (limit kompatybilny z większością CMS-ów / SEO).
 */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ł/g, 'l')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 100)
}
