# CLAUDE.md — WKS Wierzbice

## # Zanim zaczniesz pracę

Ten plik to **stała referencja architektoniczna** (stos, konwencje, komponenty).
Jeśli wchodzisz w projekt po przerwie — najpierw zajrzyj do aktualnego stanu:

1. [`docs/STATE.md`](docs/STATE.md) — co jest zrobione, co jest demo, otwarte
   pytania, planowane kolejne kroki.
2. [`CHANGELOG.md`](CHANGELOG.md) — chronologiczny log ostatnich sesji.
3. Ten plik (`CLAUDE.md`) — jak jest zbudowana strona i jakich konwencji trzymać się przy edycji.

**Po każdej większej zmianie** (nowa funkcjonalność, import treści, zmiana
infrastruktury, decyzja architektoniczna, usunięcie zależności):

- Dopisz wpis do `CHANGELOG.md` (sekcja z dzisiejszą datą).
- Zaktualizuj `docs/STATE.md` jeśli zmienia się szerszy stan projektu (co gotowe,
  co jest demo, otwarte pytania, następne kroki).
- Jeśli zmieniła się architektura albo konwencja — zaktualizuj też ten plik.

Drobiazgi (literówki, kosmetyczne tweaki CSS, jednorazowe poprawki) dokumentacji
nie wymagają.

---

## # Kontekst

- Oficjalna strona klubu piłkarskiego **WKS Wierzbice** (Klasa okręgowa, Wrocław)
- Język zawartości: **polski (pl-PL)** — wszystkie teksty na stronie po polsku
- Dane klubu to źródło prawdy w `src/config/site.ts` — edycja jednego pliku aktualizuje całą stronę
- Sezon 2025/2026: WKS na 2. miejscu (wicelider), 50 pkt, 73:31 gole
- Dane meczowe pobierane ze **90minut.pl** do `src/data/season.json` przez `scripts/sync-90minut.mjs`
- Formularze (kontakt / nabory) nieaktywne — `FORMS.contactEndpoint` i `joinEndpoint` puste w `site.ts`
- Zdjęcia: aktualnie placeholder SVG; docelowe w `public/gallery/`, `public/team/`, `public/sponsors/`, `public/hero/`

---

## # Stos

- **Astro 5.18** — SSG, zero JS po stronie klienta (wyjątki poniżej)
- **Tailwind CSS 3.4** — `applyBaseStyles: false`, własna warstwa `@layer base/components`
- **TypeScript** — strict mode, aliasy `@/*` → `src/*`
- **@tailwindcss/typography** — klasa `.prose-club` dla artykułów Markdown
- **@astrojs/sitemap** — automatyczny sitemap z `SITE.url`
- **sharp** — wbudowany serwis obrazów Astro (`astro/assets/services/sharp`)
- **Fonty** (self-hosted przez `@fontsource`):
  - `Inter Variable` → `font-sans` (body)
  - `Barlow Condensed` (400/600/700) → `font-display` (nagłówki, przyciski, kicker)
- **Kolekcje treści** (`src/content/config.ts`):
  - `news` — artykuły, schemat Zod, pola: `title`, `date`, `excerpt`, `cover`, `tags`, `draft`, `facebookUrl`, `truncated`
  - `teams` — drużyny, schemat Zod, pola: `name`, `category`, `league`, `coach`, `roster[]`
- **Client-side JS** (vanilla, tylko tam gdzie konieczne):
  - `Header.astro` — toggle mobile menu
  - `Hero.astro` — autoplay karuzeli (5 s), prev/next, dots
  - `MatchCountdown.astro` — `setInterval` co 1 s, strefa czasowa `+02:00`
  - `index.astro` — `IntersectionObserver` + `requestAnimationFrame` dla count-up `.stat-number`
  - `galeria.astro` — lightbox modal (prev/next, klawiatura Escape/strzałki)

---

## # Zasady

