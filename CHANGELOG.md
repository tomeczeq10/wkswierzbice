# CHANGELOG

Chronologiczny log istotnych zmian w projekcie WKS Wierzbice.

Konwencja: nowy wpis po każdej większej sesji (nowa funkcjonalność, import
treści, zmiana infrastruktury, decyzja architektoniczna, usunięcie zależności).
Drobne poprawki stylu, literówki, jednorazowe tweaki CSS — pomijamy.

Format wpisów: `## YYYY-MM-DD — krótki tytuł sesji`, potem nagłówki
`### Added / Changed / Removed / Fixed / Open`.

Aktualny snapshot stanu projektu: [`docs/STATE.md`](docs/STATE.md).

---

## 2026-04-28 — Galeria: albumy (foldery) w CMS i podstrony www

### Added

- **`apps/cms/src/collections/GalleryAlbums.ts`** — kolekcja `gallery-albums`
  (tytuł, slug, opis, data wydarzenia, okładka, kolejność); **`Gallery`** —
  pole relacji **`album`** zamiast nieużywanego tekstowego `albumId`.
- **Migracja `20260428_041852`** — tabela `gallery_albums`, przebudowa `gallery`
  (`album_id` INTEGER → FK), kolumna `gallery_albums_id` w
  `payload_locked_documents_rels`.
- **WWW:** `fetchGalleryIndex`, `fetchGalleryByAlbumSlug`, `fetchGalleryOrphans`
  w **`apps/web/src/lib/cms-gallery.ts`**; **`GalleryGrid.astro`** (siatka +
  lightbox); **`galeria.astro`** — karty albumów + link „Pozostałe zdjęcia”;
  **`galeria/[slug].astro`**, **`galeria/bez-albumu.astro`**.
- **`packages/shared`** — re-eksport typu **`GalleryAlbum`**.

### Changed

- Gdy w CMS jest **≥1 album** i są zdjęcia w `gallery`, strona **`/galeria`**
  pokazuje **karty wydarzeń**; pojedyncze zdjęcia bez albumu — **`/galeria/bez-albumu`**.
  Gdy **brak albumów** w CMS, zachowanie jak dotąd: **jedna siatka** wszystkich
  zdjęć z `gallery` (lub fallback `GALLERY` w `site.ts`).
- **`docs/STATE.md`** — opis galerii i Etapu 9.

---

## 2026-04-27 — Deploy domowy: migracje SQLite + poprawka volume DB

### Added

- **`docs/DEPLOY-GIT-WORKFLOW.md`** + **`scripts/deploy-home-server.sh`** +
  skrypt npm **`deploy:home`** — deploy przez **Git** (push → `git pull` na
  serwerze + `docker compose`), zamiast pełnego archiwum tar przy wolnym łączu.
- **`scripts/wks-cms-seed-prod-db.sh`** + npm **`seed:cms-on-server`** —
  przez SSH wypełnia produkcyjny SQLite w `deploy/wks/persist` tymi samymi
  skryptami Payload co lokalnie; **`docs/DEPLOY-HOME-SERVER.md` §8**.

### Fixed

- **Panel `/admin` na produkcji (Docker)**: pusta baza bez tabel (`no such table:
  users`) — włączono `prodMigrations` w `apps/cms/src/payload.config.ts` oraz
  dodano początkową migrację w `apps/cms/src/migrations/`.
- **SQLite `readonly database` przy migracji**: bind-mount **pojedynczego pliku**
  `cms.db` blokował zapis (WAL/shm). W `deploy/wks/docker-compose.yml` mount
  jest teraz na **cały katalog** `./persist` → `/data/wks`, a `DATABASE_URL` /
  `UPLOADS_DIR` ustawione na ścieżki w tym volume.
- **`docs/DEPLOY-HOME-SERVER.md`**, **`deploy/wks/env.cms.example`** — opis nowej
  konfiguracji persist i typowych błędów.
- **SSR + dynamiczne strony**: `getStaticPaths` jest ignorowane przy
  `output: "server"` — **`druzyny/[slug].astro`** i **`aktualnosci/[slug].astro`**
  ładowały dane po `Astro.params` + `fetch*List()`, zamiast z pustych `props`
  (wcześniej **HTTP 500** na `/druzyny/seniorzy` itd.).
- **`fetchTeamsList()`**: przy częściowej liście z CMS dokładane są brakujące
  drużyny z `content/teams/*.md` (unik 404 na slugach legacy).
- **`apps/web/astro.config.mjs`**: `server.strictPort: true` na **4321** —
  unik cichego przeskoku na 4322 przy zajętym porcie (łatwo wtedy oglądać
  „stary” dev na 4321).
- **`druzyny/[slug].astro`**, **`aktualnosci/[slug].astro`**: `export const prerender = false`
  — bez tego Astro zgłasza **GetStaticPathsRequired** (trasa domyślnie jak do
  SSG; dane i tak ładujemy po `Astro.params` przy SSR).
- **`fetchFromCms()`** (`apps/web/src/lib/cms.ts`): gdy API zwraca **0 newsów**
  (`totalDocs` 0), **fallback do Markdown** — żeby pusta baza na produkcji nie
  udawała „pełnego CMS” przy pełnym `/admin`.
- **Produkcja: zawieszony CMS po seedzie Docker** — w `payload_migrations` zostawał
  `batch=-1` (tryb dev); Payload czekał na stdin. Seed przez Docker: **`NODE_ENV=production`**
  w `--env-file`; w **`docs/DEPLOY-HOME-SERVER.md`** opis naprawy (`DELETE … batch=-1`).
- **Cache produkcji (Cloudflare / przeglądarka):** `apps/web/src/middleware.ts`
  — `Cache-Control: no-store` na odpowiedziach HTML; **`apps/cms/next.config.ts`**
  — to samo dla **`/api/*`** (JSON z Payloada).
- **Cache produkcji (HTML + API):** middleware Astro (`no-store` na HTML) oraz
  nagłówki Next na **`/api/*`** w `apps/cms/next.config.ts` — mniej „starej”
  strony przy Cloudflare / przeglądarce.
- **SSR + CMS:** usunięto **jednorazowy cache modułowy** w `fetchSiteConfig()` (`cms-site.ts`)
  — po edycji globalu `siteConfig` w panelu strona widziała stare dane do restartu
  `wks-web`. Do zapytań REST Payload dodano **`cache: 'no-store'`** w `cms*.ts`.

### Removed

- **`.github/workflows/deploy.yml`** — workflow „Build and Deploy (FTP)”;
  nieużywany przy deployu przez Docker + Git (`DEPLOY-GIT-WORKFLOW`).

---

## 2026-04-26 — Tabela ligowa: `/tabela`, home (klasyk), nawigacja

### Added

- **`apps/web/src/pages/tabela.astro`** — strona z pełną tabelą seniorów (źródło:
  `fetchSeason()` / CMS + fallback `season.json`).
- **`apps/web/src/components/LeagueStandingsTable.astro`** — wspólna tabela
  standings dla `/tabela` i strony głównej (szablon klasyk).

### Changed

- **`apps/web/src/pages/index.astro`** — sekcja tabeli na home (tylko blok
  `data-template-only="klasyk"`), `fetchSeason()` zamiast importu JSON dla
  całej strony głównej.
- **`apps/web/src/pages/terminarz.astro`** — zamiast pełnej tabeli: skrót z
  miejscem WKS + CTA do `/tabela` i kotwicy na home.
- **`apps/web/src/config/site.ts`** — pozycja menu „Tabela” → `/tabela`.

---

## 2026-04-26 (Etapy 8–9 + domknięcie 7) — Drużyny: zdjęcia; Galeria w Payload

### Added

- **`apps/cms/scripts/migrate-team-photos.ts`** — upload JPEG/PNG/WebP/GIF z
  `photo:` w `content/teams/*.md` → `Media` + update `Teams.photo` (idempotentnie
  po `filename`). SVG pomijane (Sharp); placeholdery SVG z `.md` nadal na
  froncie przez dopięcie ścieżki w `fetchTeamsList()` gdy CMS nie ma `photo`.
- **`apps/cms/src/collections/Gallery.ts`** — płaska galeria: `image` (upload),
  `alt`, `caption`, `order`, `category`, `albumId`.
- **`apps/web/src/lib/cms-gallery.ts`** — `fetchGalleryList()`: jeśli CMS ma
  ≥1 rekord `gallery`, źródło prawdy = CMS (URL z Media + `CMS_URL`); inaczej
  `GALLERY` z `site.ts`.
- **Skrypty npm:** root + workspace `cms`: `migrate:teams`, `migrate:team-photos`.

### Changed

- **`apps/web/src/lib/cms-teams.ts`** — po załadowaniu drużyn z CMS: dla każdej
  bez `photo` dopinamy `photo` z legacy Markdown (slug 1:1).
- **`apps/web/src/pages/galeria.astro`** — dane z `fetchGalleryList()`;
  lightbox: `data-caption` + podpis z `caption` lub `alt`.
- **`docs/PAYLOAD-ROADMAP.md`**, **`docs/STATE.md`** — status Etapów 7–9.

### Open

- **Etap 10** — `Globals siteConfig` i migracja fragmentów `site.ts`.
- Po restarcie CMS z nową kolekcją `gallery` Drizzle utworzy tabelę (dev SQLite
  push). Dopóki w CMS brak rekordów galerii, strona wygląda jak dotąd (fallback).

---

## 2026-04-26 (Etap 6b) — Migracja istniejących coverów do Media + linkowanie do News

Domknięty Etap 6b z [`docs/PAYLOAD-ROADMAP.md`](docs/PAYLOAD-ROADMAP.md). Po
Etapie 6a infrastruktura była gotowa (Media collection z imageSizes, News.cover
jako upload-relacja, frontend z `pickCoverUrl/resolveCoverAlt`), ale w bazie był
tylko 1 testowy plik (`orzel-na-horyzoncie.jpg`). Etap 6b uzupełnia bazę:
uploaduje wszystkie 13 historycznych plików z `apps/web/public/` do Media
i linkuje do 24 newsów po slug — żeby na produkcji nie było wstydu.

### Decyzje (potwierdzone z planu)

- **`herb-wks.png` współdzielony** — uploadowany RAZ (idempotentnie po
  `filename`), 11 herb-newsów linkuje tę samą Media id. Per-news alt jest w
  `News.coverAlt`, więc nie ma konfliktu — każdy news ma unikalny opis dla
  niewidomych mimo że obraz jest ten sam.
- **`Media.alt` puste (`null`)** dla wszystkich migrowanych plików — alt
  per-context z YAML `coverAlt` trafia do `News.coverAlt`, helper
  `resolveCoverAlt` z `apps/web/src/lib/cms.ts` realizuje fallback chain
  zgodnie z decyzją z Etapu 6a.
- **Idempotencja po `filename`** — orzel-na-horyzoncie.jpg z Etapu 6a
  (Media id=1) zachowane. Re-run skryptu = 0 side effects.
- **Skrypt 2-krokowy zamiast jednoprzebiegowego** — najpierw upload UNIKALNYCH
  plików, potem linkowanie po slug. Lepsze logi i czytelniejsze warning'i.

### Added

- **`apps/cms/scripts/migrate-news-covers.ts`** (~210 linii) — idempotentny
  migrator coverów:
  - Krok 1 — Media uploads: `gray-matter` parse 24 .md → unikalne `cover`
    paths (13 sztuk) → `payload.find({ where: filename })` → jeśli brak,
    `payload.create({ collection: 'media', file: { data, mimetype, name, size } })`.
    `Media.alt` ustawiany na `null` (per decyzja powyżej).
  - Krok 2 — News.cover linking: dla każdego z 24 newsów `payload.find({
    where: slug })`, sprawdza czy `cover` już = wymagany Media id (porównuje
    przez `typeof cover === 'number' || cover.id`), jeśli nie —
    `payload.update({ data: { cover: mediaId } })`.
  - CLI flag `--dry-run` (loguje plan, zero side effects) — zalecane przed
    live runem.
  - Walidacja: missing files (warning + skip), nieobsługiwane MIME (warning +
    skip), brak rekordu News (warning + skip — z hintem `uruchom najpierw
    migrate-news.ts`).

