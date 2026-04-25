# WKS Wierzbice – oficjalna strona klubu

Statyczna strona internetowa klubu piłkarskiego **WKS Wierzbice** (Klasa okręgowa,
grupa Wrocław) zbudowana w **Astro 5 + Tailwind CSS 3**. Wszystkie dane drużyny
edytowalne są w kilku plikach tekstowych – po każdej zmianie robimy build i wrzucamy
katalog `dist/` na hosting **tmielczarek.pl**.

- **Produkcja:** https://wkswierzbice.pl (hostowane na serwerze `tmielczarek.pl`)
- **Źródła danych:** fanpage FB klubu, 90minut.pl, materiały redakcji
- **Status:** wersja demo / MVP – część danych (niektóre składy drużyn
  młodzieżowych, logotypy sponsorów) to **dane przykładowe do podmiany**, szczegóły
  w sekcji [„Demo vs. dane realne"](#demo-vs-dane-realne)
- **Wersja 2 (z panelem administratora) – w planowaniu:** dodanie logowania,
  zarządzania użytkownikami z uprawnieniami oraz CRUD-a aktualności / drużyn /
  galerii + przycisku „odśwież" do danych z 90minut.pl. Plan i otwarte decyzje
  techniczne: [`docs/ADMIN-PANEL.md`](docs/ADMIN-PANEL.md).

---

## Stos technologiczny

| Warstwa | Technologia | Gdzie żyje |
|---|---|---|
| Framework | Astro 5.18 (SSG, zero JS po stronie klienta poza wyjątkami) | `astro.config.mjs` |
| Style | Tailwind CSS 3.4 + `@tailwindcss/typography` | `tailwind.config.mjs`, `src/styles/global.css` |
| Język | TypeScript (strict), ścieżki `@/*` → `src/*` | `tsconfig.json` |
| Treść | Astro Content Collections (Markdown + Zod) | `src/content/news/`, `src/content/teams/` |
| Fonty (self-hosted) | Inter Variable + Barlow Condensed przez `@fontsource` | `src/styles/global.css` |
| SEO | `@astrojs/sitemap`, OG tagi, JSON-LD `SportsOrganization` | `src/layouts/BaseLayout.astro` |
| Obrazy | `sharp` (wbudowany serwis Astro) | – |
| Dane meczowe | Scrap z 90minut.pl → JSON → strona `/terminarz` | `scripts/sync-90minut.mjs`, `src/data/season.json` |

Szczegółowy przewodnik architektoniczny (kolory, typografia, komponenty UI,
konwencje) znajduje się w pliku [`CLAUDE.md`](CLAUDE.md).

---

## Szybki start

```bash
npm install
npm run dev      # http://localhost:4321
```

Pierwsze `npm run dev` odpali też sync z 90minut.pl (trwa ~10 s, wymaga internetu).
Jeśli nie ma dostępu do sieci, skrypt przerwie – i tak działa w reżimie best-effort.

---

## Komendy npm

```bash
# lokalny serwer deweloperski
npm run dev

# ręczna synchronizacja danych sezonu (terminarz + tabela) z 90minut.pl
npm run sync:season

# build produkcyjny do katalogu dist/
# (sync:season uruchamia się automatycznie jako prebuild)
npm run build

# podgląd builda produkcyjnego
npm run preview
```

---

## Struktura projektu

```text
src/
├── components/        komponenty UI (Header, Footer, Hero, NewsCard, MatchCountdown…)
├── config/
│   └── site.ts        ← centralna konfiguracja klubu (kontakt, zarząd, sponsorzy…)
├── content/
│   ├── news/          aktualności jako pliki Markdown
│   ├── teams/         drużyny + składy w Markdown
│   └── config.ts      schematy Zod dla obu kolekcji
├── data/
│   └── season.json    (generowane automatycznie przez sync:season – nie edytuj)
├── layouts/
│   └── BaseLayout.astro   SEO, OG, Header, Footer
├── lib/
│   └── format.ts      helpery: formatDate, formatTime, formatDateShort
├── pages/             każdy plik = jedna podstrona
└── styles/
    └── global.css     zmienne CSS, warstwa base/components

public/
├── herb-wks.jpg       herb klubu (logo)
├── favicon.png
├── og-default.svg     domyślny obrazek Open Graph
├── gallery/           zdjęcia do galerii
├── hero/              zdjęcia karuzeli na stronie głównej
├── news/              okładki aktualności (dobierane automatycznie po nazwie slug)
├── sponsors/          logotypy sponsorów
└── team/
    ├── trenerzy/      zdjęcia sztabu szkoleniowego
    └── zarzad/        zdjęcia zarządu klubu

scripts/
├── sync-90minut.mjs         ← scrap 90minut.pl → src/data/season.json
├── generate-news.mjs        (jednorazowy) wygenerowanie wpisów z fanpage FB
├── fetch-fb-meta.mjs        (jednorazowy) pobranie metadanych OG
└── apply-news-covers.mjs    (pomocniczy) podmiana okładek po uzupełnieniu public/news/

CLAUDE.md              pełny przewodnik architektoniczny
README.md              ten plik
```

---

## Gdzie są jakie dane

Cały klub opisany jest w dwóch miejscach:

### 1) `src/config/site.ts` – jedno źródło prawdy

Zmień wartość, zbuduj, zredeployuj – strona się zaktualizuje. Znajdziesz tam:

| Sekcja | Zawartość |
|---|---|
| `SITE` | nazwa, shortName (tytuł karty przeglądarki), tagline, URL, rok założenia, liga, miasto |
| `CONTACT` | telefon, email, adres stadionu, adres biura, Google Maps |
| `SOCIAL` | linki do FB/IG/YT/TikTok, liczba obserwujących |
| `STATS` | linki do profilu na 90minut.pl, regiowyniki, dolfutbol, transfermarkt |
| `NAV` | menu główne (kolejność = kolejność w navbarze) |
| `STAFF` | sztab szkoleniowy pierwszej drużyny (imię, rola, bio, zdjęcie) |
| `BOARD` | zarząd klubu (6 osób, zdjęcia) |
| `HIGHLIGHTS` | liczby na stronie głównej – pozycja w lidze, król strzelców, historyczny awans |
| `SPONSORS` | partnerzy + logotypy + tier (strategiczny/główny/wspierający) |
| `HERO_SLIDES` | karuzela na stronie głównej |
| `GALLERY` | zdjęcia do podstrony `/galeria` |
| `FORMS` | endpointy formularzy (nieaktywne – pusty string = formularz wyświetla komunikat) |

### 2) Content Collections (Markdown)

**Aktualności** (`src/content/news/*.md`) – jedna aktualność = jeden plik,
nazwa pliku bez `.md` staje się slugiem URL. Schemat:

```yaml
---
title: "Tytuł artykułu"
date: "2026-04-20T12:00:00+02:00"
excerpt: "1–2 zdania widoczne w karcie aktualności"
cover: "/news/slug-artykulu.jpg"        # opcjonalne
coverAlt: "Opis zdjęcia dla SEO"
tags: [wynik, seniorzy]                 # dostępne: wynik, zapowiedź, zawodnik meczu,
                                        # seniorzy, juniorzy, trampkarze, orliki,
                                        # żaki, młodzież, turniej, klub, kibice
author: "Redakcja klubu"
draft: false                            # true = ukryty
facebookUrl: "https://..."              # opcjonalny link do oryginalnego posta FB
truncated: false                        # true = artykuł urwany, pokazujemy CTA do FB
---

Treść artykułu w Markdown.
```

**Drużyny** (`src/content/teams/*.md`) – jedna drużyna = jeden plik. Schemat:

```yaml
---
name: "Seniorzy"
category: "seniorzy"                    # enum: seniorzy | rezerwy | juniorzy |
                                        # trampkarze | orlik | zak | skrzat |
                                        # kobiety | inna
league: "Klasa okręgowa 2025/2026"
coach: "Imię Nazwisko"
assistantCoach: "Imię Nazwisko"         # opcjonalne
trainingSchedule: "wtorek, czwartek…"   # opcjonalne
photo: "/gallery/team-photo.jpg"        # opcjonalne
order: 10                               # kolejność na liście drużyn (malejąco)
roster:
  - name: "Imię Nazwisko"
    number: 9
    position: "Napastnik"
---

Tekst opisowy drużyny w Markdown.
```

Grupowanie zawodników po pozycji (Bramkarze / Obrońcy / Pomocnicy / Napastnicy)
dzieje się automatycznie na podstawie wartości `position` – szczegóły w `CLAUDE.md`.

### 3) Dane meczowe (generowane)

`src/data/season.json` jest **w całości generowany** przez `scripts/sync-90minut.mjs`
na podstawie publicznych danych z 90minut.pl. Zawiera terminarz WKS, tabelę ligi,
ostatnie osiągnięcia. Używany przez `/terminarz` i stronę główną. **Nie edytuj ręcznie.**

Odświeżenie:

```bash
npm run sync:season
```

---

## Dodawanie aktualności

1. Stwórz `src/content/news/nowy-slug.md`.
2. Wklej szablon frontmattera (patrz wyżej).
3. Jeśli masz zdjęcie – wrzuć je do `public/news/nowy-slug.jpg` (lub `.png` / `.jpeg` / `.webp`)
   i ustaw `cover: /news/nowy-slug.jpg`.
4. `npm run dev` – sprawdź pod `http://localhost:4321/aktualnosci/nowy-slug`.
5. `npm run build` → wgraj `dist/` na hosting.

Najnowsza aktualność trafia automatycznie na stronę główną.

---

## Deploy na hosting (tmielczarek.pl)

Strona jest czysto statyczna – `dist/` po buildzie można wrzucić na dowolny
hosting obsługujący HTML (FTP, SFTP, panel administracyjny).

### Cykl „zmiana → produkcja"

```bash
# z Maca, w katalogu projektu
npm run build
ssh root@192.168.0.5 'rm -rf /srv/wks/dist/*'
scp -r dist/. root@192.168.0.5:/srv/wks/dist/
```

`npm run build` automatycznie odświeży dane z 90minut.pl (prebuild hook).
Serwer (`192.168.0.5`) serwuje pliki statyczne z katalogu `/srv/wks/dist/`.

Hosting `tmielczarek.pl` zapewnia HTTPS (Let's Encrypt) oraz obsługę domeny
`wkswierzbice.pl`. Żadna konfiguracja nginx / apache po naszej stronie nie jest
potrzebna – hosting serwuje pliki statyczne z katalogu domeny.

---

## Demo vs. dane realne

Na potrzeby prezentacji część danych została **wypełniona losowo / placeholderowo**.
Przed docelowym przekazaniem stronie prezesowi / redakcji klubu trzeba podmienić:

| Co | Gdzie | Stan |
|---|---|---|
| Składy drużyn młodzieżowych | `src/content/teams/{juniorzy,trampkarze,orliki,zaki}.md` | **Losowe imiona i nazwiska** (22 osoby każda drużyna) |
| Trenerzy drużyn młodzieżowych | j.w. (`coach`, `assistantCoach`) | **Losowe nazwiska** |
| Sponsorzy | `SPONSORS` w `src/config/site.ts` | Gmina Kobierzyce – prawdziwa; pozostałe 5 – **nazwy przykładowe** |
| Logotypy sponsorów | `public/sponsors/placeholder-*.svg` | Placeholdery SVG |
| Zdjęcia hero (karuzela) | `public/hero/placeholder-hero.svg` | Placeholder |
| Galeria | `public/gallery/placeholder-*.svg` | Placeholdery |
| Skład seniorów | `src/content/teams/seniorzy.md` | **Prawdziwe dane** (źródło: 90minut.pl, transfermarkt, fanpage) |
| Zarząd + sztab szkoleniowy | `BOARD`, `STAFF` w `site.ts` + `public/team/` | **Prawdziwe dane + zdjęcia** |
| Kontakt, adres, media społecznościowe | `CONTACT`, `SOCIAL` w `site.ts` | **Prawdziwe dane** |
| Aktualności (24 wpisy) | `src/content/news/*.md` | **Prawdziwe** (zaciągnięte z fanpage FB klubu) |
| Dane meczowe (terminarz, tabela) | `src/data/season.json` | **Prawdziwe** (automatyczny scrap 90minut.pl) |

---

## Formularze kontaktowe i nabory

Strony `/kontakt` i `/nabory` mają gotowe formularze, ale bez aktywnego backendu –
aktualnie wyświetlają komunikat informacyjny. Aby je aktywować:

1. Zarejestruj endpoint w [Web3Forms](https://web3forms.com) lub [Formspree](https://formspree.io).
2. W `src/config/site.ts` uzupełnij:

   ```ts
   export const FORMS = {
     contactEndpoint: "https://api.web3forms.com/submit",
     joinEndpoint: "https://api.web3forms.com/submit",
   };
   ```

3. `npm run build` + deploy.

---

## Roadmapa (następne kroki)

Aktualna forma wymaga edycji plików w repo i manualnego builda + deployu.
**2026-04-25** zapadła decyzja kierunkowa: rozszerzamy projekt o **panel
administratora** (Wariant 2 z [`docs/OFERTA.md`](docs/OFERTA.md)). Pełen plan,
encje, model uprawnień i otwarte decyzje techniczne w
[`docs/ADMIN-PANEL.md`](docs/ADMIN-PANEL.md).

Z poziomu panelu admin (po wdrożeniu):

- loguje się przez przeglądarkę,
- dodaje użytkowników i nadaje im poszczególne uprawnienia,
- dodaje / edytuje / usuwa **aktualności**, **drużyny** + składy zawodników,
  **galerię zdjęć**,
- klika „odśwież teraz" dla danych meczowych (`sync-90minut.mjs`) — plus
  cron raz dziennie automatycznie.

**Otwarte decyzje techniczne (blokery):** wybór stacku (kandydaci: Payload
CMS 3 / Astro SSR + custom / Directus / Supabase + mini-panel / Laravel +
Filament), struktura repo, model RBAC. Bez rozstrzygnięcia tych decyzji nie
ruszamy kodu — szczegóły w D1–D10 w `ADMIN-PANEL.md`.

Do czasu wdrożenia panelu: workflow „edycja plików → build → FTP" pozostaje
aktualny dla obecnej strony statycznej.

---

## Licencja

Projekt przygotowany indywidualnie dla **WKS Wierzbice**. Treści (zdjęcia, teksty,
herb, barwy) chronione prawem autorskim klubu.
