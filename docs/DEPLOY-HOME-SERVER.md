# Deploy WKS (web + CMS) na serwer domowy Tomka

Ten dokument opisuje **aktualny, działający** deploy na serwerze domowym (Docker + Caddy),
pod domeną `wkswierzbice.tmielczarek.pl`, z:

- **Astro jako SSR (Node)** – strona publiczna odświeża dane z CMS **bez redeploy**
- **Payload CMS** – panel pod `/admin`, API pod `/api`
- **SQLite** na demo (plik) + persist uploadów

Źródło infrastruktury: `../SERVER.md` (Docker + sieć `web` + Caddy).

---

## 0) Założenia i stałe

- **Serwer**: `ssh root@192.168.0.5`
- **Domena**: `wkswierzbice.tmielczarek.pl`
- **Katalog projektu na serwerze**: `/srv/wks/wks_cms`
- **Compose deploy**: `/srv/wks/wks_cms/deploy/wks/docker-compose.yml`
- **Caddyfile**: `/opt/salon-app/Caddyfile` (bind-mount do kontenera `salon-caddy:/etc/caddy/Caddyfile`)
- **Sieć dockerowa**: `web` (external)

Usługi:
- **`wks-web`**: Astro SSR (port wewnętrzny `4321`)
- **`wks-cms`**: Payload CMS (port wewnętrzny `3000`)

Persist (jeden mount katalogu `./persist` → `/data/wks` w kontenerze `wks-cms`):
- **SQLite**: `.../persist/cms.db` (plik na hoście; **nie montuj samego pliku** w Dockerze — SQLite potrzebuje zapisu do katalogu obok DB, np. WAL/SHM)
- **Uploady**: `.../persist/media/`

---

## 1) Przygotowanie repo (lokalnie)

Wymagane elementy w repo:
- `apps/web` skonfigurowane jako **SSR** (`output: "server"` + `@astrojs/node`)
- `apps/cms` z `next.config.ts` ustawionym na `output: "standalone"`
- `deploy/wks/docker-compose.yml`
- `.dockerignore` w root (żeby build context był szybki i bez śmieci macOS)

### ENV (na serwerze)

W deploy folderze:
- `.env.cms` (na bazie `deploy/wks/env.cms.example`)
- `.env.web` (na bazie `deploy/wks/env.web.example`)

Najważniejsze:
- `PAYLOAD_SECRET` **musi** być ustawiony (brak = `500` na `/admin`)
- `CMS_INTERNAL_URL=http://wks-cms:3000`
- `CMS_PUBLIC_URL=https://wkswierzbice.tmielczarek.pl`
- **Migracje SQLite w prod**: w `apps/cms/src/payload.config.ts` jest `prodMigrations` — przy pierwszym starcie na pustym `cms.db` Payload utworzy tabele automatycznie (wymaga **zapisu** do katalogu persist — patrz compose).

---

## 2) Wrzut kodu na serwer

### Zalecane: Git (`git push` → na serwerze `git pull`)

**Domyślna metoda** — szybka przy słabym łączu: nie wysyłasz całego drzewa, tylko różnice w Gicie.

Pełny opis (jednorazowy `git clone` na serwerze, zmienne `WKS_SSH_HOST`, skrypt `npm run deploy:home`):
[`docs/DEPLOY-GIT-WORKFLOW.md`](DEPLOY-GIT-WORKFLOW.md).

### Awaryjnie: tar + scp (duży transfer)

Gdy nie masz jeszcze zdalnego repozytorium albo chcesz jednorazowo wysłać całość:

```bash
cd /Users/tomeczeq10/Projects/wks_cms

COPYFILE_DISABLE=1 tar czf /tmp/wks_cms.tgz \
  --exclude='./node_modules' \
  --exclude='./apps/*/node_modules' \
  --exclude='./apps/*/.next' \
  --exclude='./apps/web/dist' \
  --exclude='./apps/web/.astro' \
  --exclude='./.git' \
  --exclude='./.cursor' \
  --exclude='./.env' --exclude='./.env.*' \
  .

ssh root@192.168.0.5 "mkdir -p /srv/wks/wks_cms"
scp /tmp/wks_cms.tgz root@192.168.0.5:/srv/wks/wks_cms/
ssh root@192.168.0.5 "cd /srv/wks/wks_cms && tar xzf wks_cms.tgz && rm wks_cms.tgz && find . -name '._*' -delete"
```

Uwaga: na Debianie mogą pojawiać się warningi `LIBARCHIVE.xattr...` – są OK.

---

## 3) Backup poprzedniej wersji (na serwerze)

Jeśli działa stary kontener pod `wkswierzbice.tmielczarek.pl` (np. `wks-demo`):

