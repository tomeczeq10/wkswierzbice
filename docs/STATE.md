# Stan projektu WKS Wierzbice

> Snapshot bieżącego stanu projektu — aktualizuj po każdej większej sesji.
> Kiedyś "zatnie się" Claude / nowy rozmówca przychodzi bez kontekstu — to
> pierwszy plik, do którego ma zajrzeć.
>
> **Ostatnia aktualizacja:** 2026-05-08 — Dashboard (mobile + desktop) filtruje
> sekcje per rola (RBAC w pełni działa); zamknięte krytyczne fixy z review
> 2026-04-20 (Magazyn header dark mode + `/o-klubie` realne nazwiska + Stadion
> spójność pozycji). RBAC test praktyczny zatwierdzony, backup DB usunięty.
> Hosting bez zmian: serwer domowy `wkswierzbice.tmielczarek.pl`, Docker
> (`wks-web` SSR + `wks-cms`), SQLite z migracjami w prod, persist przez
> mount katalogu `./persist`. Instrukcja: [`docs/DEPLOY-HOME-SERVER.md`](DEPLOY-HOME-SERVER.md).

## Produkcja

- **URL (docelowy klub):** https://wkswierzbice.pl
- **URL (demo / serwer domowy):** https://wkswierzbice.tmielczarek.pl — Astro SSR
  + Payload pod `/admin` (routing w Caddy: `/admin*`, `/api*`, `/_next*` → CMS).
- **Hosting:** serwer domowy Tomka (domena tmielczarek.pl wskazuje na niego)
  — rozwiązanie tymczasowe. Jeśli klub kupi stronę, przejmie hosting/VPS.
- **Deploy (demo domowe):** Docker Compose w `deploy/wks/` + Caddy — opis w
  [`docs/DEPLOY-HOME-SERVER.md`](DEPLOY-HOME-SERVER.md). **Aktualizacja kodu na
  serwerze:** preferowane przez Git — [`docs/DEPLOY-GIT-WORKFLOW.md`](DEPLOY-GIT-WORKFLOW.md)
  (`npm run deploy:home` po `git push`, host SSH: `root@192.168.0.5`). **Pusta baza na serwerze a pełna strona:**
  front ma fallback do `.md` / `public/` — wypełnienie panelu: `npm run seed:cms-on-server`
  (§8 w DEPLOY-HOME-SERVER).
- **Deploy (stary opis statyczny, ręczny):** `npm run build` → rsync/SFTP z
  `dist/` do katalogu domeny (gdy wracamy do czystego SSG bez Node na serwerze).
  Workflow FTP w GitHub Actions został usunięty — nie był zgodny z monorepo /
  SSR.
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

### Panel admina — RBAC + UX (2026-05-07)

- **Dynamiczny system ról** w panelu (kolekcja `Roles` w grupie Ustawienia):
  - Admin tworzy własne role (np. „Redaktor", „Fotograf"), zaznacza checkboxy:
    12 kolekcji × 4 CRUD + 2 globalsy `*_update` + 3 specjalne dostępy
    (`liveStudio`, `galleryManager`, `syncSeason`).
  - Rola **„Administrator"** (`isSystem=true`) seedowana migracją —
    nieusuwalna, zawsze ma full access (bypass w `hasPermission`).
  - Pole `role` na `Users` to relacja → `roles` (required). `auth.depth: 1`
    populuje `req.user.role` jako obiekt z permissions.
  - Sidebar **automatycznie ukrywa** kolekcje, dla których rola nie ma
    READ permission (`admin.hidden = hideUnless('news')`).
  - Custom views (`/admin/live-studio`, `/admin/live-setup`,
    `/admin/gallery-manager`) chronione `<PermissionGuard special="…">` —
    redirect na `/admin` przy braku dostępu.
  - Helpery: `src/access/hasPermission.ts` (`can()`, `canGlobal()`),
    `src/access/hideUnlessHasPermission.ts` (`hideUnless()`,
    `hideGlobalUnless()`), `src/components/PermissionGuard.tsx` z hookiem
    `useHasSpecialAccess()`.
  - Zarządzanie userami i rolami — twardo zaszyte tylko dla rola =
    „Administrator" (nie podlega systemowi permissions).
