#!/usr/bin/env node
/**
 * Pobiera aktualną tabelę i terminarz z 90minut.pl i zapisuje do
 * src/data/season.json. Uruchamiane przed astro build.
 *
 * - Źródło: http://www.90minut.pl/liga/1/liga14275.html
 *   (Klasa okręgowa 2025/2026, grupa Wrocław).
 * - HTML serwowany jest w ISO-8859-2 (Latin-2).
 * - Jeśli fetch padnie, nie kasujemy istniejącego JSON-a – budujemy stronę
 *   z ostatniej znanej migawki.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as cheerio from "cheerio";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "src", "data", "season.json");

const LEAGUE_URL = "http://www.90minut.pl/liga/1/liga14275.html";
const SEASON_LABEL = "Klasa okręgowa 2025/2026, grupa Wrocław";
const SEASON_START_YEAR = 2025;
const SEASON_END_YEAR = 2026;
const CLUB_NAME_NORMALIZED = "wks wierzbice";

const PL_MONTHS = {
  stycznia: 1,
  styczeń: 1,
  lutego: 2,
  luty: 2,
  marca: 3,
  marzec: 3,
  kwietnia: 4,
  kwiecień: 4,
  maja: 5,
  maj: 5,
  czerwca: 6,
  czerwiec: 6,
  lipca: 7,
  lipiec: 7,
  sierpnia: 8,
  sierpień: 8,
  września: 9,
  wrzesień: 9,
  października: 10,
  październik: 10,
  listopada: 11,
  listopad: 11,
  grudnia: 12,
  grudzień: 12,
};

const normalize = (s = "") =>
  s
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const sameTeam = (a, b) => normalize(a).toLowerCase() === normalize(b).toLowerCase();
const isWks = (team) => normalize(team).toLowerCase() === CLUB_NAME_NORMALIZED;

/** "10 sierpnia, 17:00" → { date: "2025-08-10", time: "17:00" } */
function parsePlDate(raw) {
  if (!raw) return { date: null, time: null, raw: "" };
  const text = normalize(raw);
  const m = text.match(/(\d{1,2})\s+([a-ząćęłńóśźż]+)(?:,\s*(\d{1,2}):(\d{2}))?/i);
  if (!m) return { date: null, time: null, raw: text };
  const day = Number(m[1]);
  const monthName = m[2].toLowerCase();
  const month = PL_MONTHS[monthName];
  if (!month) return { date: null, time: null, raw: text };
  // sezon 2025/26: sierpień-grudzień => 2025, styczeń-czerwiec => 2026
  const year = month >= 7 ? SEASON_START_YEAR : SEASON_END_YEAR;
  const dd = String(day).padStart(2, "0");
  const mm = String(month).padStart(2, "0");
  const time = m[3] && m[4] ? `${m[3].padStart(2, "0")}:${m[4]}` : null;
  return { date: `${year}-${mm}-${dd}`, time, raw: text };
}

function parseScore(text) {
  const t = normalize(text).replace(/^<|>$/g, "");
  const m = t.match(/^(\d+)[-:](\d+)$/);
  if (!m) return null;
  return { home: Number(m[1]), away: Number(m[2]) };
}