```bash
ssh root@192.168.0.5
ts=$(date +%s)
cp -a /srv/wks/deploy /srv/wks/deploy.bak.$ts
cd /srv/wks/deploy
docker compose down
```

---

## 4) Pierwsze uruchomienie nowego deploya (na serwerze)

```bash
ssh root@192.168.0.5
cd /srv/wks/wks_cms/deploy/wks

mkdir -p persist/media
cp -n env.cms.example .env.cms
cp -n env.web.example .env.web
```

### Wygeneruj secret (konieczne)

```bash
cd /srv/wks/wks_cms/deploy/wks
secret=$(python3 -c 'import secrets;print(secrets.token_hex(32))')
sed -i -E "s/^PAYLOAD_SECRET=.*/PAYLOAD_SECRET=${secret}/" .env.cms
```

### Upewnij się, że persist ma poprawne prawa (uid kontenera: `1001`)

```bash
cd /srv/wks/wks_cms/deploy/wks
mkdir -p persist/media
# jeśli startujemy od zera i wcześniej cms.db był katalogiem / zły stan:
rm -rf persist/cms.db
:> persist/cms.db
chown -R 1001:1001 persist
chmod -R u+rwX,g+rwX persist
```

### Build + start

```bash
cd /srv/wks/wks_cms/deploy/wks
docker compose up -d --build
docker ps --format 'table {{.Names}}\t{{.Status}}'
docker logs wks-web --tail 60
docker logs wks-cms --tail 120
```

---

## 5) Caddy – routing jednej domeny (NAJWAŻNIEJSZE)

Żeby `/admin` nie było białe, muszą iść do CMS **także assety Next**: `/_next/*`.

W `/opt/salon-app/Caddyfile` blok dla `wkswierzbice.tmielczarek.pl` powinien wyglądać tak:

```caddyfile
wkswierzbice.tmielczarek.pl {
    encode zstd gzip

    @cms path /admin* /api* /_next*
    reverse_proxy @cms wks-cms:3000
    reverse_proxy wks-web:4321
}
```

Po zmianie:

```bash
cp /opt/salon-app/Caddyfile /opt/salon-app/Caddyfile.bak.$(date +%s)
docker exec salon-caddy caddy validate --config /etc/caddy/Caddyfile
docker exec salon-caddy caddy reload --config /etc/caddy/Caddyfile
```

### Pułapka: “bind mount trzyma starą wersję pliku”

Jeśli edytujesz Caddyfile narzędziami typu `sed -i`/`perl -i`, one potrafią
podmienić plik “atomowo” (nowy inode). Przy bind-mount czasem kończy się to tym,
że kontener **widzi starą wersję**.

Rozwiązanie awaryjne:
- przepisać plik “w miejscu” (np. `cat tmp > Caddyfile`), albo
- **zrecreate’ować** `salon-caddy` (`docker rm -f salon-caddy && docker compose up -d caddy` w `/opt/salon-app`).

---

## 6) Smoke testy

### Public (z serwera)

```bash
curl -I -m 10 https://wkswierzbice.tmielczarek.pl/ | head -20
curl -I -m 10 https://wkswierzbice.tmielczarek.pl/admin | head -20
curl -I -m 10 https://wkswierzbice.tmielczarek.pl/_next/static/chunks/0tek4j.6.fhq8.css | head -20
```

### Wewnątrz sieci `web` (z kontenera Caddy)

```bash
docker exec salon-caddy wget -S -qO- http://wks-web:4321 2>&1 | head -10
docker exec salon-caddy wget -S -qO- http://wks-cms:3000/admin 2>&1 | head -10
```

---

## 7) Typowe problemy i szybkie fixy

- **`/admin` biała strona**: brak routingu `/_next/*` do CMS w Caddy.
- **`/admin` 500 “missing secret key”**: `PAYLOAD_SECRET` puste w `.env.cms`.
- **SQLite “Unable to open … cms.db: 14”**: zły typ mounta albo brak praw zapisu.
- **SQLite `attempt to write a readonly database` na starcie migracji**: najczęściej **bind-mount pojedynczego pliku** `cms.db` — użyj mounta całego `./persist` (jak w aktualnym `deploy/wks/docker-compose.yml`) i `chown -R 1001:1001 persist`.
- **`/admin` “This page couldn’t load” + digest**: sprawdź `docker logs wks-cms` — jeśli widzisz `no such table: users`, to baza jest pusta bez migracji; jeśli błąd zapisu — patrz punkt wyżej.
- **`/admin` / cały CMS „wisi” (timeout, brak odpowiedzi)** — w logach `wks-cms`
  widać pytanie Payload: *„It looks like you've run Payload in dev mode…”*
  (czeka na stdin). Zwykle w SQLite jest wiersz **`payload_migrations` z `batch = -1`**
  (np. po seedzie w Dockerze **bez** `NODE_ENV=production`). Na hoście:
  z katalogu repo:  
  `python3 -c "import sqlite3;c=sqlite3.connect('deploy/wks/persist/cms.db');c.execute('DELETE FROM payload_migrations WHERE batch=-1');c.commit()"`,  
  potem `cd deploy/wks && docker compose restart wks-cms`.
  Aktualny `npm run seed:cms-on-server` ustawia już **`NODE_ENV=production`** w kontenerze seedującym.