### Changed

- `apps/cms/src/collections/News.ts` — bez zmian schemy, ale Media id=2 (herb)
  współdzielone przez 11 rekordów. Stan końcowy bazy: 13 Media + 24 News
  z `cover` ≠ null.
- `docs/PAYLOAD-ROADMAP.md` — Etap 6b status `[x] DONE`, pełen opis
  implementacji + testy.
- `docs/STATE.md` — sekcja Wariant 2/CMS, entry o Etapie 6b.

### Fixed

- Drobny bug w pierwszej wersji skryptu: `if (!mediaId)` w kroku 2 łapało
  sentinel `0` z dry-run jako "brak Media id" (false negative). Fix:
  `if (mediaId === undefined)`. Naprawione przed live runem.

### Test (manualny, wykonany)

1. `npx tsx apps/cms/scripts/migrate-news-covers.ts --dry-run` →
   `Media: utworzonych: 12, pominiętych (już są): 1`,
   `News.cover: zaktualizowanych: 23, pominiętych: 1`. Plan zgodny z
   oczekiwaniami (1 = orzel z 6a).
2. Live run → 12 nowych Media (id=2..13, każde z trzema wariantami
   `thumbnail/card/hero` wygenerowanymi przez sharp), 23 newsy podlinkowane.
   Czas total: ~3 s.
3. Re-run idempotency → `utworzonych: 0, pominiętych: 13, news
   zaktualizowanych: 0, pominiętych: 24`. Zero side effects. ✅
4. Build CMS UP (`CMS_URL=http://localhost:3000 npm run build`):
   - `/aktualnosci/index.html` — 24 obrazki, wszystkie URL-e absolute do
     `http://localhost:3000/api/media/file/<filename>-640x...webp` (wariant
     `card`). 7 sztuk to `herb-wks-640x640.webp` (shared dla 11 newsów —
     5 z nich nie wpada do "pierwszej strony" listy ze względu na limit/sort).
   - `/aktualnosci/orzel-na-horyzoncie/` — `<img
     src=".../orzel-na-horyzoncie-1200x630.webp" alt="Zdjęcie z wpisu: ORZEŁ
     NA HORYZONCIE! 🔥 …">` — wariant `hero` + `News.coverAlt` per-context.
   - `/aktualnosci/komunikat-zarzadu/` — `<img src=".../herb-wks-1200x630.webp"
     alt="Herb WKS Wierzbice – wpis „📢 Komunikat Zarządu" …">` — wspólne
     Media (id=2), unikalny alt per news. ✅
   - `/index.html` (homepage) — featured ma hero 1200×630, grid ma card
     640×… ✅
5. Build CMS DOWN (`CMS_URL=http://localhost:9999 npm run build`):
   `[cms] Niedostępne (http://localhost:9999): fetch failed — fallback do
   .md`, fallback rendering pokazuje legacy `/news/*.jpg` i `/herb-wks.png`. ✅

### Open

- Etap 7 (Collections `Teams` + `Players`) — następny krok. `Teams` + relacja
  `players.team`, fetch w `apps/web/src/pages/druzyny/[slug].astro`.
- Edge case na przyszłość: jeśli edytor doda nowy news z `cover: /herb-wks.png`
  (przez panel admin nie wpisze stringa, tylko wybierze plik), to po prostu
  wskaże istniejące Media id=2 — żadnej dodatkowej logiki nie potrzeba.
- Legacy pliki `apps/web/public/news/*.{jpg,jpeg}` zostają w repo do safety
  net dla CMS DOWN fallback (per decyzja z Etapu 6a).

---

## 2026-04-26 (Etap 6a) — Collection `Media` + `News.cover` jako upload + warianty obrazków

Domknięty Etap 6a z [`docs/PAYLOAD-ROADMAP.md`](docs/PAYLOAD-ROADMAP.md). Po
Etapie 5 24 newsy były w CMS, ale `cover` to wciąż string-ścieżka (np.
`/news/orzel-na-horyzoncie.jpg`) renderowana jako `<img src>` z `apps/web/public/`.
Etap 6a aktywuje pełen workflow uploadowy: edytor wgrywa plik w panelu, Payload
generuje warianty WebP (thumbnail/card/hero), front wybiera wariant per-kontekst.

### Decyzje (potwierdzone w sesji)

- **`imageSizes` — Wariant A** (Tomek wybrał z 3 wariantów):
  - `thumbnail` 320 px szer., WebP q=80
  - `card`      640 px szer., WebP q=82 (główne użycie: NewsCard, lista, homepage)
  - `hero`      1200×630 px crop center, WebP q=85 (single news header + og:image friendly)
- **Oryginał zachowany** — Payload trzyma plik w wgranym formacie (JPEG/PNG/WebP/GIF) obok wariantów. Edytor widzi w panelu to, co wgrał; SEO/socials dostają WebP variants.
- **`Media.alt` opcjonalne**, `News.coverAlt` zachowany. Frontend: `News.coverAlt ?? Media.alt ?? ''`. Powód: ten sam plik (np. `herb-wks.png`) może być użyty w wielu newsach z różnymi alt-textami; per-context override musi mieć pierwszeństwo.
- **`News.cover: text → upload`** — schema breaking change. Reset dev DB (świadoma decyzja, alternatywą był interactive Drizzle prompt non-runnable w skryptach).
- **Reset workflow z minimalnym tarciem** — skrypt `seed-admin.ts` (idempotent, creds z `.env`) + idempotentny `migrate-news.ts` z Etapu 5. Reset = `pkill && rm cms.db && start && seed-admin && migrate-news`, ~30 s.

### Added

- **`apps/cms/src/collections/Media.ts`** — pełna konfiguracja kolekcji:
  - `mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif']`
  - `staticDir: 'media'` (relative do `apps/cms/`)
  - `imageSizes` Wariant A (3 warianty WebP, opisy w komentarzu pliku)
  - `alt` opcjonalne, `useAsTitle: 'filename'`, `defaultColumns: ['filename', 'alt', 'mimeType', 'filesize', 'updatedAt']`
  - Polskie etykiety `singular: 'Plik media'`, `plural: 'Media'`
- **`apps/cms/scripts/seed-admin.ts`** — idempotentny seed admin po reset dev DB:
  - Czyta `ADMIN_EMAIL` / `ADMIN_PASSWORD` z `apps/cms/.env`
  - Default `admin@wks-wierzbice.pl` / `dev-pass-2026!` (DEV ONLY, do zmiany w panelu)
  - Idempotent po email — re-run pomija jeśli user istnieje
- **`apps/cms/scripts/upload-test-cover.ts`** — one-shot manual test (upload `orzel-na-horyzoncie.jpg` + link cover newsa). Idempotent po `filename`. Zostawiony w repo dla sanity check po przyszłych zmianach.
- **`apps/web/src/lib/cms.ts` — typy + helpery:**
  - `NewsCover` (discriminated union `'cms' | 'md'`):
    - CMS: `{source, url, alt, sizes: {thumbnail?, card?, hero?}}`
    - MD: `{source, url, alt}` (legacy, brak wariantów)
  - `pickCoverUrl(cover, variant)` — wybór wariantu z CMS, fallback do `cover.url`; dla MD zwraca jedyne `url`.
  - `resolveCoverAlt(item)` — `News.coverAlt ?? Media.alt ?? ''`.
  - `absolutizeCmsUrl()` — `new URL(relative, CMS_URL)` (Payload zwraca paths bez prefix-u).
- **Pole `ADMIN_EMAIL` / `ADMIN_PASSWORD`** w `apps/cms/.env` (gitignored) i `apps/cms/.env.example` (z `change-me-in-dev-and-prod` placeholder).

### Changed

- **`apps/cms/src/collections/News.ts`** — `cover` z `type: 'text'` na `type: 'upload', relationTo: 'media'`. `coverAlt` opisuje teraz override względem Media.alt.
- **`apps/cms/scripts/migrate-news.ts`** — pomija `cover` w `data` (typ pola się zmienił, string nie zwaliduje). Komentarz wyjaśnia że upload + linkowanie zostaje na Etap 6b. Pozostałe pola (excerpt, body, tags, etc.) bez zmian.
- **`apps/cms/src/payload-types.ts` (regen)** — `Media.sizes.{thumbnail,card,hero}` z `url/width/height/mimeType/filesize/filename`, `News.cover: number | Media | null`, `Media.alt` opcjonalne.
- **Templates frontu** (callsite-only, NewsCard nadal `cover: string`):
  - `apps/web/src/pages/aktualnosci/[slug].astro` → `pickCoverUrl(post.data.cover, 'hero')` + `resolveCoverAlt(post)` (single news header).
  - `apps/web/src/pages/aktualnosci/index.astro` → `'card'` (lista).
  - `apps/web/src/pages/index.astro` → `'card'` × 2 (newsTop3 klasyk + newsTop6 marka).
  - `apps/web/src/components/home/MagazineHome.astro` → featured `'hero'`, grid `'card'`.
  - `apps/web/src/components/home/StadionHome.astro` → `'card'`.
- **Dev DB reset** — `apps/cms/cms.db` skasowane (z testowym newsem z Etapu 3 + adminem). Po reset: 1 user, 0 newsów, 0 tagów. Po `seed-admin` + `migrate-news`: 1 user, 24 newsy, 14 tagów (1 cover linked do Media id=1 z testu manualnego).

### Tests

- **API GET `/api/media/1?depth=0`** — JSON z `sizes.{thumbnail,card,hero}` (każdy z `url`, `width`, `height`, `mimeType`, `filesize`, `filename`). Wszystkie 3 warianty WebP, sharp wygenerował poprawnie:
  - `thumbnail-320×400.webp` 24 KB
  - `card-640×800.webp` 68 KB
  - `hero-1200×630.webp` 96 KB (crop center, ratio 1.91:1)
  Oryginał `orzel-na-horyzoncie.jpg` 158 KB (1080×1350) zachowany. ✅
- **Build CMS UP** — exit 0, 40 stron w 1.63 s (24 newsy + 1 lista + 15 static):
  - `dist/aktualnosci/orzel-na-horyzoncie/index.html` → `src="http://localhost:3000/api/media/file/orzel-na-horyzoncie-1200x630.webp"` + `alt="Zdjęcie z wpisu: ORZEŁ NA HORYZONCIE! 🔥…"` (z News.coverAlt). ✅
  - `dist/index.html` → ten sam news jako card 640×800.webp. ✅
  - `dist/aktualnosci/index.html` → także card. ✅
  - 23 newsy bez coveru → fallback gradient w NewsCard, brak crash. ✅
- **Build CMS DOWN** (`pkill next-server`):
  - 40 stron, `[cms] Niedostępne (...): fetch failed — fallback do .md` × 3 (homepage/lista/[slug]). ✅
  - `dist/aktualnosci/orzel-na-horyzoncie/index.html` → `src="/news/orzel-na-horyzoncie.jpg"` (legacy z YAML). ✅
  - 11 newsów z legacy `.md` cover paths na homepage. ✅

### Fixed / Pitfalle

- **Drizzle SQLite push mode + zmiana typu kolumny = nieinteraktywny prompt na rename.** Przy zmianie `News.cover: text → upload`, Drizzle widzi `cover` (TEXT) znika a `cover_id` (INTEGER FK) pojawia się i pyta "Is cover_id created or renamed from another column?". Próby:
  1. Spawn z `expect` + `interact` — wymaga TTY, w `nohup` zabija proces.
  2. Pipe `\n` do stdin — `prompts` (npm) sprawdza isatty, ignoruje pipe.
  3. Manual SQL `ALTER TABLE news DROP cover; ADD cover_id INTEGER REFERENCES media(id)` — Drizzle wciąż chce odbudować table (rebuild SQLite-style), prompty wracają.
  - **Decyzja:** reset bazy (świadomie zaakceptowany, dev SQLite + push mode = breaking schema = reset). Stworzony `seed-admin.ts` żeby zminimalizować ból (admin odtwarzany 1 poleceniem, hasło z `.env`).
  - W produkcji (Etap 17) używamy `drizzle-kit migrate` (versioned migrations) na Postgres — tam nie ma push mode promptów.

