# Porównanie stacków panelu admina (D1)

> Materiał decyzyjny dla wyboru stacku CMS-a dla WKS Wierzbice.
> Powstał 2026-04-25 jako odpowiedź na decyzję Tomka „chcę zobaczyć krótkie
> porównanie zanim wybiorę".
>
> **Scope referencyjny:** pełen, decyzja Tomka 2026-04-25 — wszystkie encje
> z OFERTA.md Q5 + dzisiejsza wiadomość edytowalne z panelu (aktualności,
> drużyny + składy, galeria, wyniki 90minut, zarząd, sztab, sponsorzy, hero,
> site config, statyczne podstrony).
>
> **Powiązane:** [`ADMIN-PANEL.md`](ADMIN-PANEL.md) (encje, RBAC, integracja
> 90minut), [`OFERTA.md`](OFERTA.md) Q5–Q14 (scope, ekonomia).

---

## TL;DR + rekomendacja

3 kandydaci, każdy optymalizuje co innego:

- **Payload CMS 3** — balanced, TypeScript end-to-end, gotowy panel React, własna kontrola nad konfiguracją i hookami. Najlepszy „złoty środek".
- **Directus** — najszybciej do działającego panelu, gotowy UI + RBAC bardzo elastyczny, ale generic look-and-feel i mniej hooków biznesowych w TS.
- **Astro SSR + custom panel** (Drizzle + lucia-auth) — maksimum kontroli i spójność z obecnym kodem, ale 2–3× więcej pracy.

**Rekomendacja Claude'a: Payload CMS 3.**

