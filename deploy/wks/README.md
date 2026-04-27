# Deploy: WKS (web + CMS) na serwer domowy

Ta paczka jest pod `SERVER.md` (Docker + Caddy + sieć `web`).

## Szybki start (serwer)

1. Skopiuj env:

```bash
cp env.cms.example .env.cms
cp env.web.example .env.web
nano .env.cms
nano .env.web
```

2. Persist (katalog `./persist` jest montowany w całości do `/data/wks` w
   kontenerze CMS — **nie montuj samego pliku** `cms.db`, bo SQLite potrzebuje
   zapisu obok DB, np. plików WAL/SHM):

```bash
mkdir -p persist/media
touch persist/cms.db
chown -R 1001:1001 persist
```

3. Build + start:

```bash
docker compose up -d --build
docker compose logs wks-cms --tail 60
docker compose logs wks-web --tail 60
```

## Caddy (jedna domena)

W Caddyfile dodaj routing:
- `/admin*`, `/api*`, `/_next*` → `wks-cms:3000` (assety Next muszą iść do CMS)
- reszta → `wks-web:4321`

Po zmianie: validate + reload.