### Open

- **Etap 6b** — skrypt `apps/cms/scripts/migrate-news-covers.ts` — upload 12-13 plików z `apps/web/public/news/*` + `apps/web/public/herb-wks.png` (jeśli używany jako default cover) do Media + linkowanie do 24 newsów po slug. Obecnie tylko 1 cover linked (orzel-na-horyzoncie z testu).
- **Pliki `apps/web/public/news/*` zostają w repo** — do safety net dla CMS DOWN fallback (frontend MD ścieżki to oryginalne ścieżki w `public/`). Po Etapach 6b + 17 (produkcyjny CMS z backup) decyzja: zostawić czy usunąć.

---

## 2026-04-26 (Etap 5) — Migracja 24 newsów MD → Payload

Domknięty Etap 5 z [`docs/PAYLOAD-ROADMAP.md`](docs/PAYLOAD-ROADMAP.md). Po
Etapie 4b cały frontend Astro czytał news z Payload, ale w bazie był tylko 1
testowy news (z Etapu 3). 24 oryginalne newsy żyły wciąż w
`apps/web/src/content/news/*.md` jako markdown z YAML frontmatterem, używane
tylko jako fallback przy CMS DOWN. Etap 5 to ich import do CMS jako rekordów
Payload — z konwersją markdown body → Lexical i zachowaniem istniejących URL-i.

### Added

