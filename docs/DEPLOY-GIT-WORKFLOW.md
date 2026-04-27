# Deploy przez Git (zamiast tar + cały katalog)

Cel: **szybka aktualizacja serwera** — `git push` z laptopa, na serwerze **`git pull`** tylko zmienionych plików, potem **`docker compose`** gdy trzeba przebudować obrazy.

Pełny kontekst infrastruktury (Caddy, persist, compose): [`DEPLOY-HOME-SERVER.md`](DEPLOY-HOME-SERVER.md).

---

## 0) Wymagania wstępne

1. **Zdalne repozytorium** (GitHub / GitLab / Gitea / …) — w tym monorepo **nie ma jeszcze** `git remote` (trzeba dodać `origin` lub inna nazwa).
2. **Uwierzytelnienie do `git push`** — zwykle klucz SSH dodany do konta hostingu git.
3. **Dostęp SSH do serwera z maszyny, na której pracujesz** (lub z sieci, z której Cursor uruchamia terminal):
   - Adres **`192.168.0.5` działa tylko w tej samej sieci LAN** co serwer.
   - Z Niemiec bez VPN: użyj **publicznego hosta**, **Tailscale**, **WireGuard** albo **jump hosta** — wtedy ustaw np. `WKS_SSH_HOST=root@twoj-serwer.example.com`.

---

## 1) Jednorazowo: serwer jako klon tego samego repozytorium

Na serwerze (przykład ścieżki jak obecnie: `/srv/wks/wks_cms`):

```bash
# jeśli katalog jest śmietnikiem po starym tarze — zrób backup i wyczyść
ssh root@TWOJ_HOST
mv /srv/wks/wks_cms /srv/wks/wks_cms.bak.$(date +%s)   # opcjonalnie

git clone https://github.com/TWOJ_USER/wks_cms.git /srv/wks/wks_cms
# albo: git clone git@github.com:TWOJ_USER/wks_cms.git ...

cd /srv/wks/wks_cms
git checkout main   # lub inna gałąź deploy

# env + persist — jak w DEPLOY-HOME-SERVER.md §4
mkdir -p deploy/wks/persist/media
# skopiuj z backupu .env.cms / .env.web jeśli już je miałeś
```

**Ważne:** katalog `deploy/wks/persist/` jest **poza Gitem** (nie commitujemy `cms.db` ani uploadów). Po `git clone` trzeba **przywrócić** `.env.*` i `persist/` z backupu albo utworzyć na nowo.

---

## 2) Codzienna aktualizacja (Ty lub asystent w Cursorze)

### A) Lokalnie (Mac / repo)

```bash
git add -A
git commit -m "Krótki opis zmiany"
git push origin main
```

### B) Na serwerze — pull + Docker

Z repo jest skrypt (wywoływany **z laptopa**, robi SSH na serwer):

```bash
export WKS_SSH_HOST=root@192.168.0.5    # lub Tailscale / publiczny host
export WKS_DEPLOY_PATH=/srv/wks/wks_cms
export WKS_BRANCH=main
npm run deploy:home
```

Domyślnie skrypt robi **`git pull --ff-only`** i **`docker compose up -d --build`** w `deploy/wks/`.  
Jeśli zmieniasz tylko treść obsługiwaną przez CMS **bez** zmian w `Dockerfile` / `package.json` / lockfile — możesz chwilowo wyłączyć rebuild obrazu (wtedy tylko restart kontenerów z tym samym obrazem; **nie zawsze wystarczy**):

```bash
WKS_DOCKER_BUILD=0 npm run deploy:home
```

---

## 3) Co robi asystent (Cursor) po „udanej operacji”

Gdy prosisz o deploy na serwer domowy i masz już **`origin`** + działający **`WKS_SSH_HOST`** z tej maszyny:

1. **`git status`** — upewnić się, że commit zawiera zamierzone pliki (bez przypadkowych `.env`).
2. **`git commit`** z sensownym opisem (po polsku lub krótko po angielsku).
3. **`git push`** na właściwą gałąź (`main` lub ustaloną deploy).
4. **`npm run deploy:home`** (z ustawionymi `WKS_SSH_HOST` / opcjonalnie `WKS_DEPLOY_PATH`).

**Ograniczenia:**

- Nie wykonam `git push`, jeśli **nie ma skonfigurowanego remote** albo brak uprawnień w tym środowisku.
- Nie zacommituję **sekretów** — `.env`, `deploy/wks/.env.*` muszą być w `.gitignore` (są).

---

## 4) Kiedy `git pull` nie wystarczy (trzeba `--build`)

Zrób **`docker compose ... --build`**, gdy zmieni się np.:

- `Dockerfile`, `package.json`, `package-lock.json`, zależności workspace,
- kod wymagający **nowego obrazu** (typowa zmiana w CMS / web w tym projekcie).

Same zmiany w treści w CMS **nie** wymagają rebuildu Dockera (SSR i tak czyta z CMS w runtime).

---

## 5) Fallback: tar + scp

Przy awarii Gita lub pierwszym seedzie bez remote nadal możesz użyć archiwum — opis w [`DEPLOY-HOME-SERVER.md`](DEPLOY-HOME-SERVER.md) §2.
