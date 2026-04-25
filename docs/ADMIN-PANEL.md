# Panel administratora WKS Wierzbice

> Dokument planistyczny dla **Wariantu 2** projektu — strona z panelem CMS.
> Powstał 2026-04-25 jako wynik decyzji Tomka „dodajemy panel admina".
>
> **Status:** W planowaniu. **Nie kodujemy**, dopóki nie zapadną kluczowe
> decyzje techniczne (sekcja „Otwarte decyzje techniczne" niżej).
>
> Powiązane dokumenty: [`OFERTA.md`](OFERTA.md) (Q5–Q11 — scope/ekonomia),
> [`STATE.md`](STATE.md) (aktualny stan projektu), [`../CLAUDE.md`](../CLAUDE.md)
> (architektura strony statycznej — pozostaje aktualna).

---

## Cel

Aktualnie strona WKS Wierzbice jest w 100% statyczna (Astro SSG). Każda zmiana
treści wymaga edycji plików w repo, lokalnego `npm run build` i ręcznego
deployu (`scp dist/` na serwer). To działa, gdy edytuje deweloper — nie działa,
gdy edytować ma redaktor klubu / trener / prezes bez kompetencji technicznych.

Panel admina ma to zmienić: **logowanie przez przeglądarkę → edycja treści →
zapis → strona aktualizuje się automatycznie**, bez udziału dewelopera.

### Funkcje (pełen scope, decyzja Tomka 2026-04-25)

1. **Logowanie do panelu administratora.**
2. **Zarządzanie użytkownikami** — admin dodaje konta i nadaje im uprawnienia.
3. **CRUD treści** z poziomu panelu — pełen zestaw encji z OFERTA.md Q5:
   - **aktualności** (dodaj / edytuj / usuń),
   - **drużyny i zawodnicy** (dodaj / edytuj / usuń),
   - **galeria zdjęć** (upload / usuwanie / kolejność),
   - **wyniki meczów** (przycisk „odśwież teraz" odpalający
     `scripts/sync-90minut.mjs` + automatyczny cron raz dziennie),
   - **zarząd** (`BOARD` — 6 osób + zdjęcia),
   - **sztab szkoleniowy** (`STAFF`),
   - **sponsorzy** (`SPONSORS` — logotypy + tier),
   - **slajdy hero** (`HERO_SLIDES` — karuzela na stronie głównej),
   - **konfiguracja klubu** (`site.ts` — kontakt, social, statystyki, NAV),
   - **statyczne podstrony** (`/o-klubie`, `/nabory`, `/kontakt`,
     `/polityka-prywatnosci`).

> **Status scope:** RESOLVED 2026-04-25 — pełen zakres, bez fazowania.
> Decyzja D9 (sekcja „Otwarte decyzje techniczne" niżej) zamknięta.

---

## Plan implementacji

> **Stack i struktura repo wybrane** (D1, D2 RESOLVED 2026-04-25):
> Payload CMS 3 + monorepo (`apps/web` + `apps/cms` + `packages/shared`).

Operacyjny dokument wykonawczy z 18 etapami (każdy ~2–6 h, kończy się
działającym lokalnie test-case'em): [`PAYLOAD-ROADMAP.md`](PAYLOAD-ROADMAP.md).

Etapy podzielone na 6 faz:

- **Faza A** (Etapy 1–3) — fundament: monorepo + Payload setup + pierwsza encja News.
- **Faza B** (Etapy 4–5) — frontend Astro czyta z Payload + migracja 24 newsów.
- **Faza C** (Etapy 6–8) — media + drużyny + migracja teams.
- **Faza D** (Etapy 9–12) — galeria + siteConfig + board/staff/sponsors + hero/static pages.
- **Faza E** (Etapy 13–16) — integracja 90minut + RBAC.
- **Faza F** (Etapy 17–18) — VPS deploy + backup automatyczny.

Łączna estymata: 60–80 h (zgodne z [`STACK-COMPARISON.md`](STACK-COMPARISON.md)).

Pozostałe decyzje (D3 hosting, D5 auth, D6 backup, D7 RBAC, D8 galeria,
D10 migracja) rozstrzygane per etap — patrz roadmap.

---

## Encje i operacje (CRUD matrix)

> Tabela jest **wstępna** — finalny kształt zależy od decyzji o modelu RBAC
> (sekcja niżej). Role poniżej to założenie startowe z [`OFERTA.md`](OFERTA.md) Q6.

| Encja | Źródło dziś | Admin | Redaktor | Trener |
|---|---|---|---|---|
| `news` (aktualności) | `src/content/news/*.md` | CRUD | CRUD | — |
| `teams` (drużyny WKS) | `src/content/teams/*.md` | CRUD | U | U (tylko swoja) |
| `players` (roster) | `roster[]` w teams | CRUD | U | U (tylko swojej drużyny) |
| `gallery` (zdjęcia) | `GALLERY[]` w `site.ts` + `public/gallery/` | CRUD | CRUD | — |
| `match-sync` (90minut) | `src/data/season.json` (scrape) | trigger sync | — | — |
| `users` + permissions | brak (do utworzenia) | CRUD | — | — |
| `board` (zarząd) | `BOARD` w `site.ts` | CRUD | — | — |
| `staff` (sztab) | `STAFF` w `site.ts` | CRUD | — | — |
| `sponsors` | `SPONSORS` w `site.ts` | CRUD | U | — |
| `hero` (slajdy karuzeli) | `HERO_SLIDES` w `site.ts` | CRUD | — | — |
| `site-config` | reszta `site.ts` (CONTACT, SOCIAL, STATS, NAV, HIGHLIGHTS) | U | — | — |
| `static-pages` | `src/pages/*.astro` (treść `/o-klubie`, `/nabory`, `/kontakt`, `/polityka-prywatnosci`) | CRUD | U | — |

### Uściślenie nazewnictwa „kluby"

W wiadomości Tomka padło „CRUD dla zawodników/klubów". W kodzie i w
[`OFERTA.md`](OFERTA.md) **nie ma encji „kluby"** w sensie listy klubów
ligowych. Są:

- **drużyny WKS** (5 sztuk: seniorzy, juniorzy, trampkarze, orliki, żaki) —
  pliki `src/content/teams/*.md`,
- **tabela ligi z innymi klubami** — generowana automatycznie z 90minut.pl
  do `src/data/season.json`, **nie edytujemy ręcznie**.

Roboczo zakładamy, że Tomkowi chodziło o **drużyny WKS**. Jeśli chodziło o
ręczną edycję pozycji innych klubów w tabeli — do potwierdzenia w osobnej
sesji.

---

## Model uprawnień (RBAC)

W [`OFERTA.md`](OFERTA.md) Q6 było zaplanowane **3 sztywne role**:
**Admin** (wszystko), **Redaktor** (treść), **Trener** (tylko swoja drużyna).

W wiadomości Tomka 2026-04-25 padło: _„admin będzie miał możliwość dodawać
użytkowników i nadawać im poszczególne uprawnienia"_ — co sugeruje
**bardziej elastyczny model**. Stąd 3 warianty do wyboru:

### Wariant A — sztywne role (tak jak w OFERTA.md)
- 3 role (Admin / Redaktor / Trener), zaszyte w kodzie.
- Admin tylko przypisuje rolę nowemu użytkownikowi.
- **Plusy:** prosty model, krótka implementacja (~15h).
- **Minusy:** każda nowa rola = redeploy. Mało elastyczne.

### Wariant B — role + per-zasób override
- 3 role startowe jak wyżej, ale admin może per-użytkownik dodać/odebrać
  konkretne uprawnienie (np. „ten redaktor dodatkowo edytuje sponsorów").
- **Plusy:** elastyczność bez przesady.
- **Minusy:** nieco więcej kodu (~25h), trudniej wytłumaczyć w UI.

### Wariant C — pełny RBAC z permission matrix
- Brak sztywnych ról. Admin tworzy własne role (np. „Trener juniorów
  + galeria"), zaznacza checkboxami uprawnienia per-encja per-akcja
  (`news:create`, `gallery:delete`, `team:update:juniorzy`).
- **Plusy:** maksymalna elastyczność, profesjonalny model.
- **Minusy:** dużo UI (~40h), nadmiarowe dla 3-osobowego zespołu redakcyjnego
  klubu amatorskiego.

**Rekomendacja Claude'a:** Wariant B — odpowiada literze wiadomości Tomka
(„nadawać poszczególne uprawnienia") bez przesadzania w stronę enterprise.

---

## Integracja z 90minut.pl (przycisk „odśwież" + cron)

Aktualnie `scripts/sync-90minut.mjs` jest skryptem CLI uruchamianym ręcznie
(`npm run sync:season`) i automatycznie jako prebuild hook (`npm run build`).
Generuje `src/data/season.json` używany przez `/terminarz` i stronę główną.

W panelu admina:

- **Przycisk „Odśwież teraz"** — admin klika, panel uruchamia sync, pokazuje
  status (idle / w trakcie / sukces / błąd) i timestamp ostatniej
  aktualizacji. Sync musi być **asynchroniczny** (job w tle), żeby admin
  nie czekał 30 s na response.
- **Cron raz dziennie** (np. 06:00 rano) — automatycznie odświeża dane bez
  interwencji.
- **Wymaganie infrastruktury:** serwer musi obsługiwać cron i procesy
  długo żyjące → **VPS, nie shared hosting**. (Patrz [`OFERTA.md`](OFERTA.md) Q10.)

### Pytanie otwarte: czy sync nadpisuje plik czy bazę?

- **Opcja 1:** sync dalej generuje `src/data/season.json`, panel admina
  odpala rebuild + redeploy strony. **Plus:** strona zostaje statyczna.
  **Minus:** rebuild trwa 30–60 s, niezbyt UX-owe dla „odśwież teraz".
- **Opcja 2:** sync zapisuje do bazy danych, strona jest SSR i serwuje
  z bazy w czasie rzeczywistym. **Plus:** instant update.
  **Minus:** zmiana paradygmatu (statyka → SSR), więcej infrastruktury.

Decyzja zależy od wybranego stacku (sekcja niżej).

---

## Galeria zdjęć (model danych)

Aktualnie galeria to placeholdery SVG referowane jako `GALLERY[]` w `site.ts`
(`{ src, alt, caption }`). Do CMS-a trzeba zdefiniować model — dwa warianty:

### Wariant 1 — luźne zdjęcia (płaska lista)
- Każde zdjęcie to pojedynczy rekord (`src`, `alt`, `caption`, `order`,
  `uploadedAt`, `uploadedBy`).
- Filtrowanie/grupowanie tylko po dacie/tagach.
- **Implementacja:** prosta. Pasuje do obecnego layoutu `/galeria`.

### Wariant 2 — albumy
- Album (`name`, `date`, `cover`, `description`) → wiele zdjęć.
- Strona `/galeria` to lista albumów, klik → galeria zdjęć z albumu.
- Np. „Mecz z Polonią Środa 12.04", „Trening juniorów 03.04".
- **Implementacja:** więcej UI (lista albumów, edycja, dodawanie zdjęć
  do albumu), więcej tabel w bazie. Lepsze UX dla klubu z dużą liczbą zdjęć.

**Do decyzji w osobnej sesji.** Wariant 1 jest na start prostszy; do Wariantu 2
można migrować później bez rewrite'u (każde zdjęcie z `albumId = null` =
wariant 1).

### Optymalizacja przy uploadzie

[`OFERTA.md`](OFERTA.md) Q8 sugerował: **resize do max 1600 px + konwersja do
WebP** przy uploadzie (~3 h pracy). Zdecydowanie warto włączyć — bez tego dysk
serwera szybko się zapcha, a strona będzie wolna.

---

## Otwarte decyzje techniczne

> **Wszystkie poniższe są blokerami** — bez ich rozstrzygnięcia nie da się
> rzetelnie wycenić ani zaprojektować schematów bazy.

### D1. Stack backendu i panelu admina — RESOLVED 2026-04-25 (trzecia tura)

**Decyzja Tomka:** **Payload CMS 3** (TypeScript, MIT, headless CMS oparty
na Next.js 15).

Uzasadnienie: najlepszy stosunek czas-implementacji do kontroli dla scope WKS
(60–80 h dla pełnego scope), TS end-to-end zgodne z obecnym Astro stack-iem,
gotowy panel React + RBAC + upload + REST/GraphQL out-of-the-box. Pełen
materiał porównawczy z 3 kandydatami: [`STACK-COMPARISON.md`](STACK-COMPARISON.md).

**Plan implementacji rozbity na 18 etapów:** [`PAYLOAD-ROADMAP.md`](PAYLOAD-ROADMAP.md).

### D2. Struktura repozytorium — RESOLVED 2026-04-25 (trzecia tura)

**Decyzja Tomka:** **Monorepo** w obecnym `wks_cms`:

- `apps/web/` — obecny Astro frontend (SSG).
- `apps/cms/` — nowy Payload CMS 3 + Next.js 15.
- `packages/shared/` — typy TS generowane przez `payload generate:types`,
  importowane przez `apps/web` dla type-safety przy fetch z REST API.

Uzasadnienie: jedno git, czysta separacja, wspólne typy bez ręcznego
kopiowania. Restrukturyzacja obecnego repo to Etap 1 w
[`PAYLOAD-ROADMAP.md`](PAYLOAD-ROADMAP.md).

> Wcześniejsza wstępna decyzja z OFERTA.md Q5 („osobny folder") została
> zaktualizowana — monorepo daje lepszą integrację typów przy minimalnie
> większej restrukturyzacji.

### D3. Hosting docelowy

- **VPS** (OVH SSD / Hetzner / Mikr.us) — ok. 20–40 PLN/mies. Wymaga setupu
  Tomka. (Plan z [`OFERTA.md`](OFERTA.md) Q10.)
- **PaaS** (Vercel / Railway / Render) — szybki deploy, drożej, mniej kontroli.
- **Hybrid** — frontend na Vercel/Cloudflare Pages (statyka), backend na VPS.

### D4. Baza danych

- **Postgres** (klasycznie, najwięcej opcji backupów, hostingu).
- **SQLite** (plik na dysku VPS-a, prosty backup, idealne dla małej skali).
- **MySQL/MariaDB** (jeśli pójdziemy w Laravel + Filament).

### D5. Autoryzacja

- **Email + hasło** (klasyk, własny user table).
- **Magic link** (email-only, bez hasła) — UX-owo prostsze dla mało technicznych
  użytkowników.
- **OAuth** (Google) — najwygodniejsze, ale wymaga że redaktorzy mają konto Google.

### D6. Backup bazy

[`OFERTA.md`](OFERTA.md) Q9: cron + zewnętrzny storage (Backblaze B2 / S3),
retention 30 dni. Do potwierdzenia po wyborze stacku.

### D7. Model RBAC

Wariant A / B / C z sekcji „Model uprawnień" wyżej. **Rekomendacja: Wariant B.**

### D8. Model galerii

Wariant 1 (płaska lista) vs Wariant 2 (albumy). **Rekomendacja: Wariant 1
na start, gotowi na migrację do 2.**

### D9. Scope encji w panelu — RESOLVED 2026-04-25

**Decyzja Tomka:** pełen scope. Wszystkie encje z OFERTA.md Q5 + dzisiejsza
wiadomość = jeden zestaw bez fazowania. `BOARD`, `STAFF`, `SPONSORS`,
`HERO_SLIDES`, `site.ts`, statyczne podstrony — **wszystko edytowalne z panelu**.

Konsekwencja: estymaty stacków w D1 zostały przeliczone na pełen scope
(patrz [`STACK-COMPARISON.md`](STACK-COMPARISON.md)).

### D10. Strategia migracji obecnych treści

Patrz sekcja niżej.

---

## Migracja istniejących treści (Markdown → DB)

Obecnie w repo jest:

- **24 aktualności** w `src/content/news/*.md`
- **5 drużyn** + składy w `src/content/teams/*.md`
- **Dane konfiguracyjne** w `src/config/site.ts` (SITE, CONTACT, BOARD,
  STAFF, SPONSORS, HERO_SLIDES, GALLERY, NAV, STATS, HIGHLIGHTS, FORMS)

Migracja:

1. **Skrypt importu** — jednorazowy, parsuje pliki .md (gray-matter) i
   `site.ts` (dynamic import), wstawia rekordy do bazy.
2. **Test parytetu** — render strony z bazy musi wyglądać identycznie jak
   obecny render z plików.
3. **Cutover** — od momentu cutoveru pliki .md i `site.ts` przestają być
   źródłem prawdy (zostają w git jako historia).

Skrypt powstanie po wyborze stacku (każdy stack ma własne API do zapisu
do bazy).

---

## Powiązania z OFERTA.md (Q5–Q11)

Pełen scope ekonomiczno-decyzyjny dla wariantu 2 jest w [`OFERTA.md`](OFERTA.md).
Mapowanie:

- **Q5 (encje):** patrz „Encje i operacje (CRUD matrix)" wyżej.
- **Q6 (role):** patrz „Model uprawnień" — D7.
- **Q7 (90minut):** patrz „Integracja z 90minut.pl" wyżej.
- **Q8 (upload):** patrz „Galeria zdjęć — Optymalizacja" wyżej.
- **Q9 (backup):** D6.
- **Q10 (hosting):** D3.
- **Q11 (support):** zostaje aktualny, rodzinnie.

**Ekonomia:** [`OFERTA.md`](OFERTA.md) Q14 sugerował widełki 5 000 – 10 000 PLN
za scope 120–200 h, co jest realnie poniżej rynku. Decyzja „zlecenie komercyjne
vs prezent rodzinny" wciąż otwarta — wpływa na to, ile czasu warto poświęcić
i jaki stack wybrać (np. Payload skraca implementację 2–3×).

---

## Następne kroki

1. **Tomek** — odpowiada na pytania D1 (stack) i D2 (repo). Reszta D3–D9 może
   poczekać.
2. **Claude** — po decyzji o stacku przygotowuje:
   - schemat bazy danych dla wybranego ORM,
   - listę zadań z estymatami (sprint 1, 2, 3...),
   - PoC logowania + jednej encji (np. news) jako walidację stacku.
3. **Cutover** dopiero po przejściu wszystkich encji + testach + szkoleniu
   redakcji klubu.

---

## Co NIE jest w tym dokumencie (świadomie)

- **Wybór stacku** — czeka na decyzję Tomka.
- **Schematy bazy** — zależą od stacku.
- **Mockupy UI panelu** — najpierw stack, potem UX.
- **Harmonogram dat** — zależy od ekonomii (zlecenie vs prezent).
- **Cennik** — odsyłka do [`OFERTA.md`](OFERTA.md) Q14.