- **`apps/cms/scripts/lib/md-to-lexical.ts`** — własny mini-parser markdown →
  Lexical SerializedEditorState. Zakres dopasowany do prostoty naszych 24 .md
  (zero nagłówków, blockquote, list, code blocks — zweryfikowane gradient
  grep'em przed pisaniem):
  - akapity rozdzielone `\n\n+`,
  - linebreak (single `\n` w obrębie akapitu) → Lexical `linebreak` node →
    `<br>` w HTML,
  - inline: `**bold**`/`__bold__` → format=1, `_italic_`/`*italic*` → format=2,
    `[text](url)` → link node (`linkType: 'custom'`, `newTab: true`).
  - **Algorytm 2-stopniowy:** `parseInline` rozpoznaje warstwą zewnętrzną
    bold/italic (mogą obejmować link), wywołuje rekurencyjnie z dodanym
    `format`; `parseLinksAndText` w plain segmentach wyciąga linki i
    propaguje `format` na text-node dziecko linka.
  - Dzięki temu `_… [link](url) …_` daje italic-text + link{italic-text} +
    italic-text (poprawny `<em>…</em><a><em>…</em></a><em>…</em>`).
- **`apps/cms/scripts/migrate-news.ts`** — skrypt migracyjny:
  - Czyta wszystkie `apps/web/src/content/news/*.md` z `gray-matter`.
  - **Slug newsa = nazwa pliku bez `.md`** (1:1 z Astro Content Collections —
    URL-e `/aktualnosci/<slug>` zachowane).
  - Tagi: dla każdego unikalnego stringa z YAML `tags[]` tworzy/podpina rekord
    w kolekcji `tags` (idempotentnie po `name`).
  - Newsy idempotentnie po `slug` (`find` → `create` jeśli brak; pomija jeśli
    istnieje).
  - Tryb `--dry-run` (zero side effects) i tryb live.
  - `cover` zostawiamy jako string (np. `/news/orzel-na-horyzoncie.jpg`) — w
    Etapie 6 podmienimy na relację do Media + faktyczny upload.
- **`apps/cms/scripts/delete-news-by-slug.ts`** — pomocniczy skrypt
  (`npx tsx … <slug>`). Użyty raz przy naprawie buga w parserze; zostawiony
  w repo bo będzie użyteczny przy Etapie 6 i kolejnych iteracjach migracji.
- **devDep `gray-matter@4`** w `apps/cms/package.json`.

### Changed

- Baza Payload: +24 rekordy w `news` (id 2..25; id=1 to testowy `testowy-news-z-cms`
  z Etapu 3) i +13 rekordów w `tags` (`zapowiedź, turniej, żaki, orliki, wynik,
  juniorzy, kibice, klub, zawodnik meczu, młodzicy, młodzież, trampkarze,
  życzenia` — `seniorzy` istniał z Etapu 3).

### Tests

- **Dry-run** — 24 newsy + 14 tagów do utworzenia (1 istniejący), zero side
  effects, zero błędów. ✅
- **Real run** — 24/24 newsów utworzonych, 13 nowych tagów, 0 błędów. ✅
- **Re-run** — 0 nowych rekordów, 23 pominięte (idempotentność OK; jeden news
  utworzony bo był wcześniej skasowany ręcznie do testu naprawy parsera). ✅
- **API** — `GET /api/news?limit=100&depth=2&where[draft][equals]=false`
  zwraca 25 docs, każdy z relacją `tags` rozwiniętą do obiektów `{ id, name }`. ✅
- **Astro build (CMS UP)** — exit 0, **41 stron** w 1.67 s, w tym
  `dist/aktualnosci/<slug>/index.html` × 25 + `dist/aktualnosci/index.html`
  (lista). ✅
- **Spot-check** wyrenderowanego HTML:
  - `komunikat-zarzadu` (jedyny news z italic + link): `<em>Pełny wpis dostępny na </em><a href="…fb.com/posts/…" rel="noopener noreferrer" target="_blank"><em>fanpage'u klubu na Facebooku</em></a><em>.</em>` ✅
  - `wazna-wygrana-3-1-wolow` (8 akapitów, jeden z 3 strzelcami rozdzielonymi
    pojedynczym `\n`): 8 × `<p>`, w tym `<p>Lima ⚽️<br />Kamiński ⚽️<br />Marciniszyn ⚽️</p>`. ✅
- **Homepage** — 11 unikalnych linków `/aktualnosci/<slug>` na `dist/index.html`
  (top11 z 25, sortowane po dacie desc; `testowy-news-z-cms` z 2026-04-26 na
  czele, dalej oryginalne newsy z marca/kwietnia 2026). ✅

### Fixed

- **Bug w pierwszej (1-stopniowej) wersji parsera markdown → Lexical:** dla
  wejścia `_Pełny wpis dostępny na [fanpage'u klubu na Facebooku](https://…)._`
  greedy regex italic łapał całą zawartość między pierwszym a ostatnim `_`,
  ale literał `[…](…)` wewnątrz nie był rozpoznawany — w rezultacie cały
  akapit szedł do CMS jako italic-text z surowym markdownem. Złapane przy
  spot-checku JSON-a po pierwszym real run-ie. Fix: 2-stopniowy parser
  (commit) — outer formatting (bold/italic) → inner linki, format propaguje
  na text-node wewnątrz linka. Naprawiony pojedynczy news przez
  `delete-news-by-slug.ts komunikat-zarzadu` + re-run migracji
  (idempotentność zadziałała: stworzony tylko ten 1 brakujący).

### Open

- **Etap 6** — Collection `Media` w Payload + upload obrazków, podmiana
  `cover: text` na relację, migracja plików `apps/web/public/herb-wks.png` i
  `apps/web/public/news/*.jpg` do CMS-owego storage.
- Pliki `apps/web/src/content/news/*.md` zostają w repo jako safety net dla
  fallbacku w `apps/web/src/lib/cms.ts` (CMS DOWN → build używa .md). Decyzja
  o usunięciu — po Etapach 6 i 17 (gdy CMS będzie produkcyjnie z backupem).

---

## 2026-04-26 (mini-stage 4b) — Homepage przepięta na CMS

Domknięty Etap 4b z [`docs/PAYLOAD-ROADMAP.md`](docs/PAYLOAD-ROADMAP.md).
Po Etap 4 strony `/aktualnosci/*` szły z Payload, ale homepage
`apps/web/src/pages/index.astro` wciąż używała `getCollection('news')`. Teraz
też wpięta. Cały frontend news czyta z jednego źródła (CMS + fallback .md).

### Changed

- **`apps/web/src/pages/index.astro`** — `getCollection('news', !data.draft).sort(...)`
  → `await fetchNewsList()` (sortowanie już w `cms.ts`). `newsTop3`, `newsTop6`,
  `newsTop11` używane przez 4 szablony (klasyk, marka, magazyn, stadion).
- **`apps/web/src/components/home/MagazineHome.astro`** — typ Props
  `news: CollectionEntry<"news">[]` → `news: NewsItem[]`. Import zmieniony z
  `astro:content` → `@/lib/cms`. Render bez zmian (identyczny shape:
  `post.slug`, `post.data.title`, `post.data.date`, `post.data.cover`, etc.).
- **`apps/web/src/components/home/StadionHome.astro`** — analogiczna zmiana.

### Pominięte (świadomie)

- `teams = await getCollection("teams")` w `pages/index.astro` zostaje bez
  zmian — Teams collection w Payload dopiero w Etapie 7. Po Etapie 8 (migracja
  drużyn) ten kawałek przepniemy w Etapie 8b lub w samym Etapie 7.

### Test

- ✅ **CMS UP:** `curl http://localhost:4321/` zwraca homepage (HTTP 200,
  361 KB). Testowy news z CMS (`testowy-news-z-cms`) pojawia się **4×** w HTML
  — raz na każdy szablon (klasyk/marka/magazyn/stadion). Pliki .md zignorowane.
- ✅ **CMS DOWN** (`kill <pid>` na :3000):
  - `npx astro build` w `apps/web/` → exit 0, `[build] 40 page(s) built in 1.68s`.
  - **3 warningi** `[cms] Niedostępne (...): fetch failed — fallback do .md`
    (1× `/aktualnosci/[slug]`, 1× `/aktualnosci/`, 1× `/`). Etap 4 dawał 2
    warningi, teraz dochodzi 3-ci dla homepage — spodziewane.
  - `dist/index.html` zawiera 11 unikalnych linków `/aktualnosci/<slug>` (z
    `newsTop11`), wszystkie z plików .md, posortowane od najnowszych.

### Po Etap 4b

Cały frontend news (3 strony Astro: homepage `/`, lista `/aktualnosci/`,
single `/aktualnosci/<slug>`) czyta WYŁĄCZNIE z CMS, z gracefulnym fallbackiem
do .md gdy CMS niedostępny. Spójny source of truth. Następny krok: **Etap 5** —
migracja 24 plików `apps/web/src/content/news/*.md` → Payload przez
`gray-matter` + Local API, z mapowaniem markdown body → Lexical.

---

## 2026-04-26 — Etap 4 DONE: Astro odpytuje Payload REST (z graceful fallbackiem)

Wykonany Etap 4 z [`docs/PAYLOAD-ROADMAP.md`](docs/PAYLOAD-ROADMAP.md). Strony
`/aktualnosci/*` zostały przepięte z Astro Content Collections na fetch z
Payload REST API. Najważniejszy element to **graceful fallback** — gdy CMS jest
niedostępny, build/dev używa istniejących plików `.md` jako safety net.

### Decyzje (potwierdzone przed kodowaniem)

- **CMS down → fallback do `.md`** (zamiast fail hard). Build nigdy się nie
  wywali, ostrzeżenie idzie na konsolę. Po Etapie 5 (gdy 24 .md trafią do CMS)
  fallback nadal pełni rolę safety net.
- **Pliki `.md` zostają** do Etapu 5 (wtedy migracja → CMS, dopiero wtedy
  delete). Są też live backupem na czas tego etapu.
- **Lexical → HTML async serializer** (`@payloadcms/richtext-lexical/html-async`),
  HTML wstrzykiwany w Astro przez `<Fragment set:html={...}>` z
  `disableContainer: true`.
- **Zakres tylko `/aktualnosci/*`** (lista + single news). Homepage
  `pages/index.astro` zostaje na `getCollection('news')` do osobnego Etap 4b
  (mniejszy commit = łatwiejszy rollback).
- **Shared types przez `@wks/shared`** (workspace package), re-export
  `News, Tag, Media, User` z `apps/cms/src/payload-types.ts` (frontend nie
  kopiuje typów, tylko re-exportuje).

### Added

- **`packages/shared/index.ts`** — re-export typów z
  `apps/cms/src/payload-types.ts` (`News, Tag, Media, User`). Wpięte przez
  `tsconfig.paths` w `apps/web/tsconfig.json` (`@wks/shared` →
  `../../packages/shared/index.ts`) oraz npm workspaces (root
  `node_modules/@wks/shared` jako symlink do `packages/shared`).
- **`apps/web/src/lib/cms.ts`** — fetcher REST z fallbackiem:
  - `fetchNewsList()` — `GET /api/news?depth=2&limit=500&sort=-date&where[draft][equals]=false`
    z timeout 5s (`AbortSignal.timeout`).
  - Adapter `adaptCmsNews()` mapuje `News` (Payload) → unified `NewsItem`:
    Date z ISO string, `tags: Tag[]` → `string[]` (po nazwach z relacji
    depth=2). Adapter `adaptMdEntry()` analogicznie dla
    `CollectionEntry<'news'>`.
  - Try/catch + sprawdzanie `res.ok` → fallback na `getCollection('news')`
    z konsolowym warningiem `[cms] Niedostępne (...): ... — fallback do .md`.
    Build się NIE wywala.
  - Body w `NewsItem` to dyskryminator: `{type:'lexical', value}` lub
    `{type:'md', entry}` lub `{type:'empty'}` — strona renderuje per-case.
- **`apps/web/src/lib/lexical.ts`** — `lexicalToHtml(body)` używający
  `convertLexicalToHTMLAsync({ data, disableContainer: true })`. Pakiet
  `@payloadcms/richtext-lexical@3.84.1` dodany do `apps/web/package.json`
  (peer-dep `lexical` jest transitive).
- **`apps/web/.env`** (gitignored) + **`apps/web/.env.example`** —
  `CMS_URL=http://localhost:3000`. Komentarze tłumaczą strategię fallback.
- **`apps/cms/scripts/seed-test-news.ts`** — idempotentny seed używający
  Payload Local API (`getPayload({ config }).create(...)`), omija auth.
  Tworzy 1 tag (`seniorzy`, idempotentnie) + 1 news z Lexical body
  (heading H2 + paragraph z bold + bullet list z italic). Repeatable
  narzędzie do dev (np. po `rm cms.db*` można szybko odtworzyć dane testowe).
  Uruchomienie: `npx tsx apps/cms/scripts/seed-test-news.ts`.

### Changed

- **`apps/web/src/pages/aktualnosci/index.astro`** — `getCollection('news')`
  → `fetchNewsList()`. Identyczna prezentacja, zero zmian w
  `NewsCard.astro` (był już agnostyczny wobec źródła danych — przyjmuje
  proste typy: `title`, `date`, `excerpt`, `tags: string[]`...).
- **`apps/web/src/pages/aktualnosci/[slug].astro`** — `getStaticPaths`
  używa `fetchNewsList()`, body renderowane warunkowo:
  - źródło `md` → `<MdContent />` (Astro `entry.render()`),
  - źródło `cms` → `<Fragment set:html={bodyHtml} />` (Lexical → HTML),
  - źródło `empty` → nic.
- **`apps/web/package.json`** — dodane dependencje:
  - `"@wks/shared": "*"` (workspace link),
  - `"@payloadcms/richtext-lexical": "3.84.1"` (Lexical serializer).
- **`apps/web/tsconfig.json`** — `paths` zawiera `@wks/shared` →
  `../../packages/shared/index.ts` (dla edytora i type-checking).
- **`packages/shared/package.json`** — `description` zaktualizowany (typy są
  już używane, nie placeholder).

### Test

- ✅ **CMS UP** (z 1 newsem `testowy-news-z-cms` z seed scriptu):
  - `curl http://localhost:4321/aktualnosci/` → tylko 1 news (`Testowy news z CMS`),
    pliki .md zignorowane (bo CMS odpowiedział).
  - `curl http://localhost:4321/aktualnosci/testowy-news-z-cms/`:
    - `<h2>Pierwszy news z CMS</h2>` ✓
    - `<p>...<strong>/aktualnosci</strong>, integracja działa.</p>` ✓
    - `<ul class="list-bullet"><li>Lista działa</li><li><em>Italic też</em></li></ul>` ✓
    - Header: autor "Seed script" + tag "seniorzy" (z relacji depth=2) ✓
- ✅ **CMS DOWN** (`kill <pid>` na :3000):
  - `npx astro build` w `apps/web/` → exit 0, `[build] 40 page(s) built in 1.62s`.
  - 2 warningi `[cms] Niedostępne (http://localhost:3000): fetch failed — fallback do .md`.
  - `dist/aktualnosci/` zawiera 24 strony z `.md` + `index.html`. Brak
    `testowy-news-z-cms` (bo CMS down, fallback go nie zna).

### Fixed

- **`PAYLOAD_SECRET undefined` w seed scripcie** — `payload.config.ts` czyta
  `process.env.PAYLOAD_SECRET` na top-levelu, a hoisting ESM importów
  powodował, że `dotenvConfig()` ładował env PO importu konfigu. Fix przez
  dynamic import: `dotenvConfig({ path })` najpierw, potem
  `await import('payload')` i `await import('../src/payload.config')`.
- **Tag `Seniorzy` → ValidationError unique slug** w seed scripcie — case
  mismatch z istniejącym `seniorzy` (lowercase) z testów Etap 3. Slugify
  obu daje to samo `'seniorzy'` → kolizja na `unique: true`. Fix:
  `TAG_NAME = 'seniorzy'` (lowercase) → idempotentny lookup znajduje
  istniejący tag.

### Open

- **Etap 4b (homepage)** — `apps/web/src/pages/index.astro` wciąż używa
  `getCollection('news')`. Trzeba przepisać na `fetchNewsList()` przed
  Etapem 5 (migracja .md → CMS), żeby cały frontend był spójnie wpięty
  w jeden source of truth.
- **Etap 5** — migracja 24 plików `apps/web/src/content/news/*.md` →
  Payload przez `gray-matter` + Local API. Dopiero po Etap 5 możemy
  rozważyć usunięcie .md.

---

## 2026-04-25 (szósta tura) — Etap 3 DONE: kolekcje `News` + `Tags` w Payload

Wykonany Etap 3 z [`docs/PAYLOAD-ROADMAP.md`](docs/PAYLOAD-ROADMAP.md):
schema News 1:1 z istniejącym Zod, plus osobna kolekcja Tags z relacją
hasMany (zamiast initially planowanego `select hasMany`). Test 16/16
zaliczony przez REST API.

### Added

- **`apps/cms/src/collections/News.ts`** — kolekcja aktualności klubowych:
  - Pola 1:1 z Zod (`apps/web/src/content/config.ts`): `title`, `date`,
    `excerpt`, `cover`, `coverAlt`, `tags`, `author` (default "Redakcja klubu"),
    `draft` (default false), `facebookUrl`, `truncated`.
  - Nowe pola dla CMS: `slug` (text unique, auto z `title`, możliwy override),
    `body` (richText Lexical — w Astro było to wszystko po `---`).
  - `tags` — `relationship` hasMany do kolekcji Tags (decyzja Tomka — patrz
    Tags poniżej).
  - `facebookUrl` — custom validator z polskimi komunikatami błędów
    ("Niepoprawny URL.", "URL musi zaczynać się od http:// lub https://").
  - Polskie etykiety (`labels.singular.pl`, `labels.plural.pl`, `label.pl`
    na każdym polu) — przygotowanie pod Etap 21 (i18n panelu).
  - `admin.useAsTitle: 'title'`, `defaultColumns: [title, date, draft, updatedAt]`,
    `defaultSort: '-date'` (najnowsze na górze listy w panelu).
  - Pola pogrupowane przez `admin.position: 'sidebar'` (data, draft, slug, tags,
    author w sidebarze; title, excerpt, body, cover/coverAlt, facebookUrl,
    truncated w głównej kolumnie).
- **`apps/cms/src/collections/Tags.ts`** — **rozszerzenie poza pierwotny plan**:
  zamiast `select hasMany` z 14 hardcoded opcjami zrobiliśmy osobną kolekcję
  z relacją (decyzja: redaktor sam dodaje nowy tag bez czekania na admina/push
  do gita). Pola: `name` (unique, indexed), `slug` (auto z `name`, override
  możliwy). Polskie etykiety, `useAsTitle: 'name'`.
- **`apps/cms/src/utils/slugify.ts`** — zero-dep slugify obsługujący polskie
  znaki (`ł→l`, NFD dla diakrytyków `ą→a`, `ę→e`, `ó→o`, `ż→z`, `ć→c`, `ś→s`,
  `ń→n`, `ź→z`) + emoji + limit 100 znaków. Test inline: `"Zwycięska seria
  trwa! 🫡"` → `"zwycieska-seria-trwa"`.
- **Wygenerowane typy TS:** `apps/cms/src/payload-types.ts` (454 linie) —
  interfaces `News`, `Tag`, `User`, `Media` + `*Select` typy do query selecting
  fields. Generowane przez `npm run generate:types`. W Etapach 4-5 będziemy
  je re-exportować z `packages/shared` żeby `apps/web` mogło ich używać.

### Changed

- **`apps/cms/src/payload.config.ts`** — `collections: [Users, Media, News, Tags]`
  (z `[Users, Media]`).

### Test Results (16/16 ✅) — REST API smoke test

CRUD przez `curl` + JWT auth (bez interakcji w przeglądarce, decyzja Tomka):
1-2. ✅ `GET /api/news` i `GET /api/tags` → HTTP 200, kolekcje zarejestrowane.
3-4. ✅ `POST /api/tags` z polskimi znakami: `seniorzy` → slug `seniorzy`,
     `zwycięstwo` → slug `zwyciestwo` (slugify obsługuje diakrytyki PL).
5.   ✅ `POST /api/news` z 11 polami + 2 tagami w relacji + Lexical body →
     HTTP 200, slug auto = `zwycieska-seria-trwa` (z tytułu z polskim znakiem
     + emoji 🫡 prawidłowo zignorowane).
6.   ✅ `PATCH /api/news/1 {slug, draft: true}` — slug nadpisany, draft toggle.
7.   ✅ `POST /api/news` z `facebookUrl: "not-a-url"` → HTTP 400, polski
     komunikat `"Niepoprawny URL."` na ścieżce `facebookUrl`.
8.   ✅ `GET /api/news/1?depth=2` — tags populated z pełnymi obiektami.
9-10. ✅ `GET /api/news?where[draft][equals]=true|false` — filter działa
     po stronie SQLite (`totalDocs: 1` i `0` odpowiednio).
11.  ✅ `DELETE /api/news/1` → HTTP 200, `"Deleted successfully."`.
12.  ✅ `GET /api/news` po delete → `totalDocs: 0`.
13.  ✅ `GET /api/tags` po delete news → `totalDocs: 2` (tagi przeżyły,
     relacja hasMany **nie kaskaduje delete**).
14.  ✅ `sqlite3 cms.db .tables` → tabele: `news`, `news_rels` (junction
     dla relacji), `tags`, `media`, `users`, `users_sessions`, plus systemowe
     Payload (`payload_kv`, `payload_locked_documents`, `_rels`,
     `payload_migrations`, `payload_preferences`, `_rels`).
15.  ✅ `npm run generate:types` → 454 linie z interfaces News/Tag/User/Media.
16.  ✅ Linter: 0 błędów w News.ts, Tags.ts, slugify.ts, payload.config.ts.

### Decisions resolved during this stage

- **Tags strategy (zaproponowane 3 warianty):** Wariant C — osobna kolekcja
  `Tags` z relacją hasMany. Zamiast initially planowanego (Wariant A — `select
  hasMany` z 14 hardcoded opcjami) lub free-text (Wariant B). Powód: redaktor
  może sam dodać nowy tag bez czekania na admina/push do gita.
- **Slug strategy:** Wariant A (najpopularniejszy) — auto z `title` przez hook
  `beforeValidate` z możliwością ręcznego override. Walka z literówkami nie jest
  tu istotna bo to tylko URL.
- **Body editor:** Lexical RichText (default Payload) — WYSIWYG dla redakcji
  bez znajomości markdown. Migracja istniejących .md → Lexical przez serializer
  w Etapie 5.
- **Scope Etap 3:** sam schema + smoke test przez API (decyzja Tomka). Bez
  interakcji w przeglądarce — to przyjdzie w Etapach 4-5 jak będzie front-end
  do CMS-a.

### Fixed

- **Payload push mode + zmiana schema = `SQLITE_ERROR: index ... already
  exists`.** Po dodaniu collections (News, Tags) Payload przy każdym restarcie
  próbuje re-applikować DDL i kolizja z systemowym indexem
  `payload_locked_documents_rels_order_idx`. **Fix:** clean slate dev DB
  (`rm -f apps/cms/cms.db cms.db-journal cms.db-shm cms.db-wal`) + ponowny
  first-user signup (i tak był DEV-only). **W Etapie 17** (deploy production)
  przejdziemy na proper migrations (drizzle-kit migrate generate/run) zamiast
  push mode.
- **Stale dev server po killu** — Next 16 zostawia detached `next-server`
  proces który blokuje port 3000 nawet po `kill <pid_npm>`. **Workaround:**
  zawsze sprawdzać `pgrep -lf "next dev"` przed restartem i killować ALL
  pid-y które jeszcze żyją.

### Open / w kolejnym etapie

- **Etap 4** — Astro odpytuje Payload REST. Zamiast `getCollection('news')`
  z plików .md → `fetch('${PAYLOAD_URL}/api/news?where[draft][equals]=false&sort=-date')`.
  Helper `apps/web/src/lib/cms.ts` z typowanym wrapperem. Test: news dodany
  przez panel widać na localhost:4321/aktualnosci.
- **Etap 5** — migracja 24 istniejących `apps/web/src/content/news/*.md` do
  Payload przez Local API + serializer markdown → Lexical.
- **packages/shared re-export typów** — w Etapie 4 zaczniemy importować typy
  News/Tag z `apps/cms/src/payload-types.ts` przez re-export w
  `packages/shared/index.ts`.
- **i18n panelu (Etap 21)** — wszystkie nowe kolekcje już mają polskie
  etykiety przygotowane (`labels.pl`, `label.pl`). Etap 21 doda tylko Polski
  jako default locale w panelu zamiast English.

---

## 2026-04-25 (piąta tura) — Etap 2 DONE: Payload CMS uruchomiony lokalnie

Wykonany Etap 2 z [`docs/PAYLOAD-ROADMAP.md`](docs/PAYLOAD-ROADMAP.md):
Payload CMS 3 zainstalowany w `apps/cms/`, panel admina działa, pierwszy
admin założony przez API, wszystkie test-case'y zaliczone.

### Added

- **`apps/cms/`** — pełna instalacja Payload przez `npx create-payload-app@latest -n cms -t blank --use-npm --no-agent`:
  - `payload@3.84.1`, `@payloadcms/db-sqlite@3.84.1`, `@payloadcms/next@3.84.1`,
    `@payloadcms/richtext-lexical@3.84.1`, `@payloadcms/ui@3.84.1`,
    `next@16.2.3`, `react@19.2.4`, `sharp@0.34.2`, `graphql@16.8.1`.
  - `src/payload.config.ts` — główny config (Users + Media collections,
    SQLite adapter, Lexical editor).
  - `src/collections/Users.ts` + `Media.ts` — built-in (Media wykorzystamy
    dopiero w Etapie 6).
  - `src/app/(payload)/admin/[[...segments]]/page.tsx` — routing panelu
    `/admin`.
  - `src/app/(payload)/api/[...slug]/route.ts` — REST API (`/api/users/*`,
    `/api/media/*`, itp.).
  - `src/app/(payload)/api/graphql/route.ts` — GraphQL endpoint.
  - `Dockerfile`, `docker-compose.yml` — od dewelopera Payload, do
    wykorzystania w Etapie 17.
  - `playwright.config.ts`, `vitest.config.mts`, `vitest.setup.ts`, `tests/` —
    defaultowe testy z templatu (na razie zostają, w razie kolizji w Etapie 16
    przeglądniemy).
- **`apps/cms/.env`** (gitignored) — `DATABASE_URL=file:./cms.db`,
  `PAYLOAD_SECRET=<32 random hex bytes z openssl rand>`.
- **`apps/cms/.env.example`** — zaktualizowany z domyślnego MongoDB connection
  na nasze SQLite (`DATABASE_URL=file:./cms.db`).
- **Root `.npmrc`** — `legacy-peer-deps=true` (Payload + Next 16 + React 19
  generują nieszkodliwe peer-dep warningi na npm).
- **Root `package.json`** — nowe skrypty proxy: `dev:cms`, `build:cms`,
  `payload`, `generate:types`, `generate:importmap`.
- **Konto admin (DEV ONLY):** `admin@wks-wierzbice.pl` / `WKSadmin2026!` —
  utworzony przez `POST /api/users/first-register`. Zmienić w Etapie 17.

### Changed

- **`apps/cms/next.config.ts`** — dodane:
  - `outputFileTracingRoot: path.resolve(dirname, '../..')` (root monorepo).
  - `turbopack.root: path.resolve(dirname, '../..')` (musi być spójne z
    powyższym, inaczej Next 16 rzuca warning).
  - Bez tych pól Next 16 z Turbopack wywala błąd "couldn't find
    next/package.json" w monorepo (gdzie `next` jest hoisted do root
    `node_modules`).