### Kolory (CSS variables → Tailwind)
| Klasa Tailwind | CSS var | Wartość RGB | Zastosowanie |
|---|---|---|---|
| `brand-primary` | `--club-primary` | `22 101 52` | Zielony klubowy (green-800) |
| `brand-primary-dark` | `--club-primary-dark` | `12 65 33` | Hover zielony |
| `brand-secondary` | `--club-secondary` | `220 38 38` | Czerwony (red-600), CTA, akcent |
| `brand-ink` | `--club-ink` | `15 42 28` | Ciemne tło (header, sekcje) |
| `brand-paper` | `--club-paper` | `255 255 255` | Białe tło body |
| `brand-muted` | `--club-muted` | `100 116 139` | Tekst pomocniczy |

- Formaty zmiennych CSS: **trzy liczby oddzielone spacją** (bez `rgb()`), wymagane przez Tailwind do obsługi `/<alpha-value>` (np. `bg-brand-primary/80`)
- Nigdy nie używaj `backdrop-blur` na `bg-brand-ink/*` — powoduje białe tło gdy scroll=0; używaj pełnego `bg-brand-ink`

### Typografia
- `h1–h4` → automatycznie `font-display uppercase tracking-tight` (zdefiniowane w `@layer base`)
- Klasa `font-display` = Barlow Condensed — przyciski, kicker, sekcje statystyk
- Klasa `font-sans` = Inter Variable — body, opisy, meta
- Artykuły Markdown → zawsze owijaj w `<div class="prose-club">`

### Komponenty UI
- `.btn` / `.btn-primary` / `.btn-secondary` / `.btn-outline` — nie twórz własnych klas przycisków
- `.card` — biały bg, `border border-slate-200`, `shadow-sm hover:shadow-md`
- `.section` — `py-16 sm:py-20 lg:py-24` — standardowe odstępy sekcji
- `.section-title` — nagłówek sekcji h2
- `.section-kicker` — etykieta nad tytułem (uppercase, `tracking-[0.25em]`, brand-primary)
- `.section-angle-bottom` — skośny biały separator na końcu ciemnej sekcji (`clip-path: polygon`)
- `.stat-number` — liczba z animacją count-up; aktywuje się przez `IntersectionObserver` po wejściu w widok

### Layouty i strony
- Każda strona owijana przez `<BaseLayout title="..." description="...">` (`src/layouts/BaseLayout.astro`)
  - Props: `title`, `description`, `image` (OG), `noIndex`
  - Tytuł strony: `${title} | WKS Wierzbice`
- Strony wewnętrzne (nie home) zaczynają się od `<PageHeader kicker="..." title="..." description="..." />`
- `trailingSlash: "ignore"` — nie dodawaj ręcznie ukośników na końcu href
- `build.format: "directory"` — URL `/aktualnosci/` generuje `aktualnosci/index.html`

### Dane i konfiguracja
- **`src/config/site.ts`** — jedyne miejsce na dane klubu: `SITE`, `CONTACT`, `SOCIAL`, `NAV`, `STAFF`, `BOARD`, `SPONSORS`, `HERO_SLIDES`, `GALLERY`, `FORMS`, `HIGHLIGHTS`, `STATS`
- **`src/data/season.json`** — dane sezonu (tabela, mecze); nie edytuj ręcznie — generowane przez `sync:season`
- **`src/lib/format.ts`** — funkcje do dat: `formatDate()`, `formatDateShort()`, `formatTime()` — używaj zamiast ręcznego formatowania
- Daty meczów: konstruuj jako `new Date(\`${dateStr}T${time}:00+02:00\`)` (strefa PL letnia)

### Kolekcje treści (Markdown)
**News (`src/content/news/*.md`) — wymagane pola frontmatter:**
```yaml
title: ""
date: YYYY-MM-DD
excerpt: ""          # 1-2 zdania, widoczne w kartach
cover: "/gallery/placeholder-X.svg"
coverAlt: ""
tags: []             # dostępne: wyniki, mecz, transfery, aktualności, nabory, akademia, puchar
draft: false
# opcjonalne:
facebookUrl: "https://..."
truncated: false     # true = artykuł urwany, link do FB
```

**Teams (`src/content/teams/*.md`) — wymagane pola frontmatter:**
```yaml
name: ""
category: seniorzy | rezerwy | juniorzy | trampkarze | orlik | zak | skrzat | kobiety | inna
coach: ""
order: 0             # kolejność na liście drużyn
# opcjonalne:
league: ""
assistantCoach: ""
trainingSchedule: ""
photo: ""
roster:
  - name: ""
    number: 0
    position: ""
```

