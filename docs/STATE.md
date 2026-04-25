# Stan projektu WKS Wierzbice

> Snapshot bieżącego stanu projektu — aktualizuj po każdej większej sesji.
> Kiedyś "zatnie się" Claude / nowy rozmówca przychodzi bez kontekstu — to
> pierwszy plik, do którego ma zajrzeć.
>
> **Ostatnia aktualizacja:** 2026-04-25 (Etap 3 DONE — kolekcje News + Tags z relacją, slugify PL, Lexical body, walidacje PL, full CRUD przez API)

## Produkcja

- **URL:** https://wkswierzbice.pl
- **Hosting:** serwer domowy Tomka (domena tmielczarek.pl wskazuje na niego)
  — rozwiązanie tymczasowe. Jeśli klub kupi stronę, przejmie hosting/VPS.
- **Deploy:** ręczny — `npm run build` → rsync/SFTP z `dist/` do katalogu domeny
- **Dane meczowe:** odświeżane ręcznie przy buildzie (prebuild hook odpala
  `sync:season` z 90minut.pl)

## Stos

Astro 5.18 + Tailwind 3.4 + TypeScript strict. Zero JS po stronie klienta poza:
Header (mobile menu), Hero (karuzela), MatchCountdown (live timer), index.astro
(count-up animacja), galeria (lightbox). Pełny opis architektury: [`CLAUDE.md`](../CLAUDE.md).

## System szablonów (templates)

Strona ma **przełącznik 4 szat graficznych** (floating widget w prawym dolnym
rogu, stan trzymany w `localStorage.wks-template`):

- **klasyk** (default) — oryginalny layout, identyczny z produkcją
  `wkswierzbice.tmielczarek.pl`. Nietknięty.
- **marka** — wow-hero 100vh z gigantyczną typografią „WIERZBICE", animowane
  orby w tle, marquee ticker, sekcja „Klub który łączy pokolenia". Inspiracja:
  Wisła Kraków + Lech Poznań.
- **magazyn** — pełny dark mode (czarne body), featured news jako hero,
  sidebar „Top stories" z numerami, drop-cap przy artykułach, sticky compact
  match bar na home. Inspiracja: Legia.com.
- **stadion** — sticky LED scoreboard u góry, auto-scrolling marquee z meczami,
  hero z herbem i statystykami, split layout z sticky tabelą ligi po prawej.
  Inspiracja: Lech Poznań + Wisła Kraków.

Implementacja:
- `src/templates/registry.ts` — lista templates
- `src/templates/init.astro` — inline script w `<head>` (no-FOUC)
- `src/templates/TemplateSwitcher.astro` — floating widget
- `src/styles/global.css` linie 100+ — keyframes, hiding 4×4, per-template CSS
- `src/pages/index.astro` — 4 bloki `<div data-template-only="...">`
- `src/components/home/MagazineHome.astro` + `StadionHome.astro` — pełne layouty
  home dla 2 cięższych szablonów
- `src/components/MatchHero.astro` + `MarkaTicker.astro` + `WhyUs.astro` —
  komponenty dla szablonu marka

**Łatwa deinstalacja całego systemu** opisana na końcu
[`docs/REVIEW-2026-04-20.md`](REVIEW-2026-04-20.md).

## Co jest zrobione

### Strony
- `/` — home z karuzelą, aktualnościami, countdown najbliższego meczu,
  statystykami drużyny, highlights
- `/o-klubie` — historia, zarząd (z `BOARD`), sztab (z `STAFF`), timeline
- `/druzyny` + `/druzyny/[slug]` — lista i profile 5 drużyn
- `/terminarz` — dynamiczny, napędzany `src/data/season.json`
- `/aktualnosci` + `/aktualnosci/[slug]` — 24 artykuły z FB
- `/galeria` — lightbox (placeholdery SVG)
- `/kontakt`, `/nabory` — formularze (nieaktywne, `FORMS.*` puste)
- `/sponsorzy`, `/polityka-prywatnosci`, `/404`

### Treść (kolekcje Markdown)
- **News (24):** pobrane z fanpage FB klubu. 8 pełnych + 16 skróconych z CTA do FB.
- **Teams (5):** Seniorzy (realny skład 22), Juniorzy / Trampkarze / Orliki / Żaki
  (po 22 losowych zawodników, trenerzy losowi).

### Dane realne w `src/config/site.ts`
- `SITE`, `CONTACT`, `SOCIAL`, `STATS`, `NAV` — realne
- `STAFF` (Pożarycki + Rycombel) — realny + zdjęcia
- `BOARD` (6 osób) — realny + zdjęcia
- `HIGHLIGHTS` — realne (2. miejsce, 50 pkt, 73 gole, Alefe Lima 43)
- `SPONSORS` — tylko Gmina Kobierzyce realna, reszta demo
- `HERO_SLIDES`, `GALLERY` — placeholdery SVG