- **Root `.gitignore`** — rozszerzony o `apps/cms/*.db`, `apps/cms/*.db-journal`,
  `apps/cms/uploads/`, `apps/cms/.next/`. Zachowane stare wpisy `.env*` (sekret
  bezpiecznie ignorowany).
- **Lokalny Node.js** — `nvm install 20.18.0 && nvm use 20.18.0` (domyślny
  alias). Wcześniejsza v25.9.0 była eksperymentalna, Payload 3 oficjalnie
  wspiera Node 20.9+.

### Removed

- **`apps/cms/node_modules/`** (po lokalnej instalacji z `create-payload-app`) —
  usunięte żeby `npm install` z root mógł poprawnie zhostować deps przez
  workspaces. Po `npm install` z root został tylko `apps/cms/node_modules/`
  z 4 pakietami specyficznymi dla cms (`@img`, `@types`, `sharp`, `typescript`).

### Fixed

- **Turbopack w monorepo** — błąd "couldn't find next/package.json" rozwiązany
  przez ustawienie `outputFileTracingRoot` + `turbopack.root` na root monorepo
  (oba muszą mieć identyczną wartość).

### Test Results (5/5 ✅)

1. ✅ `npm run dev:cms` → Next.js Turbopack ready in 268ms na
   `http://localhost:3000`, 0 errors, 0 warnings (po fixie root paths).
2. ✅ `curl http://localhost:3000/admin` → HTTP 200, 55 KB HTML, formularz
   `create-first-user` (email + password + register).
3. ✅ `POST /api/users/first-register` → HTTP 200, message "Successfully
   registered first user.", JWT token, user `id: 1`.
4. ✅ `POST /api/users/login` → HTTP 200, message "Authentication Passed",
   JWT token, sesja zapisana w `cms.db` (160 KB).
5. ✅ `npm run build` (web) → 40 stron Astro built in 1.58s — frontend z
   Etapu 1 nietknięty, monorepo działa zgodnie z planem.

### Decisions resolved during this stage

- **DB nazwa pliku:** `cms.db` (default z create-payload-app), nie `payload.db`
  — mniej tarcia, jeden plik mniej do skonfigurowania w roadmap.
- **Auth provider:** Payload built-in email + password (D5 default), bez OAuth.
- **Port:** `3000` (default Next.js + Payload, bez kolizji z Astro :4321).

### Open / w kolejnym etapie

- **Etap 3** — pierwsza encja domeny: `News` collection 1:1 z istniejącym Zod
  schema z `apps/web/src/content/config.ts`. Test-case: dodanie/edycja/usunięcie
  newsa przez panel + weryfikacja w SQLite.
- **Polskie tłumaczenie panelu** — Payload ma built-in i18n PL ale defaultowo
  używa angielskiego. Przegląd kluczy w Etapie 21 (opcjonalnie wcześniej, jak
  uciąży).
- **Email adapter** — Payload pisze ostrzeżenie `WARN: No email adapter
  provided. Email will be written to console.` Adapter (Resend / SMTP)
  konfigurujemy w Etapie 17 (production).
- **Audit npm** — `14 moderate severity vulnerabilities` (z transitive deps
  Payload). Zostawiamy do przeglądu; Payload regularnie wypuszcza patche, w
  Etapie 17 zrobimy `npm audit fix` przed deployem.

---

## 2026-04-25 (czwarta tura) — Etap 1 DONE: restrukturyzacja monorepo

### Done
- **Etap 1 z `docs/PAYLOAD-ROADMAP.md` zakończony.** Projekt przeniesiony
  z flat layoutu na monorepo z **npm workspaces** zgodnie z architekturą
  z PAYLOAD-ROADMAP.md.

### Decisions (odpowiedzi na pytania przed Etapem 1)
- **Workspace manager:** npm workspaces (zero nowych narzędzi, lockfile już
  był w projekcie).
- **Nazewnictwo:** `apps/web` + `apps/cms` + `packages/shared` (proste,
  zgodne z roadmap).
- **Node.js:** 20.18.0 LTS (`.nvmrc` + `engines.node ">=20.0.0"` w root
  `package.json`). Tomek aktualnie ma v25.9.0 — kompatybilne, testy
  przeszły, ale rekomendacja `nvm use` dla spójności.
- **Bezpieczeństwo:** `git init` + commit baseline przed restrukturyzacją.
  Dotychczas projekt nie był pod kontrolą wersji — to pierwszy commit.
- **Test acceptance:** pełen scope (dev + build + sync + 4 szablony).

### Added
- Root `package.json` z `workspaces: ["apps/*", "packages/*"]` + skróty
  `npm run dev/build/sync:season/preview` wywołujące `--workspace=web`.
- Root `.nvmrc` z `20.18.0`.
- `apps/cms/package.json` — placeholder dla Payload (setup w Etapie 2).
- `packages/shared/{index.ts,package.json}` — placeholder dla typów
  generowanych przez `payload generate:types` (Etap 4).
- `.gitignore` rozszerzony o `payload.db`, `apps/cms/uploads/`, `.next/`,
  `.env.local`.
- Sekcja "Struktura monorepo" na początku `CLAUDE.md` wyjaśniająca, że
  wzmianki o `src/...` w reszcie dokumentu = `apps/web/src/...` (zamiast
  kilkudziesięciu mechanicznych podmian — zachowuje czytelność historii).

### Changed
- Wszystkie pliki frontendu przeniesione przez `git mv` (zachowana
  historia jako rename) z root do `apps/web/`:
  - `src/`, `public/`, `scripts/`, `astro.config.mjs`,
    `tailwind.config.mjs`, `tsconfig.json`, `package.json`.
- `apps/web/package.json` — `name` zmienione z `"club-site"` na `"web"`
  (do `npm run dev --workspace=web`).