- **Logiczne grupowanie sidebar** (5 sekcji zamiast płaskiej listy 13):
  Treść / Drużyna / Mecze / Multimedia / Ustawienia. Nagłówki klikalne
  (zwijają sekcje, stan w localStorage). CTA na górze: „Utwórz mecz live"
  + „Menedżer galerii".
- **Galeria (kolekcja `gallery`)** ukryta z sidebara — nie-IT user idzie
  zawsze przez Menedżer galerii. Kolekcja istnieje w bazie (Manager używa
  tych samych tabel).
- **Mobile responsywność** admina (panel dostępny z iPhone'a):
  - Reset `custom.scss` z ~580 linii nakładających się override-ów do
    ~150 świadomych reguł. Wcześniejszy bug: `nav[class*="nav"]` zaciemniał
    breadcrumb (`<nav class="step-nav">` pasuje do podstringu „nav").
  - Save bar fixed-bottom na mobile (`.doc-controls__controls-wrapper`),
    żeby kciuk dosięgał. 80px padding-bottom na content żeby ostatnie pole
    nie chowało się pod barem.
  - Ciemnozielony drawer (≤768 px) w barwach klubu (#0f2a1c) — celowe
    selektory bez wildcardów, banner Live czytelny, hamburger close (×)
    biały na ciemnym tle, aktywny link z jasnozielonym akcentem.

### Relacja na żywo (LiveMatch)

- **Studio Live:** `/admin/live-studio` — sterowanie relacją w czasie meczu:
  - stany: `pre` → `live` → `ht` → `live2` → `ft` (blokady nielogicznych przejść),
  - szybkie dodawanie zdarzeń + modal „Gol WKS” (strzelec/asysta, samobój, minuta auto),
  - lista zdarzeń z **cofnij / edytuj / usuń** (z korektą wyniku).
  - **Pauza / Wznów** (zegar bez resetu 2. połowy) + po `ft` **zatrzymany podgląd czasu** w Studio.
- **Strona główna:** gdy `LiveMatch.enabled=true` i `status=pre`, hero pokazuje **zapowiedź pre‑match**
  („Relacja na żywo od HH:MM”); po starcie przechodzi w widget live (szybsze pierwsze renderowanie + spójny layout jak w Studio).
- **Dane:** relacja może korzystać z meczu z terminarza (`matches`) lub trybu manualnego;
  mecz ma **`lineup[]`** (kadra) dla list zawodników w Studio.
- **Dashboard:** szybki start relacji (modal) + linki do Studio / `LiveMatch`.

### Strony
- `/` — home z karuzelą, aktualnościami, countdown najbliższego meczu,
  statystykami drużyny, highlights
- `/o-klubie` — historia, zarząd (z `BOARD`), sztab (z `STAFF`), timeline
- `/druzyny` + `/druzyny/[slug]` — lista i profile 5 drużyn
- `/terminarz` — dynamiczny, napędzany `season.json` / CMS; tabela ligowa na
  **`/tabela`** i na home (szablon klasyk), na terminarzu skrót + linki
- `/aktualnosci` + `/aktualnosci/[slug]` — 24 artykuły z FB
- `/galeria` — albumy z CMS (`gallery-albums` + relacja w `gallery`), `/galeria/[slug]`,
  `/galeria/bez-albumu` (sieroty); bez albumów w CMS — płaska siatka + lightbox;
  fallback: `GALLERY` w `site.ts`
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
- ✅ **Etap 4 (2026-04-26)** — Astro frontend odpytuje Payload REST API zamiast
  `getCollection('news')`. Strony `/aktualnosci/` (lista) i `/aktualnosci/[slug]`
  (single news) używają `fetchNewsList()` z `apps/web/src/lib/cms.ts` zamiast
  Astro Content Collections. **Strategia fallback (decyzja Tomka):** jeśli CMS
  niedostępny (timeout 5s, ECONNREFUSED, HTTP != 2xx), build/dev gracefully
  fallbackuje na pliki `apps/web/src/content/news/*.md` z czytelnym warningiem
  `[cms] Niedostępne (...): ... — fallback do .md`. Build NIGDY nie wywala się
  z powodu CMS-a. Lexical RichText body renderowane przez
  `@payloadcms/richtext-lexical/html-async` (`convertLexicalToHTMLAsync`) →
  `<Fragment set:html={...}>`. Typy współdzielone przez nowy workspace
  package `@wks/shared` (re-export `News, Tag, Media, User` z
  `apps/cms/src/payload-types.ts`). **Zakres ograniczony** do `/aktualnosci/*` —
  homepage `pages/index.astro` zostaje na `getCollection('news')` aż do
  Etap 4b (osobny mini-stage). Dodano `apps/cms/scripts/seed-test-news.ts` —
  idempotentny seed używający Payload Local API (omija auth), tworzy 1 tag +
  1 news z Lexical body do testowania integracji. Pułapki: dotenv musi się
  ładować PRZED importem `payload.config.ts` (dynamic import-fix); case-mismatch
  w `find({ name: { equals: ... } })` może powodować ValidationError unique
  slug przy idempotentnym seed-zie (workaround: lowercase wszędzie). Test E2E:
  CMS UP → 1 news z CMS na liście (md zignorowane); CMS DOWN → 24 newsy z .md,
  build success w 1.62s.
- ✅ **Etap 4b (2026-04-26)** — homepage `apps/web/src/pages/index.astro`
  + komponenty `MagazineHome.astro` i `StadionHome.astro` przepięte z
  `getCollection('news')` na `fetchNewsList()`. Typ Props w obu komponentach
  zmieniony z `CollectionEntry<'news'>[]` na `NewsItem[]` (identyczny shape,
  zero zmian w renderze). Po Etapie 4b cały frontend news (3 strony) czyta
  WYŁĄCZNIE z CMS, fallback do .md jako safety net. Test E2E: CMS UP →
  homepage pokazuje 1 news z CMS w 4 szablonach (klasyk/marka/magazyn/stadion);
  CMS DOWN → build success w 1.68s, 11 newsów .md na homepage, 3 warningi
  `[cms] Niedostępne`. `getCollection('teams')` zostaje bez zmian (do Etapów 7–8).
- ✅ **Etap 5 (2026-04-26)** — migracja 24 newsów `apps/web/src/content/news/*.md`
  → Payload. Stworzony custom mini-parser markdown → Lexical
  (`apps/cms/scripts/lib/md-to-lexical.ts`, 2-stopniowy: bold/italic outer +
  linki inner z propagacją formatu na text-nodes wewnątrz `<a>`). Skrypt
  `apps/cms/scripts/migrate-news.ts` (gray-matter + Payload Local API,
  idempotentny per slug, tagi też idempotentnie po `name`). Slug newsa = nazwa
  pliku bez `.md` — URL-e `/aktualnosci/<slug>` zachowane 1:1. Test: dry-run +
  real run = 24/24 newsów, 13 nowych tagów (1 istniejący `seniorzy`); re-run
  zero side effects; API zwraca 25 docs; build CMS UP = 41 stron, w tym 25 ×
  `/aktualnosci/<slug>`; spot-check 2 newsów (`komunikat-zarzadu` z italic+link
  i `wazna-wygrana-3-1-wolow` z `<br>` w akapicie) — HTML poprawny. Złapany
  pitfall: 1-stopniowy regex parser kradł literały markdown wewnątrz italic
  obejmującego link → fix dwukrokowy. `cover` zostaje stringiem (do Etapu 6).
  Pliki .md w repo zostają jako safety net dla fallbacku.
- ✅ **Etap 6a (2026-04-26)** — collection `Media` z imageSizes Wariant A:
  thumbnail 320, card 640, hero 1200×630 (WebP, oryginał zachowany).
  `News.cover` zmieniony z `text` na `upload(relationTo: 'media')`. Schema push
  w SQLite dev mode wymagał reset bazy (interactive Drizzle prompt na rename
  text → FK nie działał z `expect`/pipe stdin), więc dodany skrypt
  `seed-admin.ts` (creds z `.env`, defaulty dev) — workflow reset+restore w 30 s.
  Frontend (`apps/web/src/lib/cms.ts`): nowy typ `NewsCover` (discriminated
  union CMS/MD), helpery `pickCoverUrl(cover, variant)` i
  `resolveCoverAlt(item)` (`News.coverAlt ?? Media.alt ?? ''`); URL-e
  absolutyzowane do `CMS_URL` (Payload zwraca relative paths). Templates
  (single news → `hero`, lista/homepage/grid → `card`) — minimalne zmiany
  callsite, NewsCard bez modyfikacji. Test manualny: upload
  `orzel-na-horyzoncie.jpg` przez `upload-test-cover.ts`, sharp wygenerował
  3 warianty WebP (24/68/96 KB), build CMS UP daje 40 stron z poprawnymi
  URL-ami z `<CMS_URL>/api/media/file/`; build CMS DOWN — fallback do
  `/news/*.jpg` z `.md` nadal działa.
- ✅ **Etap 6b (2026-04-26)** — migracja istniejących coverów z legacy
  Markdownów do Media + linkowanie do News. Skrypt
  `apps/cms/scripts/migrate-news-covers.ts` (NEW, idempotentny, 2-krokowy):
  (1) upload 12 nowych plików do Media (1 z 6a — `orzel-na-horyzoncie.jpg` —
  zachowane przez idempotency po `filename`); (2) update `News.cover` po
  slug. **`herb-wks.png` uploadowany RAZ (Media id=2) i podlinkowany do 11
  herb-newsów** zgodnie z decyzją z planu. Końcowy stan: 13 rekordów w Media,
  24/24 newsów z poprawnym `cover`. Tryby `--dry-run` (loguje plan, zero side
  effects) i live. Re-run skryptu = 0 zmian. Build CMS UP daje 100 %
  poprawnie linkujących stron (lista → wariant `card` 640×, single news +
  homepage featured → `hero` 1200×630). Build CMS DOWN: `[cms] Niedostępne …
  fetch failed — fallback do .md` warning + render z legacy ścieżek.
  `News.coverAlt` per-context override działa nawet dla 11 newsów
  współdzielących `herb-wks` (każdy ma swój alt). Drobny pitfall (sentinel
  `0` w dry-run łapany przez `if (!mediaId)`) naprawiony zanim doszło do
  live runa.
- ✅ **Etap 7 (2026-04-26)** — kolekcje `Teams` + `Players` (relacja
  `players.team → teams`), `fetchTeamsList()` w `apps/web/src/lib/cms-teams.ts`,
  strony `druzyny/[slug].astro`, `druzyny/index.astro`, sekcja drużyn na
  `index.astro`. SQLite `file:./cms.db` resolve względem katalogu `apps/cms/`
  (fix złej ścieżki względem `src/`).
- ✅ **Etap 8 (2026-04-26)** — `migrate-teams.ts` (5 drużyn + 110 zawodników),
  `migrate-team-photos.ts` (upload rastrów → Media + `Teams.photo`; SVG
  pomijane — placeholdery z YAML nadal przez enrichment w `cms-teams.ts`).
- ✅ **Etap 9 (2026-04-26 + 2026-04-28 + 2026-05-06)** — kolekcje `gallery-albums` + `gallery`
  (relacja `album`), migracje `20260428_041852` + `20260505_gallery_parent`,
  `cms-gallery.ts` (`fetchGalleryIndex`, `fetchGalleryByAlbumSlug`, rekurencyjne
  `countPhotosDeep`/`findCoverDeep` dla nieograniczonej głębokości), `galeria.astro`,
  `galeria/[slug].astro`, `galeria/bez-albumu.astro`, `GalleryGrid.astro`;
  bez albumów w CMS — płaska lista jak wcześniej; brak CMS / pusta galeria → `GALLERY` z `site.ts`.
  **Menedżer galerii** (2026-05-06): własny widok `/admin/gallery-manager` — file-explorer
  UX, drag & drop upload, MediaPickerModal (z biblioteki bez re-uploadu), nieograniczone
  zagnieżdżenie folderów (pole `parent` self-referential). `GalleryManagerNavLink`
  w `beforeNavLinks` (zielony, zawsze widoczny). Kolekcja `gallery-albums` ukryta
  z domyślnego sidebara Payload.
- ✅ **LiveMatch v3.1 (2026-04-29)** — relacja na żywo w hero + Studio Live w panelu,
  realtime przez SSE (`/api/live-match/stream` na CMS), publiczny odczyt snapshotu na stronie przez `/wks-live-match` (Astro), `matches.lineup[]` (kadra) i UX do prowadzenia relacji
  (gole modalem, cofanie/edycja/usuwanie zdarzeń, pre‑match zapowiedź).
- ⏳ **Etapy 10–18** — następny: **Etap 10** (`Globals siteConfig` + stopniowe
  przenoszenie stałych z `site.ts`).

**Plan implementacji rozbity na 18 etapów (Faza A–F):**
[`PAYLOAD-ROADMAP.md`](PAYLOAD-ROADMAP.md). Każdy etap = 2–6 h pracy + jeden
test-case do sprawdzenia lokalnie. Łączna estymata 60–80 h.

**Pozostałe decyzje rozstrzygane per etap:**
- **D7 RBAC** — w Etapie 16 (default: Wariant A — admin/redaktor/trener).
- **D8 galeria** — Etap 9: albumy + podstrony (slug); bez rekordów `gallery-albums`
  publicznie nadal płaska lista.
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

**🔴 Krytyczne — wszystkie ZAMKNIĘTE (2026-05-08):**
1. ✅ Header (i footer) reagują na dark mode szablonu magazyn — dodane
   reguły `html[data-template="magazyn"] body > header` w `global.css`.
2. ✅ `/o-klubie` ma realne nazwiska zarządu (Sala, Majerski, Zdunek,
   Posadowski, Sala, Czapla) + trenerów (Pożarycki, Rycombel) z prawdziwymi
   zdjęciami. Naprawione w międzyczasie przez import danych do CMS.
3. ✅ Stadion: pozycja spójna w sticky LED i hero — oba używają tego samego
   propa `position` z `season.json` (sprawdzone na produkcji: `2.`).

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

## Backlog pomysłów (bez terminu — na przyszłość)

### Transmisje LIVE meczów na stronie

- **Cel:** osoba na meczu (np. admin/redaktor) startuje stream z telefonu lub
  kamery; kibic ogląda na stronie klubu (niekoniecznie na Facebooku).
- **Prosty wariant:** stream na **YouTube Live / Facebook Live / Twitch** z
  aplikacji na telefonie → na `wkswierzbice.pl` **embed** (`iframe`) albo
  prominentny link „Oglądaj LIVE”. Mało pracy, stabilne skalowanie; typowe
  opóźnienie dziesiątki sekund.
- **Bardziej „markowy” wariant:** publikacja **RTMPS** (Larix, OBS) do usługi
  typu **Mux / Cloudflare Stream / Amazon IVS** → player HLS na stronie;
  ewentualnie w CMS pole „URL streamu / status LIVE”.
- **Niskie opóźnienie:** WebRTC (drożej, bardziej złożone) — zwykle niepotrzebne
  przy okręgówce.
- **Do rozstrzygnięcia później:** prawa do transmisji (regulamin ligi/ZPN),
  zgody na wizerunek, ewentualne mutowanie przez platformę przy muzyce na
  stadionie.

### Integracja aktualności z Facebookiem (fanpage klubu)

- **Dziś w treści:** artykuły mają opcjonalne `facebookUrl` (link do posta na
  FB) — dobre jako „źródło” i dla wpisów skróconych z CTA na fanpage.
- **Kierunek „strona → Facebook”:** po publikacji wpisu w **Payload** można
  dodać hook / endpoint wywołujący **Facebook Graph API** (`POST` na
  `/{page-id}/feed`) — wymaga aplikacji Meta, **Page Access Token**, często
  weryfikacji uprawnień; treść + link do pełnego artykułu na domenie klubu.
- **Kierunek „Facebook → strona”:** okresowy import postów z fanpage’a przez
  Graph API (lista postów strony) — możliwe, ale trzeba pilnować **duplikatów**
  (co jest źródłem prawdy), formatu zdjęć i długości tekstu.
- **Hybryda:** redaktor pisze w CMS → automatyczny post na FB z linkiem do
  artykułu (najczęstszy sensowny model przy migracji z „tylko FB”).

## Następne kroki (roadmap)

### Pilne (do najbliższej sesji)
- ✅ Test praktyczny RBAC zatwierdzony 2026-05-08 (admin testował rolę
  „Fotograf" — sidebar i dashboard ukrywają niedozwolone sekcje, dostęp
  do `/admin/collections/sponsors` blokowany).
- ✅ Backup `cms.db.bak.before_rbac` usunięty z serwera.
- ✅ Krytyczne fixy z review 2026-04-20 (punkty 1–3) zamknięte.
- **Następnie:** „Ważne — polerka" z review (punkty 4–8, ~1–2h razem):
  Marka countdown na md, Magazyn opacity numerów `01..05`, Magazyn ⚽ →
  SVG, Stadion 3 statystyki na md, Sponsorzy puste sloty. Każdy ~15-30 min.

### Krótkoterminowo — przed spotkaniem z zarządem
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