Uzasadnienie: dla scope WKS (12 encji, 3 role, upload, integracja 90minut)
Payload daje **najlepszy stosunek czas-implementacji do kontroli**. Dla
amatorskiego klubu redakcja będzie obsługiwać 5–10 osób przez najbliższe
2–3 lata — gotowy panel React jest „dorosły", a hooki/access control w TS
pozwalają na nietrywialne reguły (np. „trener edytuje tylko swoją drużynę")
bez walki z generic UI Directusa.

**To jest wskazówka, nie decyzja.** Każda z 3 opcji jest sensowna; różnice
opisane niżej. Jeśli po przeczytaniu masz wątpliwości — zadaj pytanie i
zweryfikujemy konkretny scenariusz.

---

## Macierz decyzyjna

| Kryterium | Payload CMS 3 | Directus | Astro SSR + custom |
|---|---|---|---|
| Time to first working admin | ~2 tygodnie | ~3–5 dni | ~6–8 tygodni |
| Estymata pełen scope WKS | 60–80 h | 40–60 h | 130–180 h |
| Język end-to-end | TypeScript | TS klient + JSON config | TypeScript |
| Definicja encji | TS object (`Collection`) | UI lub SDK | Drizzle schema (TS) |
| Panel admina | Gotowy (React, polerowany) | Gotowy (Vue, generyczny) | Trzeba zbudować |
| RBAC | Funkcje access per kolekcja | Granularne reguły w UI | Trzeba zbudować |
| Upload + image processing | Wbudowane (sharp) | Wbudowane (ImageKit-like) | Trzeba dodać |
| Hooki biznesowe (np. trigger sync 90minut) | TS hooki w kolekcji | Flows (low-code) lub extensions | Endpoint Astro |
| Społeczność / dojrzałość | Duża, MIT, v3 stable | Bardzo duża, GPL-3 (BSL dla cloud) | n/a (custom) |
| Hosting | VPS Node.js + Postgres/Mongo | VPS Docker + Postgres/MySQL/SQLite | VPS Node.js + DB |
| Jak frontend Astro czyta dane | REST/GraphQL fetch | REST/GraphQL fetch lub SDK | bezpośredni `db.select()` |
| Migracja MD→DB | Skrypt seed (`payload.create()`) | UI import lub skrypt SDK | Skrypt seed (`db.insert()`) |
| Vendor lock | Zero (self-hosted, MIT) | Zero (self-hosted, GPL) | Zero (własny kod) |
| Future-proof dla zmian wymagań | Wysokie (TS = pełna elastyczność) | Średnie (custom UI = extensions w Vue) | Najwyższe (wszystko własne) |

---

## 1. Payload CMS 3

### Czym jest

Payload to **headless CMS oparty na TypeScript**, MIT, self-hosted. Wersja 3
(stable od listopada 2024) jest natywnie zintegrowana z Next.js 15 — backend,
panel admina i frontend mogą żyć w jednym projekcie Next, ale equally dobrze
działa jako osobna usługa, którą Astro odpytuje przez REST/GraphQL.

Definiujesz **kolekcje** w plikach TS, Payload generuje:
- bazę (Postgres lub MongoDB),
- panel admina React (sam się aktualizuje, gdy zmienisz schemat),
- REST + GraphQL API,
- typy TS dla frontendu.

### Przykład: kolekcja `news` w Payload

```ts
// payload/collections/News.ts
import type { CollectionConfig } from "payload";

export const News: CollectionConfig = {
  slug: "news",
  admin: {
    useAsTitle: "title",
    defaultColumns: ["title", "date", "draft", "tags"],
  },
  access: {
    read: () => true,
    create: ({ req: { user } }) => ["admin", "redaktor"].includes(user?.role),
    update: ({ req: { user } }) => ["admin", "redaktor"].includes(user?.role),
    delete: ({ req: { user } }) => user?.role === "admin",
  },
  fields: [
    { name: "title", type: "text", required: true },
    { name: "date", type: "date", required: true },
    { name: "excerpt", type: "textarea", required: true },
    { name: "cover", type: "upload", relationTo: "media" },
    { name: "coverAlt", type: "text" },
    {
      name: "tags",
      type: "select",
      hasMany: true,
      options: ["wynik", "zapowiedz", "seniorzy", "juniorzy", "klub"],
    },
    { name: "body", type: "richText" },
    { name: "draft", type: "checkbox", defaultValue: false },
    { name: "facebookUrl", type: "text" },
    { name: "truncated", type: "checkbox", defaultValue: false },
  ],
};
```

### Jak Astro frontend pobiera dane

```ts
// src/pages/aktualnosci/index.astro
const res = await fetch(
  `${import.meta.env.PAYLOAD_URL}/api/news?where[draft][equals]=false&sort=-date&limit=12`,
);
const { docs: news } = await res.json();
```

Albo z generowanym SDK + typami:

```ts
import { getPayload } from "payload";
const payload = await getPayload({ config });
const news = await payload.find({
  collection: "news",
  where: { draft: { equals: false } },
  sort: "-date",
});
```

### Panel admina

Wbudowany panel React pod `/admin`. Wygląda profesjonalnie out-of-the-box
(podobny do Notion / Linear w estetyce — tabele, formularze, sidebar nawigacji).
Każda kolekcja dostaje listę + edytor; dla pól `richText` jest edytor Lexical
(Facebook), dla `upload` panel multimediów z thumbnailami.

Oficjalne screenshoty: <https://payloadcms.com/showcase> · Demo: <https://demo.payloadcms.com>

### Plusy dla WKS specyficznie

- **TS end-to-end** — spójne z obecnym Astro/TS strict, bez przełączania paradygmatu.
- **Hooki w TS** — `afterChange` na kolekcji `season` triggeruje async
  job uruchamiający `sync-90minut.mjs`. Mało kodu, dużo kontroli.
- **`access` per operacja** — naturalna implementacja „Trener edytuje tylko
  swoją drużynę" (`update: ({ req, doc }) => req.user.team === doc.id`).
- **Auto-generowane typy** — `payload generate:types` daje typy do frontendu Astro.
- **Upload + sharp** — wbudowana optymalizacja zdjęć (resize, WebP, srcset).
- **Migracje** — `payload migrate` synchronizuje schema z bazą (Drizzle pod spodem).

### Minusy / ryzyka

- **Panel oparty na React** — chcesz custom kolory/branding klubu w panelu?
  Trzeba pisać React components (ale to opcjonalne, default jest profesjonalny).
- **Drugi proces Node.js** obok Astro — backend + panel = osobny `npm run dev`
  (lub jeden Next.js project, jeśli zdecydujemy się na Payload-as-Next).
- **Najnowsza wersja v3** — stable, ale ekosystem pluginów wciąż rośnie.
  Większość rzeczy z v2 portowana, ale czasem trzeba poszukać.
- **Brak gotowego polskiego tłumaczenia panelu** — interfejs jest po angielsku
  (lub trzeba dorobić tłumaczenia ~3 h pracy).

### Estymata dla pełnego scope WKS

- Setup + auth + 3 role: 8 h
- 12 kolekcji (news, teams, players, gallery, board, staff, sponsors, hero, season, site-config, static-pages, users): 25–35 h
- Hooki + integracja 90minut + cron: 8–12 h
- Migracja danych z MD/site.ts: 6–8 h
- Polerka panelu (ikona klubu, kolory, polskie etykiety): 4–6 h
- Deploy VPS + setup Postgres + backup: 6–8 h
- Testy + szkolenie redakcji: 6–10 h

**Razem: 60–80 h.**

### Kiedy wybrać Payload

- Chcesz spójności TS + kontrolę nad logiką biznesową.
- Akceptujesz panel w domyślnej estetyce (lub masz 4–6 h na branding).
- Klub planuje zmieniać wymagania (nowe encje, nowe pola) → łatwo
  dodawać przez edycję pliku TS, bez UI.

---

## 2. Directus

### Czym jest

Directus to **headless CMS „data-first"**: tworzysz tabele w Postgres/MySQL/SQLite,
Directus automatycznie generuje panel admina i REST/GraphQL API. Definicje
encji powstają zwykle **w UI panelu** (klikając „add field"), choć można też
przez SDK / migracje TS.

Licencja: **GPL-3** dla self-hosted (free), BSL dla Directus Cloud.

### Przykład: kolekcja `news` w Directus

Wariant 1 — przez UI (najszybszy, ale niewersjonowane w git):
- Settings → Data Model → Create Collection `news`.
- Add field `title` (Type: String, Required), `date` (Date), `excerpt` (Text),
  `cover` (File, single image), `tags` (CSV lub Many-to-Many do `tags`),
  `draft` (Boolean), `body` (WYSIWYG), `facebookUrl` (String, validation: URL),
  `truncated` (Boolean).
- Settings → Roles & Permissions → przypisać dostęp per rola.

Wariant 2 — przez SDK / migration script (wersjonowane):

```ts
// scripts/migrate-news.ts
import { createDirectus, rest, createCollection, createField } from "@directus/sdk";

const client = createDirectus(URL).with(rest());

await client.request(
  createCollection({
    collection: "news",
    schema: { name: "news" },
    meta: { sort_field: "date" },
  }),
);

await client.request(
  createField("news", {
    field: "title",
    type: "string",
    meta: { required: true, interface: "input" },
  }),
);
// ... pozostałe pola analogicznie
```

### Jak Astro frontend pobiera dane

```ts
import { createDirectus, rest, readItems } from "@directus/sdk";

type News = {
  id: number; title: string; date: string; excerpt: string;
  cover: string; tags: string[]; draft: boolean;
};

const directus = createDirectus<{ news: News[] }>(URL).with(rest());

const news = await directus.request(
  readItems("news", {
    filter: { draft: { _eq: false } },
    sort: ["-date"],
    limit: 12,
  }),
);
```

### Panel admina

Wbudowany panel Vue 3 pod `/admin`. Ma **najbardziej elastyczny RBAC** spośród
gotowych CMS — zasady per kolekcja, per pole, per akcja, z filtrami SQL-like
(np. „redaktor widzi tylko swoje artykuły"). Out-of-the-box generic look
(„admin panel jak każdy inny", grid + sidebar).

Oficjalne screenshoty: <https://directus.io/data-studio> · Demo: <https://directus.app>
(zarejestruj testowy projekt).

### Plusy dla WKS specyficznie

- **Najszybciej do panelu** — w 2 dni można mieć działający CMS dla całego scope.
- **RBAC granularny** — Wariant C z `ADMIN-PANEL.md` (per-encja per-pole per-akcja)
  praktycznie out-of-the-box, bez kodu.
- **Flows** — low-code automatyzacje (np. „po dodaniu zdjęcia uruchom resize",
  „raz dziennie odpal HTTP request do scrap-a 90minut").
- **Multilingualność panelu** — polskie tłumaczenie out-of-the-box.
- **Upload + transformacje obrazów** — wbudowane, lepiej niż Payload (presety
  rozmiarów per kolekcja).

### Minusy / ryzyka

- **Definicje encji w UI** — domyślny workflow oznacza, że schema żyje w bazie,
  nie w git. Można wymusić migracje TS, ale to większa praca i mniej naturalne.
- **Hooki biznesowe** — extensions w TypeScript (działa, ale framework
  bardziej rygorystyczny niż Payload, trudniejszy debug).
- **Generic UI panelu** — trudniej dorobić „klubowy branding". Theming jest
  ograniczony do CSS variables; głębsza modyfikacja UI = pisanie extension w Vue.
- **Licencja GPL-3 self-hosted** — w naszym przypadku OK (nie redystrybuujemy
  oprogramowania), ale formalnie warto wiedzieć.
- **Brak natywnego SSR rendering w Astro** — frontend i tak osobny proces.

### Estymata dla pełnego scope WKS

- Setup + auth + 3 role: 4 h
- 12 kolekcji (głównie przez UI): 12–18 h
- Granularne uprawnienia per rola: 4–6 h
- Flows / cron / integracja 90minut: 6–10 h
- Migracja danych z MD/site.ts: 6–10 h
- Polerka (logo, polskie etykiety to plus, branding ograniczony): 2–4 h
- Deploy Docker + Postgres + backup: 4–6 h
- Testy + szkolenie redakcji: 4–8 h

**Razem: 40–60 h.**

### Kiedy wybrać Directus

- Najwyższy priorytet to **time-to-first-admin**.
- RBAC ma być bardzo szczegółowy (Wariant C w `ADMIN-PANEL.md`).
- Akceptujesz schemat trzymany w bazie zamiast w kodzie.
- Nie potrzebujesz mocno custom UI panelu (klub dostaje „dobry domyślny CMS").

---

## 3. Astro SSR + custom panel

### Czym jest

**Brak gotowego CMS-a.** Rozbudowujemy obecny projekt Astro o:
- tryb hybrid (`output: "hybrid"` w `astro.config.mjs`) — strony publiczne nadal SSG, panel admina i API SSR,
- bazę (np. SQLite + Drizzle ORM lub Postgres + Drizzle),
- własny system auth (lucia-auth lub auth.js),
- własny panel admina pod `/admin/*` (Astro pages + małe wyspy React/Solid dla formularzy),
- własny upload + sharp,
- własny RBAC.

### Przykład: schemat `news` w Drizzle

```ts
// src/db/schema.ts
import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";

export const news = sqliteTable("news", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  date: integer("date", { mode: "timestamp" }).notNull(),
  excerpt: text("excerpt").notNull(),
  cover: text("cover"),
  coverAlt: text("cover_alt"),
  tags: text("tags", { mode: "json" }).$type<string[]>().default([]),
  body: text("body").notNull(),
  draft: integer("draft", { mode: "boolean" }).notNull().default(false),
  facebookUrl: text("facebook_url"),
  truncated: integer("truncated", { mode: "boolean" }).notNull().default(false),
  authorId: integer("author_id").references(() => users.id),
});
```

### Jak Astro frontend czyta dane

Bez fetch — bezpośrednio z bazy w SSR/SSG:

```ts
// src/pages/aktualnosci/index.astro
import { db } from "@/db";
import { news } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

const items = await db
  .select()
  .from(news)
  .where(eq(news.draft, false))
  .orderBy(desc(news.date))
  .limit(12);
```

### Panel admina

Trzeba zbudować od zera. Stack proponowany:
- Astro pages pod `/admin/*` chronione middleware sprawdzającym sesję.
- Tabela aktualności = `<table>` w Astro + paginacja po stronie serwera.
- Formularz edycji = wyspa React (`<NewsForm client:load />`) z react-hook-form
  + `actions` Astro (POST handler).
- Upload = endpoint POST z Multer-like parserem + sharp resize.
- WYSIWYG = TipTap albo Lexical (~6–8 h integracji per edytor).

### Plusy dla WKS specyficznie

- **Jeden stack, jedno repo, jeden deploy** — wszystko TS, wszystko Astro.
- **Pełna kontrola UI panelu** — branding klubu, polski język, custom UX
  dla nietypowych przypadków (np. ekran „zarządzaj składem drużyny" z
  drag-and-drop pozycji).
- **Brak zewnętrznych zależności** — żaden CMS nie deprecate-uje API
  za 2 lata, nikt nie zmieni licencji.
- **Spójność z obecną stroną** — komponenty z `src/components/` można
  używać w panelu (np. preview newsa).

### Minusy / ryzyka

- **Najwięcej pracy** — wszystko trzeba napisać: tabele, formularze,
  walidacja, upload, paginacja, sortowanie, search, role.
- **Reinventing the wheel** — Payload/Directus już to mają.
- **Wsparcie długoterminowe na Tomku** — bug w panelu = naprawia Tomek,
  bez społeczności.
- **Brak gotowych pluginów** — wszystkie narzędzia (export CSV, import,
  bulk operations, audit log) trzeba pisać samodzielnie.

### Estymata dla pełnego scope WKS

- Setup hybrid + Drizzle + lucia-auth: 12 h
- 12 modeli + migracje: 8 h
- Panel admina (layout, sidebar, auth flow): 16–20 h
- 12 widoków list + 12 formularzy edycji: 40–60 h
- Upload + sharp + WYSIWYG: 12–16 h
- RBAC (Wariant B z ADMIN-PANEL): 12–16 h
- Integracja 90minut + cron + async jobs: 8–12 h
- Migracja MD→DB: 6–8 h
- Deploy + setup + backup: 6–8 h
- Testy + szkolenie: 8–12 h

**Razem: 130–180 h.**

### Kiedy wybrać Astro SSR + custom

- Branding panelu jest priorytetem (klubowe kolory wszędzie, klubowy ton).
- Tomek chce projekt edukacyjny / portfolio.
- Akceptujesz 3× więcej pracy w zamian za zero zewnętrznych zależności.
- Nie planujesz dodawać 10 nowych encji w przyszłości (każda nowa encja
  to ~5–8 h roboty manualnej, w Payload ~1–2 h).

---

## Decyzja — jak wybrać

Kierunkowe pytania:

1. **Ile godzin Tomek chce poświęcić w sumie?**
   - 40–60 h → **Directus** (najszybciej).
   - 60–80 h → **Payload** (balans).
   - 130+ h → **Astro SSR + custom** (max kontroli) lub Payload + branding.

2. **Czy schemat ma żyć w git (kod) czy w bazie (UI)?**
   - W git → Payload albo Astro SSR.
   - Akceptujesz w bazie → Directus.

3. **Czy panel ma wyglądać „klubowo" (kolory, herb)?**
   - Tak, wysokim priorytetem → Astro SSR + custom (lub Payload + 6 h brandingu).
   - Wystarczy „dobry generic" → Directus albo Payload default.

4. **Jak skomplikowany RBAC?**
   - Wariant A (3 sztywne role) → wszystkie 3 stacki dają radę.
   - Wariant B (role + override) → Payload (TS hooki) lub Astro SSR.
   - Wariant C (per-pole, per-akcja) → Directus (gotowe w UI).

5. **Co Tomek już zna?**
   - Astro/TS dobrze → Payload albo Astro SSR.
   - Nigdy żadnego CMS-a → Payload albo Directus (Astro SSR = za dużo nieznanego).

---

## Co dalej po wyborze

Po decyzji o stacku zostaje do rozstrzygnięcia (kolejność pytań w kolejnej sesji):

- **D2 (repo):** rekomendacja zależy od stacku.
  - Payload → osobne repo (Payload-as-Next + Astro frontend) **lub** monorepo
    (`apps/web` + `apps/cms`).
  - Directus → ten sam folder (Directus jako Docker compose obok), Astro nie
    musi wiedzieć o Directusie poza fetch URL.
  - Astro SSR → ten sam folder (rozbudowa obecnego repo).
- **D3 (hosting):** VPS dla wszystkich 3. Konkretne wymagania:
  - Payload: Node 20+, Postgres 14+, ~1 GB RAM minimum.
  - Directus: Docker, Postgres 13+, ~512 MB RAM minimum.
  - Astro SSR: Node 20+, SQLite (plik) lub Postgres, ~512 MB RAM.
- **D5 (auth):** Payload i Directus — built-in (email+hasło, opcjonalnie OAuth).
  Astro SSR — lucia-auth lub auth.js, mniej out-of-the-box, więcej kodu.
- **D7 (RBAC):** wpływa na ostateczny koszt każdego wariantu (patrz pyt. 4 wyżej).
- **D8 (galeria):** model albumów wpływa na schemat każdego stacku.
- **D6 (backup):** standardowo `pg_dump` w cronie + Backblaze B2 (~5 zł/mies.).

Schemat bazy + plan implementacji w sprintach przygotowuję po wyborze stacku.