async function fetchHtml(url) {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; WKSWierzbiceSiteBot/1.0; +https://wkswierzbice.pl)",
      Accept: "text/html,application/xhtml+xml",
    },
  });
  if (!res.ok) {
    throw new Error(`90minut.pl ${url} – HTTP ${res.status}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  // strona jest w ISO-8859-2 (deklarowane w meta charset)
  const decoder = new TextDecoder("iso-8859-2");
  return decoder.decode(buf);
}

function parseStandings($) {
  const standings = [];
  // Tabela ligowa i tabela „meczów bezpośrednich” obie mają class="main2",
  // więc dodatkowo filtrujemy: wiersz ligi ma 22 td i pierwszą komórkę w
  // formacie <b>N.</b> (z kropką), a mecze bezpośrednie – bgcolor #7777BB.
  $("table.main2 tr").each((_, tr) => {
    const $tr = $(tr);
    const $tds = $tr.find("td");
    if ($tds.length < 20) return;
    if ($tds.eq(0).attr("bgcolor")) return;
    const first = normalize($tds.eq(0).text());
    const positionMatch = first.match(/^(\d+)\.$/);
    if (!positionMatch) return;
    const nameCell = $tds.eq(1);
    const teamLink = nameCell.find("a").first();
    const team = normalize(teamLink.length ? teamLink.text() : nameCell.text());
    if (!team) return;
    standings.push({
      position: Number(positionMatch[1]),
      team,
      played: Number(normalize($tds.eq(2).text())) || 0,
      points: Number(normalize($tds.eq(3).text())) || 0,
      wins: Number(normalize($tds.eq(4).text())) || 0,
      draws: Number(normalize($tds.eq(5).text())) || 0,
      losses: Number(normalize($tds.eq(6).text())) || 0,
      goals: normalize($tds.eq(7).text()),
    });
  });
  return standings;
}

function parseFixtures(html) {
  // Sekcja terminarza składa się z powtarzających się bloków:
  //   <b><u>Kolejka N - DATY</u></b>
  //   <table>...<tr>...mecz...</tr>...</table>
  // Łatwiej niż DOM-em poleciemy po tekście między nagłówkami kolejek.
  const matches = [];
  const rounds = [];
  const roundHeaderRe =
    /<b><u>\s*Kolejka\s+(\d+)(?:\s*-\s*([^<]+))?<\/u><\/b>/gi;
  const headerPositions = [];
  let m;
  while ((m = roundHeaderRe.exec(html)) !== null) {
    headerPositions.push({
      number: Number(m[1]),
      label: normalize((m[2] || "").replace(/&nbsp;/g, " ")),
      start: m.index,
    });
  }
  for (let i = 0; i < headerPositions.length; i++) {
    const header = headerPositions[i];
    const next = headerPositions[i + 1];
    const chunk = html.slice(
      header.start,
      next ? next.start : html.length
    );
    const $chunk = cheerio.load(`<div>${chunk}</div>`);
    const roundMatches = [];
    $chunk("tr").each((_, tr) => {
      const $tr = $chunk(tr);
      const $tds = $tr.find("td");
      if ($tds.length < 4) return;
      // Oczekiwane kolumny: gospodarz, wynik, gość, data
      const homeCell = $tds.eq(0);
      const scoreCell = $tds.eq(1);
      const awayCell = $tds.eq(2);
      const dateCell = $tds.eq(3);
      if ((homeCell.attr("width") || "") !== "180") return;
      if ((awayCell.attr("width") || "") !== "180") return;
      const home = normalize(homeCell.text());
      const away = normalize(awayCell.text());
      if (!home || !away) return;
      const scoreText = normalize(scoreCell.text());
      const score = parseScore(scoreText);
      const played = Boolean(score);
      const { date, time, raw: dateRaw } = parsePlDate(dateCell.text());
      const match = {
        round: header.number,
        roundLabel: header.label,
        home,
        away,
        homeScore: score ? score.home : null,
        awayScore: score ? score.away : null,
        played,
        date,
        time,
        dateRaw,
        involvesWks: isWks(home) || isWks(away),
      };
      roundMatches.push(match);
      matches.push(match);
    });
    rounds.push({
      number: header.number,
      label: header.label,
      matches: roundMatches,
    });
  }
  return { matches, rounds };
}

function buildWksOverview(matches) {
  const wksMatches = matches
    .filter((m) => m.involvesWks)
    .sort((a, b) => {
      if (!a.date && !b.date) return a.round - b.round;
      if (!a.date) return 1;
      if (!b.date) return -1;
      return a.date.localeCompare(b.date);
    });

  const played = wksMatches.filter((m) => m.played);
  const upcoming = wksMatches.filter((m) => !m.played);

  const decorate = (m) => {
    const wksIsHome = isWks(m.home);
    const opponent = wksIsHome ? m.away : m.home;
    let result = null;
    if (m.played) {
      const ours = wksIsHome ? m.homeScore : m.awayScore;
      const theirs = wksIsHome ? m.awayScore : m.homeScore;
      let outcome = "draw";
      if (ours > theirs) outcome = "win";
      else if (ours < theirs) outcome = "loss";
      result = {
        ours,
        theirs,
        outcome,
        // „2:1” zawsze z perspektywy WKS (nasz wynik pierwszy)
        scoreLabel: `${ours}:${theirs}`,
        // „3:2” w układzie gospodarz:gość (do tabeli terminarza)
        homeAwayLabel: `${m.homeScore}:${m.awayScore}`,
      };
    }
    return {
      round: m.round,
      date: m.date,
      time: m.time,
      dateRaw: m.dateRaw,
      venue: wksIsHome ? "home" : "away",
      opponent,
      home: m.home,
      away: m.away,
      played: m.played,
      result,
    };
  };

  return {
    played: played.map(decorate),
    upcoming: upcoming.map(decorate),
  };
}

async function loadPreviousSnapshot() {
  try {
    const raw = await fs.readFile(OUT, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function main() {
  const previous = await loadPreviousSnapshot();
  try {
    const html = await fetchHtml(LEAGUE_URL);
    const $ = cheerio.load(html);
    const standings = parseStandings($);
    const { matches, rounds } = parseFixtures(html);
    const wks = buildWksOverview(matches);

    if (standings.length === 0 && matches.length === 0) {
      throw new Error(
        "90minut.pl zwrócił HTML, ale nic nie udało się sparsować – możliwa zmiana struktury strony."
      );
    }

    const snapshot = {
      season: SEASON_LABEL,
      source: LEAGUE_URL,
      fetchedAt: new Date().toISOString(),
      standings,
      rounds,
      wks,
    };
    await fs.writeFile(OUT, JSON.stringify(snapshot, null, 2) + "\n", "utf8");
    const wksRow = standings.find((s) => sameTeam(s.team, "WKS Wierzbice"));
    const pos = wksRow ? `${wksRow.position}. (${wksRow.points} pkt)` : "n/d";
    console.log(
      `[sync-90minut] OK – ${standings.length} drużyn, ${matches.length} meczów, ` +
        `WKS: ${pos}. Zapisano ${path.relative(ROOT, OUT)}.`
    );
  } catch (err) {
    console.warn(
      `[sync-90minut] Błąd synchronizacji: ${err.message}. ` +
        (previous
          ? `Używam poprzedniej migawki z ${previous.fetchedAt}.`
          : "Brak poprzedniej migawki – zapisuję pusty szkielet.")
    );
    if (!previous) {
      const fallback = {
        season: SEASON_LABEL,
        source: LEAGUE_URL,
        fetchedAt: null,
        fetchError: err.message,
        standings: [],
        rounds: [],
        wks: { played: [], upcoming: [] },
      };
      await fs.writeFile(
        OUT,
        JSON.stringify(fallback, null, 2) + "\n",
        "utf8"
      );
    }
    // Zachowujemy kod wyjścia 0, żeby nie blokować buildu, ale logujemy.
  }
}

main().catch((err) => {
  console.error("[sync-90minut] FATAL", err);
  process.exitCode = 1;
});
