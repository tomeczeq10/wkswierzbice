#!/usr/bin/env bash
# Zabija procesy nasłuchujące na portach dev Astro (domyślnie 4321 i kolejne przy kolizji).
# macOS / Linux: wymaga `lsof`.
set -u
for p in 4321 4322 4323 4324 4325; do
  pids=$(lsof -ti "tcp:$p" 2>/dev/null || true)
  if [[ -n "${pids}" ]]; then
    echo "[free-ports] Port $p — kończę PID: ${pids//$'\n'/ }"
    kill -9 ${pids} 2>/dev/null || true
  fi
done
echo "[free-ports] Gotowe."