## Wariant 2 / Panel admina (CMS) — w planowaniu

> **Status:** decyzje fundamentalne podjęte, gotowi do startu Etapu 1.
> Operacyjny plan etapów: [`PAYLOAD-ROADMAP.md`](PAYLOAD-ROADMAP.md).
> Pełen kontekst encji/RBAC: [`ADMIN-PANEL.md`](ADMIN-PANEL.md).
> Porównanie stacków (uzasadnienie wyboru): [`STACK-COMPARISON.md`](STACK-COMPARISON.md).
> Kontekst ekonomiczny i scope: [`OFERTA.md`](OFERTA.md) Q5–Q11.

**Decyzje fundamentalne RESOLVED 2026-04-25:**
- **Stack (D1):** **Payload CMS 3** (TypeScript, MIT, Next.js 15-based).
- **Repo (D2):** **Monorepo** — `apps/web` (obecny Astro frontend) +
  `apps/cms` (Payload+Next.js) + `packages/shared` (typy generowane).
- **Scope (D9):** **Pełen** — wszystkie 12 grup encji edytowalne z panelu.

**Postęp implementacji (PAYLOAD-ROADMAP):**
- ✅ **Etap 1 (2026-04-25)** — restrukturyzacja monorepo zakończona.
  Projekt na npm workspaces, `apps/web/` zawiera całe dotychczasowe Astro
  (dev/build/sync działają tak samo jak wcześniej, tylko z prefiksem
  `--workspace=web`). Git zinicjalizowany (commit baseline + commit
  restrukturyzacji). Node 20.18.0 LTS w `.nvmrc`.
- ✅ **Etap 2 (2026-04-25)** — Payload CMS zainstalowany w `apps/cms/`.
  Stack: Payload 3.84.1 + Next.js 16.2.3 + React 19.2.4 + `@payloadcms/db-sqlite`.
  Dev server startuje na `http://localhost:3000` w 268ms (Turbopack), `/admin`
  zwraca formularz "Create First User" (HTTP 200). Pierwszy admin utworzony
  przez API: `admin@wks-wierzbice.pl` / `WKSadmin2026!` (TYLKO DEV — w Etapie 17
  zmieniamy na właściwe credentials produkcyjne). Login zwraca JWT token,
  sesja zapisywana w `apps/cms/cms.db`. Frontend Astro nietknięty: build
  40 stron w 1.58s. Sekret 32 random bytes hex w `apps/cms/.env` (gitignored).
- ✅ **Etap 3 (2026-04-25)** — kolekcje `News` + `Tags` w Payload.
  Schema News 1:1 z Zod (`apps/web/src/content/config.ts`) + 2 nowe pola: `slug`
  (auto z `title` przez `slugify` obsługujący polskie znaki, możliwy ręczny
  override) i `body` (Lexical RichText, w Astro było to wszystko po `---`).
  **Tags jako osobna kolekcja** z relacją hasMany (decyzja: redaktor sam dodaje
  nowy tag bez czekania na admina/push do gita) zamiast initially planowanego
  `select hasMany` z hardcoded opcjami. Custom validator `facebookUrl` z polskimi
  komunikatami błędów. Polskie etykiety (`labels.pl`, `label.pl`) — przygotowanie
  pod Etap 21 (i18n). Pola pogrupowane przez `admin.position: 'sidebar'` dla
  lepszego UX. Test: 16/16 zaliczonych przez REST API (CRUD News, CRUD Tags,
  filter `where[draft][equals]`, depth=2 populate relacji, walidacje, polskie
  znaki w slugach: `zwycięstwo` → `zwyciestwo`). Wygenerowane typy TS w
  `apps/cms/src/payload-types.ts` (454 linie). Pułapka: Payload push mode w SQLite
  rzucał `SQLITE_ERROR: index already exists` po dodaniu collections — fix przez
  clean slate dev DB (w Etapie 17 przejdziemy na proper migrations drizzle-kit).
- ⏳ **Etapy 4–18** — nie rozpoczęte. Następny: Etap 4 (Astro odpytuje Payload
  REST API — zamiast `getCollection('news')` z plików .md → fetch z
  `${PAYLOAD_URL}/api/news?where[draft][equals]=false&sort=-date`).

**Plan implementacji rozbity na 18 etapów (Faza A–F):**
[`PAYLOAD-ROADMAP.md`](PAYLOAD-ROADMAP.md). Każdy etap = 2–6 h pracy + jeden
test-case do sprawdzenia lokalnie. Łączna estymata 60–80 h.