- **Web kontener restartuje się (np. `ERR_MODULE_NOT_FOUND piccolore`)**:
  w obrazie brakuje runtime `node_modules`. W naszym obrazie docelowo kopiujemy
  `node_modules` do runtime.
- **Edycja w CMS, a strona dalej „stara” (nie lokalnie)** — często **cache HTML**
  (Cloudflare przy tunelu, przeglądarka). W kodzie: middleware Astro ustawia
  `Cache-Control: no-store` na HTML; Next ustawia to samo na `/api/*`. W
  Cloudflare: reguła **Bypass cache** dla hosta demo albo wyczyść cache po
  większych zmianach treści.
- **Strona pokazuje aktualności / obrazy, a w `/admin` kolekcje są puste**:
  front domyślnie ma **fallback do Markdown** (`src/content/news/*.md`) i plików
  w `public/`, gdy CMS zwraca **0 newsów** — wygląda jak „pełny” serwis przy
  pustej bazie SQLite. Wypełnij bazę tymi samymi skryptami co lokalnie:
  [`§8) Seed bazy CMS na serwerze (skrypt)`](#8-seed-bazy-cms-na-serwerze-skrypt).

---

## 8) Seed bazy CMS na serwerze (skrypt)

Po `git clone` lub nowym `persist/` Payload tworzy **tylko tabele** (`prodMigrations`),
ale **nie importuje** newsów, mediów, drużyn itd. — trzeba to zrobić **raz**
(z laptopa przez SSH), tak jak robiłeś lokalnie (`seed-admin`, `migrate-news`, …).

**Wymagania na serwerze:** pełny klon repo w `WKS_DEPLOY_PATH`, `deploy/wks/.env.cms`
z poprawnym `PAYLOAD_SECRET`. Skrypt użyje **Node 20** z `PATH` (np. nvm w
interaktywnej sesji), a gdy na hoście **nie ma** `node` — **`docker run node:20-bookworm`**
(z mountem repo i `persist`). `ADMIN_EMAIL` pusty lub `admin@wks.local` w pliku
jest traktowany jak **`admin@wkswierzbice.pl`** (żeby nie zostawać na adresie z
przykładu). Hasło: `ADMIN_PASSWORD` z pliku lub domyślne z `seed-admin.ts`.

Z maszyny z dostępem SSH:

```bash
export WKS_SSH_HOST=root@192.168.0.5    # lub inny host
export WKS_DEPLOY_PATH=/srv/wks/wks_cms   # opcjonalnie
npm run seed:cms-on-server
```

Skrypt (`scripts/wks-cms-seed-prod-db.sh`):

1. Ustawia `DATABASE_URL` / `UPLOADS_DIR` na **`deploy/wks/persist/`** (ten sam
   volume co kontener `wks-cms`).
2. Uruchamia kolejno: `seed-admin`, `migrate-news`, `migrate-news-covers`,
   `migrate-teams`, `migrate-team-photos`, `seed-hero-and-static-pages`,
   `migrate-site-people-and-sponsors` (idempotentne — ponowne odpalenie jest
   bezpieczne).
3. `chown -R 1001:1001 deploy/wks/persist` i `docker compose restart wks-cms`.

Pierwszy raz pobierze zależności: **`npm ci`** w katalogu głównym repo (kilka
minut). Kolejne uruchomienia pomijają `npm ci`, dopóki istnieje `node_modules`;
wymuś ponownie: `WKS_SEED_FORCE_NPM_CI=1 npm run seed:cms-on-server`.

**Po pierwszym seedzie przed tą poprawką** mógł powstać użytkownik `admin@wks.local`
— nadal możesz się nim zalogować (hasło z `ADMIN_PASSWORD`, zwykle `admin`).
Żeby mieć tylko `admin@wkswierzbice.pl`: zaktualizuj repo, ponów
`npm run seed:cms-on-server` (pierwszy krok `seed-admin` utworzy lub zaktualizuje
to konto), a `admin@wks.local` usuń w panelu **Użytkownicy**.