- `apps/web/package-lock.json` usunięty — npm workspaces zarządza jednym
  lockfile w root.
- `docs/PAYLOAD-ROADMAP.md` — Etap 1 oznaczony jako `[x] DONE` z notką
  o commitach + test results, sekcja "Stan na 2026-04-25" zaktualizowana.
- `docs/STATE.md` — data ostatniej aktualizacji + nowa sekcja "Postęp
  implementacji" pod RESOLVED-ami z odznaczeniem Etapu 1.

### Test results
- `npm install` w root → 380 paczek, 1 lockfile, OK.
- `npm run dev --workspace=web` → Astro v5.18.1 ready in **504 ms** na
  `localhost:4321`.
- Curl wszystkich routes: `/` 200 (427 KB), `/aktualnosci` 200, `/druzyny`
  200, `/terminarz` 200.
- 4 szablony renderują (`klasyk`, `magazyn`, `marka`, `stadion`)
  potwierdzone przez `data-template-only` na home.
- `npm run sync:season --workspace=web` → 16 drużyn, 240 meczów,
  WKS 2. miejsce / 50 pkt (dane realne z 90minut.pl).
- `npm run build --workspace=web` → **40 stron w 1.35s**, output trafia
  do `apps/web/dist/` (7.1 MB).

### Git history
- `ce94e46` chore: initial commit przed restrukturyzacją monorepo (baseline).
- `aa7a9fd` feat(monorepo): restrukturyzacja do apps/web + apps/cms + packages/shared (Etap 1).

### Następna sesja
- **Etap 2** — `create-payload-app` w `apps/cms/`, adapter SQLite,
  built-in Users z auth (email + password), first-user signup na
  `localhost:3000/admin`.

---

## 2026-04-25 (trzecia tura) — Wybór Payload CMS + monorepo + roadmap 18 etapów

### Decisions
- **D1 (stack panelu admina)** RESOLVED: **Payload CMS 3** (TypeScript, MIT,
  oparty na Next.js 15). Wybrany z 3 finalnych kandydatów porównanych w
  [`docs/STACK-COMPARISON.md`](docs/STACK-COMPARISON.md). Uzasadnienie:
  najlepszy stosunek czas-implementacji do kontroli dla scope WKS (60–80 h
  pełen scope), TS end-to-end zgodne z obecnym Astro stack-iem, gotowy panel
  React + RBAC + upload + REST/GraphQL out-of-the-box.
- **D2 (struktura repo)** RESOLVED: **monorepo** w obecnym `wks_cms`:
  `apps/web/` (obecny Astro frontend), `apps/cms/` (Payload+Next.js),
  `packages/shared/` (typy generowane przez `payload generate:types`).
  Uzasadnienie: jedno git, czysta separacja, type-safety bez ręcznego
  kopiowania definicji.
- **Granularność pracy:** drobne etapy 2–6 h każdy, ~18 etapów łącznie,
  każdy kończy się działającym lokalnie test-case'em (decyzja Tomka
  „testujmy małymi krokami").

### Added
- Nowy dokument [`docs/PAYLOAD-ROADMAP.md`](docs/PAYLOAD-ROADMAP.md) —
  operacyjny plan implementacji panelu admina:
  - Mermaid diagram architektury docelowej (apps/web + apps/cms +
    packages/shared, przepływ danych).
  - Tabela decyzji RESOLVED (D1, D2, D9) + decyzji do podjęcia per etap
    (D3 hosting, D4 db, D5 auth, D6 backup, D7 RBAC, D8 galeria, D10 migracja).
  - **18 etapów w 6 fazach:**
    - **Faza A (Etapy 1–3, ~10–16 h):** monorepo + Payload setup + News
      collection.
    - **Faza B (Etapy 4–5, ~6–10 h):** Astro fetch z CMS REST + migracja
      24 newsów MD → Payload.
    - **Faza C (Etapy 6–8, ~10–16 h):** Media collection + upload + sharp,
      Teams + Players, migracja 5 drużyn.
    - **Faza D (Etapy 9–12, ~12–20 h):** Gallery + siteConfig Global +
      Board/Staff/Sponsors + HeroSlides/StaticPages.
    - **Faza E (Etapy 13–16, ~14–20 h):** refactor sync-90minut na TS w CMS,
      custom UI button „Odśwież teraz", cron daily, RBAC Wariant A
      (admin/redaktor/trener).
    - **Faza F (Etapy 17–18, ~12–20 h):** VPS deploy + migracja
      SQLite→Postgres + Caddy/HTTPS, backup automatyczny pg_dump→Backblaze B2.
  - 6 etapów opcjonalnych po MVP (RBAC Wariant B, galeria z albumami,
    polskie tłumaczenie panelu, branding klubu, audit log, szkolenie redakcji).
  - Każdy etap ma checkbox `[ ]` do odznaczania, sekcję „Co robimy",
    konkretny test-case do sprawdzenia, decyzje do podjęcia przed startem.
  - Mermaid graph kolejności i zależności między etapami.

### Changed
- [`docs/ADMIN-PANEL.md`](docs/ADMIN-PANEL.md):
  - **D1 (stack)** zmieniona z „zawężone do 3 kandydatów" → **RESOLVED:
    Payload CMS 3** + link do roadmap.
  - **D2 (struktura repo)** zmieniona z otwartej decyzji → **RESOLVED:
    monorepo** z opisem struktury folderów i uzasadnieniem.
  - Dodana nowa sekcja **„Plan implementacji"** wskazująca
    `PAYLOAD-ROADMAP.md` jako główny dokument operacyjny + skrótowy podział
    18 etapów na 6 faz.
- [`docs/STATE.md`](docs/STATE.md):
  - Data ostatniej aktualizacji → 2026-04-25 (wybór Payload + monorepo).
  - Sekcja „Wariant 2 / Panel admina" — dodane 3 RESOLVED (D1, D2, D9
    skondensowane), usunięty rozwlekły opis scope (jest w ADMIN-PANEL.md
    i PAYLOAD-ROADMAP.md), dodana lista decyzji rozstrzyganych per etap
    z defaultami.
  - „Otwarte pytania / decyzje" — D1 i D2 zmienione z 🔴 na 🟢 RESOLVED,
    D7 RBAC zaktualizowany (rozstrzyga się w Etapie 16, default Wariant A).
  - „Następne kroki / wariant 2" — link do `PAYLOAD-ROADMAP.md` jako
    operacyjny plan, skrótowy podział na 6 faz zamiast porównania stacków.

### Open (do podjęcia per etap roadmap)
- **D3 (hosting):** Etap 17 — wstępnie Hetzner CX22 (~5 EUR/mies.).
- **D4 (baza):** Etap 2 (SQLite dev) → Etap 17 (Postgres 16 prod).
- **D5 (auth):** Etap 2 — wstępnie Payload built-in email + password.
- **D6 (backup):** Etap 18 — wstępnie pg_dump cron + Backblaze B2,
  retention 30 dni.
- **D7 (RBAC):** Etap 16 — wstępnie Wariant A (3 sztywne role
  admin/redaktor/trener), Wariant B jako opcjonalny etap 19.
- **D8 (galeria):** Etap 9 — wstępnie Wariant 1 (płaska lista),
  albumy jako opcjonalny etap 20.
- **D10 (migracja MD→DB):** rozproszona na Etapy 5, 8, 10, 11 (skrypty
  seed używające Payload Local API).

### Następna sesja
- **Etap 1: restrukturyzacja monorepo.** Przed startem Tomek odpowiada na
  pytania: workspace manager (npm/pnpm/yarn?), wersja Node.js do
  ustabilizowania (Payload 3 wymaga 20+).

---

## 2026-04-25 (druga tura) — Scope RESOLVED + zawężenie stacku do 3 kandydatów

### Added
- Nowy dokument [`docs/STACK-COMPARISON.md`](docs/STACK-COMPARISON.md) —
  1-pager decyzyjny porównujący 3 finalnych kandydatów stacku panelu admina:
  - TL;DR + rekomendacja (Payload CMS 3 jako balans czas/kontrola).
  - Macierz decyzyjna: 14 kryteriów × 3 stacki (time-to-admin, estymata
    dla pełnego scope, język, panel, RBAC, upload, hooki, hosting,
    sposób czytania danych z Astro, vendor lock, future-proof).
  - Per stack: czym jest, przykład kolekcji `news` w kodzie, jak Astro
    frontend pobiera dane, opis panelu (z linkami do oficjalnych
    screenshotów/demo), plusy dla WKS, minusy/ryzyka, estymata dla pełnego
    scope rozbita na komponenty, kiedy wybrać.
  - Sekcja „Decyzja — jak wybrać" z 5 kierunkowymi pytaniami.
  - „Co dalej po wyborze" — jak wybór wpływa na D2 (repo), D3 (hosting),
    D5 (auth), D7 (RBAC), D8 (galeria), D6 (backup).

### Changed
- **D9 (scope encji) RESOLVED.** Tomek zdecydował: pełen scope, wszystkie
  encje z OFERTA.md Q5 + dzisiejsza wiadomość edytowalne z panelu, bez
  fazowania. Konsekwencja: estymaty stacków przeliczone na pełen scope
  (w STACK-COMPARISON.md).