**Pozostałe decyzje rozstrzygane per etap:**
- **D7 RBAC** — w Etapie 16 (default: Wariant A — admin/redaktor/trener).
- **D8 galeria** — w Etapie 9 (default: Wariant 1 płaska lista).
- **D5 auth** — w Etapie 2 (default: email + password Payload built-in).
- **D4 baza** — w Etapach 2 + 17 (SQLite dev → Postgres prod).
- **D3 hosting** — w Etapie 17 (wstępnie: Hetzner CX22).
- **D6 backup** — w Etapie 18 (wstępnie: pg_dump cron + Backblaze B2, retention 30 dni).
- **D10 migracja MD→DB** — w Etapach 5, 8, 10, 11 (skrypty seed Payload Local API).

## Co jest demo (do podmiany przed przekazaniem klubowi)

Szczegółowa tabela: sekcja „Demo vs. dane realne" w [`README.md`](../README.md).

Skrótowo:
- [ ] Składy drużyn młodzieżowych (88 losowych imion rozrzuconych po 4 drużynach)
- [ ] Trenerzy drużyn młodzieżowych (8 losowych nazwisk)
- [ ] 5 z 6 sponsorów (nazwy wymyślone, Gmina Kobierzyce prawdziwa)
- [ ] Logotypy wszystkich sponsorów (placeholdery SVG)
- [ ] Zdjęcia hero (karuzela na `/`)
- [ ] Zdjęcia galerii
- [ ] Zdjęcia drużyn (`photo:` w teams/*.md → placeholder SVG)

## Znane problemy do dokończenia (po review 2026-04-20)

Pełna lista + estymaty + plan kolejności w
[`docs/REVIEW-2026-04-20.md`](REVIEW-2026-04-20.md). W skrócie:

**🔴 Krytyczne — zrobić przed pokazaniem zarządowi (~1–2h):**
1. Header (i footer) nie reaguje na dark mode szablonu **magazyn** —
   wygląda jak dwa różne projekty sklejone razem. Fix w `global.css`.
2. `/o-klubie` ma losowe nazwiska zarządu/trenerów zamiast realnych
   — zdjęcia w `public/team/zarzad/` + `public/team/trenerzy/` są realne
   (z FB klubu) i czekają nieużywane. Wrócić do prawdziwych nazwisk
   w `BOARD`/`STAFF` w `src/config/site.ts`.
3. **Stadion**: niespójność pozycji `1.` (sticky LED) vs `2.` (hero, tabela)
   — sprawdzić w `StadionHome.astro`.

**🟠 Ważne — polerka (~1–2h):**
4. **Marka**: countdown card znika na średnich ekranach (`hidden lg:block`).
5. Magazyn: numery `01..05` w sidebarze ledwo widać (`text-white/15` → `/30`).
6. Magazyn: emoji ⚽ przy excerpt → realny SVG.
7. Stadion: 3 statystyki w hero zawijają się brzydko na md.
8. Sponsorzy: 5 z 6 placeholderów („Sponsor strategiczny", „Sponsor główny A"…)
   — ukryć puste sloty albo podmienić na „Sponsor poszukiwany".

**🟣 Duży temat na osobną sesję (6–10h):**
9. Kadra zawodników redesign (`/druzyny/*`) — Tomek sam mówił że obecne
   zielone kafelki wyglądają „sam wiesz jak". Plan: roster cards
   inspirowane Śląskiem Wrocław (numer + zdjęcie + pozycja + hover stats).
   Wymaga rozszerzenia schemy `teams/*.md` o `players[]`.

## Otwarte pytania / decyzje do podjęcia

- **🟢 Strategia „wariant 1 vs. wariant 2"** — rundy 1 i 2 decyzji Tomka
  zamknięte (2026-04-21). Q1–Q16 mają odpowiedzi. Patrz
  [`docs/OFERTA.md`](OFERTA.md) sekcja „Decyzje Tomka".
- **🔴 Ekonomia wariantu 2** — Tomek wybrał widełki 5–10k PLN dla CMS-a
  o scope 120–200h. To jest ~50–83 PLN/godz., czyli realnie „prezent
  rodzinny", nie zlecenie komercyjne. Do przemyślenia przed spotkaniem:
  czy to ma być realne zlecenie (→ podnieść widełki / ściąć scope),
  czy świadomy prezent dla klubu teścia. Szczegóły w OFERTA.md Q14.
- **Referencje wizualne do Q1** — Tomek wkleił 4 linki (Śląsk Wrocław, Lech
  Poznań, Legia Warszawa, Wisła Kraków). Claude przeanalizował Lech/Legię/
  Wisłę (Śląsk timeout na WebFetch, do ponownego sprawdzenia). Powstały 3
  propozycje szat strukturalnych w OFERTA.md Q1: A („Klubowa klasyka"),
  B („Magazyn klubowy"), C („Dumna marka"). **Kolory pozostają zielony/
  biały/czerwony** (od Śląska).
- **Format prezentacji (Q13)** — zaakceptowany: HTML reveal.js lub PDF,
  bez animacji, 11 slajdów. Struktura zapisana w OFERTA.md. Claude ma
  wygenerować szkielet po akceptacji.
- **Stack dla wariantu 2 (CMS)** — wstępnie rozważane: Payload CMS (self-hosted),
  Astro SSR + własny admin, Laravel + Filament. Scope z Q5 (8 encji edytowalnych
  + 3 role uprawnień + hybrydowy sync 90minut) = wyraźnie duży projekt,
  realistycznie 120–200h pracy. Decyzja o stacku dopiero gdy zarząd wybierze
  wariant 2.
- **🟢 Stack panelu admina (D1)** — RESOLVED 2026-04-25: **Payload CMS 3**.
  Uzasadnienie i porównanie z 3 alternatywami:
  [`STACK-COMPARISON.md`](STACK-COMPARISON.md).
- **🟢 Struktura repo (D2)** — RESOLVED 2026-04-25: **monorepo**
  (`apps/web` + `apps/cms` + `packages/shared`). Restrukturyzacja to
  Etap 1 w [`PAYLOAD-ROADMAP.md`](PAYLOAD-ROADMAP.md).
- **🟠 Model RBAC dla panelu admina (D7)** — rozstrzygnie się w Etapie 16
  roadmap. Default: Wariant A (3 sztywne role admin/redaktor/trener).
  Wariant B (role + per-zasób override) jako opcjonalny etap 19. 3 warianty
  opisane w [`ADMIN-PANEL.md`](ADMIN-PANEL.md).

## Następne kroki (roadmap)

### Krótkoterminowo — przed spotkaniem z zarządem
0. **NOWY** — domknąć krytyczne fixy z review 2026-04-20 (sekcja „Znane
   problemy" wyżej, punkty 1–3). Bez tego magazyn jest niepokazywalny,
   a `/o-klubie` rozjeżdża się z istniejącymi zdjęciami.
1. Tomek decyduje: wariant 2 to zlecenie komercyjne czy prezent rodzinny
   (wpływa na Q14b).
2. Tomek wybiera szatę A/B/C/D (lub zleca „wszystkie 4 na spotkanie jako
   wybór zarządu — przełącznik już jest gotowy"). Klasyk + 3 alternatywy
   gotowe, mimo początkowych problemów.
3. Claude dociera do Śląska Wrocław (retry WebFetch / Browser MCP) i w
   razie potrzeby modyfikuje propozycje.
4. Claude generuje szkielet prezentacji (HTML reveal.js lub PDF, 11 slajdów).
5. Claude przygotowuje jednostronicowe PDF „wariant 1 vs wariant 2".
6. Claude przygotowuje checklistę „co potrzebujemy od was" dla klubu.

### Średnioterminowo — zależne od decyzji klubu

**Jeśli klub wybierze wariant 1 (strona statyczna, bez edycji):**
- Podmiana danych demo na realne (patrz sekcja „Co jest demo" wyżej).
- Finalizacja wybranej przez klub szaty graficznej (z 3 zaproponowanych).
- Przekazanie repo + buildu + instrukcji klubowi.
- Dokument o zakresie wsparcia poprawkowego po przekazaniu.

**Jeśli klub wybierze wariant 2 (strona + CMS) — od 2026-04-25 plan aktywny:**
- **Operacyjny plan etapów:** [`PAYLOAD-ROADMAP.md`](PAYLOAD-ROADMAP.md) —
  18 etapów po ~2–6 h, każdy z test-case'em.
  - **Faza A (Etapy 1–3):** monorepo + Payload setup + News collection.
  - **Faza B (Etapy 4–5):** Astro fetch z CMS + migracja 24 newsów.
  - **Faza C (Etapy 6–8):** Media + Teams + Players + migracja drużyn.
  - **Faza D (Etapy 9–12):** Gallery + siteConfig + Board/Staff/Sponsors + Hero/StaticPages.
  - **Faza E (Etapy 13–16):** integracja 90minut + RBAC.
  - **Faza F (Etapy 17–18):** VPS deploy + backup automatyczny.
- **Pełen kontekst encji i RBAC:** [`ADMIN-PANEL.md`](ADMIN-PANEL.md).
- **Uzasadnienie wyboru Payload:** [`STACK-COMPARISON.md`](STACK-COMPARISON.md).

**Jeśli klub zwleka / nie decyduje:**
- Wariant 1 zostaje „gotowy w szufladzie", nie ruszamy wariantu 2 dopóki nie ma zielonego światła.

## Historia zmian

Chronologiczny log: [`CHANGELOG.md`](../CHANGELOG.md).