### Grupowanie zawodników (roster)
- Logika w `druzyny/[slug].astro` — dopasowanie na podstawie `position.toLowerCase()`:
  - `includes("bramkarz")` → Bramkarze (amber)
  - `includes("obro")` → Obrońcy (blue)
  - `includes("pomocnik") || includes("rozgr") || includes("skrzy")` → Pomocnicy (green)
  - `includes("napastnik")` → Napastnicy (red)
  - pozostałe → Inni (slate)

### Nawigacja
- `NAV` w `site.ts` — lista obiektów `{ label, href }`; kolejność = kolejność w menu
- Aktywny link: `pathname === href || pathname.startsWith(href + "/")` — nie zmieniaj tej logiki
- "Zapisz dziecko" CTA w headerze i footerze → `/nabory`

### SEO
- `BaseLayout` zawiera JSON-LD `SportsOrganization` (w `<head>`) — dane z `site.ts`
- Canonical URL generowany automatycznie z `Astro.url.pathname` + `Astro.site`
- OG Image domyślny: `/og-default.svg`; nadpisz przez prop `image` w `<BaseLayout>`
- `noIndex: true` — użyj dla stron roboczych / polityki prywatności (draft)

### Dostępność
- Skip link `#main` w `BaseLayout` — nie usuwaj
- ARIA: `aria-label` na nawigacjach, `aria-current="page"` na aktywnym linku, `aria-expanded` na burgerze
- Lightbox w galerii obsługuje klawiaturę (Escape, strzałki)

---

## # Komendy

```bash
# Lokalny serwer deweloperski (http://localhost:4321)
npm run dev

# Synchronizacja danych sezonu z 90minut.pl → src/data/season.json
npm run sync:season

# Build produkcyjny (sync:season uruchamia się automatycznie jako prebuild)
npm run build

# Podgląd buildu produkcyjnego
npm run preview
```

### Dodawanie nowego artykułu
1. Stwórz `src/content/news/<slug>.md` z wymaganym frontmatterem
2. `draft: false` żeby był widoczny
3. Slug = nazwa pliku bez `.md` = URL (`/aktualnosci/<slug>`)
4. Artykuł pojawi się automatycznie na `/aktualnosci` i — jeśli najnowszy — na stronie głównej

### Dodawanie / edycja drużyny
1. Plik w `src/content/teams/<slug>.md`
2. `order` określa kolejność na `/druzyny`
3. Roster aktualizuj bezpośrednio w YAML frontmatter

### Aktualizacja danych klubu
- Trenerzy, zarząd, sponsorzy, kontakt → `src/config/site.ts`
- Slajdy hero → `HERO_SLIDES[]` w `site.ts`
- Galeria → `GALLERY[]` w `site.ts` + plik w `public/gallery/`
- Sponsorzy → `SPONSORS[]` w `site.ts` + logo w `public/sponsors/`

### Aktywacja formularzy
1. Zarejestruj endpoint w [Web3Forms](https://web3forms.com/) lub Formspree
2. Wklej klucz do `src/config/site.ts`:
   ```typescript
   export const FORMS = {
     contactEndpoint: "https://api.web3forms.com/submit",
     joinEndpoint: "https://api.web3forms.com/submit",
   };
   ```
3. Formularz automatycznie przestanie pokazywać komunikat "nieaktywny"

### Dodawanie zdjęć
| Typ | Katalog | Referencja w kodzie |
|---|---|---|
| Hero karuzela | `public/hero/` | `HERO_SLIDES[].image` w `site.ts` |
| Galeria | `public/gallery/` | `GALLERY[].src` w `site.ts` |
| Zdjęcie drużyny | `public/gallery/` | `photo:` w frontmatter teams |
| Zdjęcie trenera / zarządu | `public/team/trenerzy/` lub `public/team/zarzad/` | `photo:` w `STAFF[]` / `BOARD[]` w `site.ts` |
| Logo sponsora | `public/sponsors/` | `logo:` w `SPONSORS[]` w `site.ts` |
