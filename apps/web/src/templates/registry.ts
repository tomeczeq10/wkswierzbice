/**
 * Rejestr dostępnych szablonów (template'ów) wyglądu strony.
 *
 * Cały folder `src/templates/` jest opcjonalny — żeby usunąć system szablonów,
 * wystarczy:
 *   1. Usunąć ten folder
 *   2. Usunąć dwa importy w `src/layouts/BaseLayout.astro` (init + switcher)
 *   3. Z `src/pages/index.astro` usunąć drugi wariant w bloku `data-template-only="marka"`
 *
 * Default template = `klasyk`. Wybór użytkownika trzymamy w localStorage
 * pod kluczem `wks-template`.
 */
export type TemplateId = "klasyk" | "marka" | "magazyn" | "stadion";

export interface TemplateDefinition {
  id: TemplateId;
  name: string;
  short: string;
  description: string;
  /** Kolor akcentu w switcherze. */
  swatch: string;
}

export const TEMPLATES: TemplateDefinition[] = [
  {
    id: "klasyk",
    name: "Klasyczny WKS",
    short: "Klasyk",
    description:
      "Hero z herbem i karuzelą haseł, pasek wyników, sekcje O klubie / Statystyki / Aktualności / Sponsorzy. Bezpieczny, klasyczny układ klubowy.",
    swatch: "#166534",
  },
  {
    id: "marka",
    name: "Marka klubowa",
    short: "Marka",
    description:
      "Wielki hero z najbliższym meczem (countdown + ostatni wynik + miejsce w tabeli), pasek „Dlaczego WKS”, kafle wszystkich drużyn na stronie głównej. Bardziej brandowo i dynamicznie.",
    swatch: "#dc2626",
  },
  {
    id: "magazyn",
    name: "Magazyn klubowy",
    short: "Magazyn",
    description:
      "Inspiracja: legia.com. Najnowsza aktualność jako duży „featured” na hero, asymetryczny grid wiadomości (1 duży + 4 małe), redakcyjna typografia. Klub jako medium — codzienna lektura kibica.",
    swatch: "#0f172a",
  },
  {
    id: "stadion",
    name: "Stadion",
    short: "Stadion",
    description:
      "Inspiracja: lechpoznan.pl + wislakrakow.com. Czysty, jasny układ z paskiem najbliższych meczów, kompaktową tabelą ligi i statystykami. Mniej dekoracji, więcej danych — „matchday widget” na froncie.",
    swatch: "#16a34a",
  },
];

export const DEFAULT_TEMPLATE: TemplateId = "klasyk";
export const TEMPLATE_STORAGE_KEY = "wks-template";