- **D1 (stack) — kandydaci zawężeni z 5 do 3:**
  - Payload CMS 3 (60–80 h pełen scope, rekomendacja Claude'a),
  - Directus (40–60 h, max-speed),
  - Astro SSR + custom panel (130–180 h, max-control).
  - **Pominięci:** Supabase (vendor lock + i tak własny panel),
    Laravel + Filament (drugi język — PHP — obok obecnego TS).
- [`docs/ADMIN-PANEL.md`](docs/ADMIN-PANEL.md):
  - sekcja „Funkcje" przepisana — 11 grup encji jako potwierdzony scope,
    bez sekcji „do potwierdzenia",
  - CRUD matrix uzupełniona: `board`, `staff`, `sponsors`, `hero`,
    `site-config`, `static-pages` jako pełnoprawne wpisy (nie opcjonalne),
  - D1 przepisane: macierz 3 kandydatów + lista pominiętych z
    uzasadnieniem + link do STACK-COMPARISON.md,
  - D9 oznaczone jako RESOLVED z datą decyzji.
- [`docs/STATE.md`](docs/STATE.md):
  - sekcja „Wariant 2 / Panel admina" — scope (D9) oznaczony jako RESOLVED,
  - „Otwarte pytania" pod D1 zaktualizowane: 3 kandydaci zamiast 5,
    estymaty dla pełnego scope, link do STACK-COMPARISON.md,
  - roadmap „Jeśli klub wybierze wariant 2" — lista 3 stacków zamiast 5
    z notką o pominiętych.

### Open
- **D1 (stack) — Tomek wybiera po przeczytaniu STACK-COMPARISON.md.**
  Wszystkie inne otwarte decyzje (D2 repo, D3 hosting, D5 auth, D6 backup,
  D7 RBAC, D8 galeria, D10 migracja) najlepiej rozstrzygnąć po wyborze
  stacku — rekomendacje per stack różnią się.

### Note
- Nadal bez zmian w kodzie. Tylko aktualizacja dokumentacji.

---

## 2026-04-25 — Decyzja kierunkowa: dodajemy panel admina (CMS)

### Added
- Nowy dokument planistyczny [`docs/ADMIN-PANEL.md`](docs/ADMIN-PANEL.md) —
  główne źródło prawdy dla Wariantu 2 (CMS). Zawiera:
  - listę funkcji panelu (logowanie, zarządzanie userami + uprawnienia,
    CRUD aktualności / drużyny+zawodnicy / galeria, „odśwież" 90minut),
  - tabelę CRUD matrix per encja per rola,
  - 3 warianty modelu RBAC (sztywne role / role + override / pełny RBAC) —
    rekomendacja Wariant B,
  - 2 warianty modelu galerii (płaska lista / albumy) — rekomendacja
    Wariant 1 z gotowością na migrację,
  - 10 otwartych decyzji technicznych (D1–D10): stack, repo, hosting,
    baza, auth, backup, RBAC, model galerii, scope encji, migracja.
- Sekcja „Wariant 2 / Panel admina" w [`docs/STATE.md`](docs/STATE.md).
- 3 nowe „Otwarte pytania / decyzje" w STATE.md: stack panelu (D1),
  struktura repo (D2), model RBAC (D7).
- Link do `ADMIN-PANEL.md` w roadmapie STATE.md („Jeśli klub wybierze
  wariant 2") + lista 5 kandydatów stacku z estymatami.
- Status w [`README.md`](README.md): „Wersja 2 (z panelem admina) — w
  planowaniu" + sekcja „Roadmapa" rozbudowana.

### Changed
- Tomek 2026-04-25 wskazał, że uprawnienia mają być **elastyczne**
  („admin nadaje poszczególne uprawnienia"). To odbiega od 3 sztywnych
  ról z [`docs/OFERTA.md`](docs/OFERTA.md) Q6 (Admin/Redaktor/Trener).
  Decyzja o modelu RBAC pozostaje otwarta (D7 w `ADMIN-PANEL.md`).
- Scope CMS-a w wiadomości Tomka jest węższy niż w OFERTA.md Q5 —
  brakuje `BOARD`, `STAFF`, `SPONSORS`, `HERO_SLIDES`, `site.ts`,
  statycznych podstron. Do potwierdzenia w osobnej sesji.

### Open
- **🔴 D1 — wybór stacku panelu admina.** 5 kandydatów (Payload CMS 3,
  Astro SSR + custom, Directus, Supabase + mini-panel, Laravel + Filament).
  Tomek odłożył decyzję — bez niej nie ruszamy kodu.
- **🔴 D2 — struktura repo.** Same / monorepo / osobne repo.
  W OFERTA.md Q5 wstępnie „osobny folder" — do potwierdzenia.
- **🟠 D7 — model RBAC.** Wariant A/B/C, rekomendacja B.
- **🟡 D3–D6, D8–D10** — hosting, baza, auth, backup, model galerii,
  scope encji, migracja Markdown→DB. Decydowane po D1.
- **Ekonomia** z OFERTA.md Q14 (5–10k PLN za 120–200h) wciąż
  niezbalansowana — wybór Payload/Directus skraca implementację 2–3×
  i może przybliżyć projekt do realnego budżetu.

### Note
- Kod nie został zmieniony. Ta sesja to **wyłącznie aktualizacja
  dokumentacji** — `package.json`, `astro.config.mjs`, `src/` bez ruchu.
- [`CLAUDE.md`](CLAUDE.md) (architektura strony statycznej) bez zmian —
  pozostaje aktualny dla obecnego frontendu. CMS dostanie własny
  `CLAUDE.md` (lub sekcję) po wyborze stacku.

---

## 2026-04-22 — Review szablonów + krytyczny fix CSS

(Wpis dodany 2026-04-20 wg systemu, ale numerowany jako kolejna sesja po
2026-04-21 dla zachowania chronologii „najnowsze na górze".)

### Fixed
- **Krytyczny bug ukrywania nieaktywnych templates.** Reguły CSS w
  `src/styles/global.css` (linie 167–181) ukrywały tylko parę `klasyk ↔ marka`
  — selektory dla `magazyn`/`stadion` nie istniały. Skutek: na localhoście
  wszystkie 4 warianty home renderowały się jednocześnie pod sobą, co wyglądało
  jak całkowicie zepsuty layout (Tomek myślał, że „ruszałem klasyka" — w
  rzeczywistości widział klasyka z naklejonymi pod nim resztami). Rozszerzono
  blok do pełnej macierzy 4 × 4 (12 selektorów `display: none !important`).
  Weryfikacja Browser MCP: `offsetHeight > 0` ma dokładnie 1 element po
  reload dla każdego ustawienia `localStorage.wks-template`.

### Open
- Pełny raport z review w nowym pliku [`docs/REVIEW-2026-04-20.md`](docs/REVIEW-2026-04-20.md).
- Kluczowe TODO przed pokazaniem zarządowi (sesja A, ~1–2h):
  1. Header (i footer) nie reaguje na dark mode magazynu.
  2. `/o-klubie` ma losowe nazwiska zarządu/trenerów zamiast realnych
     (zdjęcia w `public/team/zarzad/` + `public/team/trenerzy/` są realne
     i czekają nieużywane).
  3. Stadion: niespójność pozycji 1 vs 2 między LED scoreboard a hero.
- Reszta (countdown card responsywny w marka, kosmetyka magazyn/stadion,
  sponsorzy placeholdery, kadra zawodników redesign) — szczegóły w REVIEW.

---

## 2026-04-21 — Propozycje 3 szat (Q1) + struktura prezentacji (Q13)

### Changed
- `docs/OFERTA.md` Q1 — domknięte wstępnie. Tomek podesłał 4 referencje
  (Śląsk Wrocław, Lech Poznań, Legia Warszawa, Wisła Kraków). Claude
  przeanalizował Lech/Legię/Wisłę (Śląsk — WebFetch timeout, do retry).
  **Decyzja kolorystyczna:** zielony/biały/czerwony (od Śląska) zostaje
  bez zmian. **Zmieniamy tylko strukturę/layout.**
- Dodane 3 propozycje szat strukturalnych:
  - **Szata A — „Klubowa klasyka"** (inspiracja Lech): hero = następny
    mecz, news grid 3-kolumnowy, kafle drużyn, ok. 8h wdrożenia.
  - **Szata B — „Magazyn klubowy"** (inspiracja Legia): hero = featured
    news, news asymetryczny (1+4), drużyny jako pasy, ok. 12h.
  - **Szata C — „Dumna marka"** (inspiracja Wisła + Lech): hero =
    slider brandowy, CTA rekrutacyjny w hero, karty portretowe drużyn,
    ok. 16h.
- Obserwacja: Wisła jest e-commerce (Shopify-like), nie pasuje dla WKS
  (brak sklepu); wzięliśmy tylko „duży herb + zwarty nav".
- `docs/OFERTA.md` Q13 — struktura prezentacji rozpisana (11 slajdów,
  HTML reveal.js lub PDF, bez animacji). Gotowa do wygenerowania po
  akceptacji Tomka.
- `docs/STATE.md` — zaktualizowany status Q1 i Q13. Roadmapa krótkoterminowa
  rozszerzona o 2 nowe kroki (wybór szaty, retry Śląska, generowanie
  prezentacji).

### Context
- Kolory zielony/biały/czerwony są dziedzictwem klubu (WKS = analogia do
  WKS Śląsk Wrocław) — nie są negocjowalne.
- Tomek zaakceptował brak animacji w prezentacji → format reveal.js lub
  PDF w pełni statyczny.
- Propozycje 3 szat są celowo różne „filozoficznie" (mecz vs. news vs.
  marka), nie tylko kosmetycznie, żeby klub miał realny wybór na spotkaniu.

---

## 2026-04-21 — Runda 2 decyzji Tomka (Q13–Q16) + flaga ekonomiczna

### Changed
- `docs/OFERTA.md` — sekcja „Decyzje Tomka" rozszerzona o Q13–Q16:
  - **Q13 (materiały):** prezentacja multimedialna + live demo + 3 szaty +
    mockup CMS + PDF porównujący warianty + checklist dla klubu.
  - **Q14a (cena wariant 1):** 2 000 – 4 000 PLN.
  - **Q14b (cena wariant 2):** 5 000 – 10 000 PLN. **Flaga 🔴 w OFERTA.md:**
    to ~50–83 PLN/godz. przy 120–200h pracy — realnie prezent rodzinny,
    nie zlecenie komercyjne. Tomek musi świadomie zdecydować przed
    spotkaniem (podnieść widełki / ściąć scope / zaakceptować jako prezent).
  - **Q15 (deadline):** bez sztywnego deadline'u (relacja rodzinna).
    Sugestia nieformalnego deadline'u w głowie, nie na papierze.
  - **Q16 (negocjacje):** raty + symboliczny rabat, bez cięcia scope.
    Uwaga: przy dolnej granicy Q14b już nie ma z czego ciąć.
- Sekcja „Jeszcze do domknięcia" usunięta (wszystko zamknięte).
- Sekcja TODO przepisana: priorytet na (a) decyzję „zlecenie vs. prezent",
  (b) referencje do Q1, (c) strukturę prezentacji, (d) PDF i checklistę.
- `docs/STATE.md` — flaga strategii zmieniona z 🟡 na 🟢, dodana osobna
  flaga 🔴 „Ekonomia wariantu 2". Roadmapa krótkoterminowa przepisana.

### Context
- Prezentacja multimedialna jako główny materiał na spotkanie — Tomek bierze
  laptopa, pokazuje live + slajdy z wizją wariantu 2.
- Ekonomiczna dysproporcja w Q14b wyłapana przez Claude'a i zapisana jako
  ostrzeżenie zamiast przemilczana. Decyzja po stronie Tomka, bez ciśnienia.

---

## 2026-04-21 — Runda 1 decyzji Tomka w OFERTA.md

### Changed
- `docs/OFERTA.md` — sekcja „Otwarte pytania" zastąpiona sekcją „Decyzje Tomka
  (runda 1)". Zamknięte Q1–Q12:
  - **Q1 (szaty):** decyzja po obejrzeniu linków referencyjnych, które Tomek
    podeśle; Claude analizuje Browser MCP i proponuje 3 kierunki.
  - **Q2 (co dostaje klub):** tylko dostęp do hostingu. Bez repo, bez zipa,
    bez instrukcji. Ryzyko zapisane jako ostrzeżenie.
  - **Q3 (demo):** klub dostarcza realne dane, Tomek podmienia w cenie.
  - **Q4 (support wariantu 1):** dożywotnio, bo rodzina. Tomek kasuje tylko
    za wdrożenie.
  - **Q5 (encje CMS):** bardzo szeroki scope — news, teams, board, sponsors,
    gallery, config, pages, matches. Pominięty tylko hero.
  - **Q6 (role):** 3 role (admin / redaktor / trener z dostępem do swojej
    drużyny).
  - **Q7 (90minut):** hybryda — cron + przycisk „odśwież teraz".
  - **Q8 (uploady):** na dysk. Auto-optymalizacja jako nice-to-have.
  - **Q9 (backup):** automatyczny cron na zewnętrzny storage (B2/S3).
  - **Q10 (hosting wariantu 2):** VPS, klub kupuje, Tomek setupuje.
  - **Q11 (support wariantu 2):** tak samo jak Q4 — rodzinnie.
  - **Q12 (wycena):** stała cena za każdy wariant.
- Dodana sekcja „Jeszcze do domknięcia (runda 2)" z pytaniami Q13–Q16
  (bez odpowiedzi w rundzie 1).
- `docs/STATE.md` — sekcja „Otwarte pytania" zaktualizowana: flaga 🔴 zmieniona
  na 🟡 (częściowo zamknięte). Roadmapa krótkoterminowa przepisana — priorytet
  na Q14 (widełki cenowe — bez tego nie ma cennika) i linki referencyjne do Q1.

### Context
- Wariant 2 okazuje się dużym projektem (8 encji × 3 role × cron × VPS).
  Realny estymat: 120–200h pracy, wymaga przemyślanej wyceny.
- Relacja Tomek ↔ klub jest rodzinna (teść-prezes), co wpływa na decyzje
  supportowe (dożywotnio vs. SLA) i cenowe (rodzinna taryfa). W OFERTA.md
  zaznaczono ryzyka relacyjne — warto mieć granice spisane osobno.

---

## 2026-04-21 — Strategia dwutorowa oferty dla klubu (teoria)

### Added
- `docs/OFERTA.md` — dokument planistyczny przed spotkaniem z zarządem klubu
  (21-22.04.2026). Zawiera: założenia Tomka (dwa warianty produktu — tani/drogi),
  obserwacje i ostrzeżenia, 16 otwartych pytań pogrupowanych po wariantach,
  TODO przed spotkaniem, miejsce na wpisanie decyzji po spotkaniu.

### Changed
- `docs/STATE.md`:
  - Doprecyzowany opis hostingu produkcyjnego: tmielczarek.pl to **serwer domowy
    Tomka**, nie shared hosting. Tymczasowy — klub kupi własny jeśli kupi stronę.
  - Sekcja „Otwarte pytania" — dodana czerwona flaga „wariant 1 vs. wariant 2"
    (odsyła do OFERTA.md).
  - Sekcja „Następne kroki" — przepisana. Wyjęty stary plan migracji na
    Sanity + Vercel (odrzucony przez Tomka — preferencja „własny CMS").
    W zamian: rozdzielenie roadmapy wg decyzji klubu (wariant 1 / wariant 2 /
    zwlekanie).

### Context
- Tomek preferuje **własny CMS** (nie SaaS) — motywacja: control, zero
  zależności od zewnętrznej firmy.
- Wstępnie rozważane stacki dla wariantu 2: Payload CMS (self-hosted),
  Astro SSR + własny admin, Laravel + Filament + Astro.
- Decyzja o stacku — dopiero po decyzji klubu. Tryb: **teoria, zero kodu**.

---

## 2026-04-21 — Decyzja: seniorzy pozostają z realnymi danymi

### Changed
- Potwierdzona decyzja — skład seniorów zostaje w obecnym kształcie (21 realnych
  zawodników + kapitan Kacper Nowicki = 22). Nie przepisujemy na losowe dane,
  mimo że pierwotna prośba o demo-fill mówiła „22 losowych w każdej drużynie".
  Powód: dane seniorów są osadzone w aktualnościach (Alefe Lima, Kamiński,
  Marciniszyn, Felipe itd.) — ich rozspójnienie z treścią byłoby kosztowne.
- Zamknięte otwarte pytanie w `docs/STATE.md`.

---

## 2026-04-21 — Usunięcie katalogu `deploy/`

### Removed
- `deploy/docker-compose.yml`, `deploy/nginx.conf`, `deploy/README.md` oraz sam
  katalog `deploy/`. Reliktowy setup z czasów demo na home-serwerze
  (nginx + ngrok). Od migracji na tmielczarek.pl nieużywany, tylko mylił
  potencjalnego nowego czytelnika projektu.

### Changed
- Zamknięte otwarte pytanie w `docs/STATE.md`.

---

## 2026-04-21 — Wypełnienie danych demo + konwencja dokumentacji

### Added
- `CHANGELOG.md` (ten plik) — chronologiczny log.
- `docs/STATE.md` — aktualny snapshot stanu, otwarte pytania, next steps.
- Seksja w `CLAUDE.md` o tym, gdzie szukać kontekstu przed pracą.
- Nowe pełne składy drużyn młodzieżowych — po 22 zawodników (pozycje + numery
  koszulek) w `juniorzy.md`, `trampkarze.md`, `orliki.md`, `zaki.md`. Dane
  losowe — do podmiany przez klub.
- Trenerzy + asystenci w 4 drużynach młodzieżowych (dane losowe).
- Kapitan **Kacper Nowicki** dopisany do składu seniorów (z newsów FB) — rozwiązuje
  brak obecnego w aktualnościach zawodnika. Seniorzy teraz liczą 22 osoby.

### Changed
- **`README.md`** — napisany od zera. Wyrzucone odniesienia do Decap CMS,
  Formspree, laczynaspilka.pl, GitHub Actions + FTP, Docker/ngrok. Nowa wersja
  opisuje realny stan: Astro 5, 90minut.pl sync, kolekcje Markdown, hosting
  tmielczarek.pl, sekcja „Demo vs. dane realne", roadmapa (Sanity + Vercel).
- `SPONSORS` w `src/config/site.ts` — 5 placeholderów typu „Sponsor główny A"
  zamienione na wymyślone firmy regionalne (*ABM System*, *Zielona Dolina*,
  *Piekarnia Wierzbicka*, *Autoserwis Dolny Śląsk*, *Cafe Tarnopolska*).
  Gmina Kobierzyce pozostaje realna. Loga dalej są placeholderami SVG.

### Open
- Katalog `deploy/` (Docker + nginx + ngrok) jest nieużywany od migracji na
  tmielczarek.pl — decyzja o skasowaniu czeka na potwierdzenie użytkownika.
- Seniorzy: teoretycznie prośba była „22 losowych w każdej drużynie", ale
  zdecydowałem zostawić realne dane (są w aktualnościach). Do ewentualnej rewizji.

---

## 2026-04-20 — Migracja na hosting tmielczarek.pl

### Added
- Strona opublikowana pod `https://wkswierzbice.pl` na współdzielonym hostingu
  `tmielczarek.pl` (HTTPS via Let's Encrypt po stronie hostingu).

### Changed
- `<title>` w `BaseLayout.astro` — użyty `SITE.shortName` ("WKS Wierzbice")
  zamiast długiej „Wiejski Klub Sportowy Wierzbice – Zielono-biało-czerwoni…".
  Zakładki przeglądarki teraz krótkie i czytelne.

### Removed
- **Porzucony setup home-serwer + Docker + ngrok** — poprzedni mechanizm wystawienia
  demo (kontener `nginx:alpine` + tunel ngrok). Zastąpiony zwykłym FTP/rsync na
  hosting współdzielony.
- (do decyzji) katalog `deploy/` z tamtego okresu nadal w repo.

---

## ~2026-04-19 — Import aktualności z fanpage Facebook

### Added
- 24 artykuły Markdown w `src/content/news/` zaciągnięte z fanpage
  `facebook.com/WKSWIERZBICEOFFICIAL` (wiosna 2026, runda wiosenna).
  - **8 pełnych** wpisów (`truncated: false`) — pełny tekst pobrany przez
    Browser MCP z permalinków `mbasic.facebook.com`, własne zdjęcie w `public/news/`.
  - **16 skróconych** wpisów (`truncated: true`) — pierwsza linijka + CTA
    „Pełny wpis na Facebooku", cover = `/herb-wks.png`.
- Rozszerzony schemat kolekcji `news` w `src/content/config.ts`:
  - `facebookUrl` (URL do oryginalnego posta FB),
  - `truncated` (flaga decydująca o treści CTA).
- `NewsCard.astro`: pill „z Facebooka" (kolor FB) pokazywana gdy post ma `facebookUrl`.
- `aktualnosci/[slug].astro`: CTA box „Zobacz na Facebooku" / „Pełna treść na Facebooku".
- Skrypty jednorazowe w `scripts/`:
  - `fetch-fb-meta.mjs` — scrap OG metadanych z `mbasic.facebook.com`
  - `generate-news.mjs` — merge źródeł → Markdown
  - `apply-news-covers.mjs` — podmiana `cover:` + `coverAlt:` po uzupełnieniu `public/news/`

### Changed
- **`NewsCard.astro`** — redesign z „magazine overlay" na klasyczny layout
  (zdjęcie na górze, tekst pod). Obraz `object-contain` w kontenerze `aspect-[4/3]`
  (nie ucina twarzy/elementów kompozycji) — reakcja na feedback użytkownika.
- **`aktualnosci/[slug].astro`** — główne zdjęcie artykułu zmienione z
  `aspect-[16/9] object-cover` na `max-h-[70vh] w-auto object-contain` — zdjęcie
  pokazywane w pełni, bez ucinania, na szarym tle z cieniem.

### Removed
- 7 starych Markdown-ów aktualności (placeholdery wstawione przy inicjalnym
  bootstrapie) — zastąpione prawdziwą treścią z FB.

---

## ~2026-04-15 — Integracja z 90minut.pl

### Added
- `scripts/sync-90minut.mjs` — scrap danych sezonu z trzech URL-i 90minut.pl
  (profil klubu, tabela ligi, mecze drużyny). Zapisuje do `src/data/season.json`.
- `src/data/season.json` — generowany JSON z terminarzem WKS, tabelą grupy
  wrocławskiej Klasy okręgowej, osiągnięciami. Nie edytujemy ręcznie.
- `prebuild` hook w `package.json` — `npm run sync:season` odpala się przed
  `npm run build`.
- Strona `/terminarz` przerobiona na dynamiczne renderowanie z `season.json`:
  najbliższy mecz, ostatni wynik, pełen terminarz WKS, tabela ligi, osiągnięcia.
- Komponenty `ScoreBanner.astro` i `MatchCountdown.astro` na stronie głównej.

### Changed
- Stara sekcja info-baru na `index.astro` zastąpiona `ScoreBanner` +
  `MatchCountdown` (live odliczanie do najbliższego meczu, setInterval 1 s).
- Liczby na stronie głównej („Najważniejsze liczby") napędzane `HIGHLIGHTS`
  z `site.ts` + animowane przez `IntersectionObserver` (count-up).

### Fixed
- `parseStandings` w sync-90minut.mjs pierwotnie zwracał 32 drużyny zamiast 16 —
  doprecyzowany filtr wierszy tabeli.
- Wyniki meczów wyjazdowych w `season.json` były z perspektywy przeciwnika —
  `buildWksOverview` przeformułowany: `scoreLabel` (my:oni) i osobny
  `homeAwayLabel`.

---

## ~2026-04-10 — Rozbudowa strony i sekcje klubowe

### Added
- Sekcja **Zarząd** w `site.ts` (`BOARD`) + zdjęcia w `public/team/zarzad/`
  (6 osób, skład powołany 08.07.2025 po śmierci śp. Bogdana Zdunka).
- Sekcja **Sztab szkoleniowy** (`STAFF`) + zdjęcia w `public/team/trenerzy/`
  (Dawid Pożarycki, Mateusz Rycombel).
- Rozbudowana strona `/o-klubie`: historia, „Pamięci śp. Bogdana Zdunka",
  linia czasu „Droga przez dekady", dynamiczne sekcje Sztab/Zarząd z `site.ts`.
- Karuzela Hero z `HERO_SLIDES` (autoplay 5 s, prev/next, dots) — zamiast
  statycznego banera.
- Animacje count-up dla `.stat-number` na stronie głównej.
- JSON-LD `SportsOrganization` w `BaseLayout.astro` (SEO).
- OG/Twitter card meta tags.

### Changed
- `Header.astro` — `sticky top-0`, `bg-brand-ink`, aktywne linki z czerwonym
  podkreśleniem.
- `Footer.astro` — 4-kolumnowy layout (brand, nav, kontakt, Społeczność FB).

---

## ~2026-04 (początek) — Bootstrap projektu

### Added
- Świeży projekt Astro 5.18 + Tailwind 3.4 + TypeScript (strict) + aliasy `@/*`.
- Fonty self-hosted: Inter Variable (body) + Barlow Condensed (display).
- Content collections: `news` i `teams` z schematami Zod.
- Strony: `/`, `/o-klubie`, `/druzyny`, `/druzyny/[slug]`, `/terminarz`,
  `/aktualnosci`, `/aktualnosci/[slug]`, `/galeria`, `/kontakt`, `/nabory`,
  `/sponsorzy`, `/polityka-prywatnosci`, `/404`.
- Centralna konfiguracja `src/config/site.ts` z sekcjami SITE, CONTACT, SOCIAL,
  STATS, NAV, STAFF, BOARD, HIGHLIGHTS, SPONSORS, HERO_SLIDES, GALLERY, FORMS.
- Brandowe kolory w zmiennych CSS (green-800, red-600, brand-ink) działające
  z Tailwindową składnią `/<alpha-value>`.
- Herb klubu `public/herb-wks.jpg`, favicon, `public/og-default.svg`.
- `sitemap.xml` przez `@astrojs/sitemap`.
- `CLAUDE.md` — przewodnik architektoniczny dla AI.
