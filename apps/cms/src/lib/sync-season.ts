import * as cheerio from 'cheerio'

const LEAGUE_URL = 'http://www.90minut.pl/liga/1/liga14275.html'
const SEASON_LABEL = 'Klasa okręgowa 2025/2026, grupa Wrocław'
const SEASON_START_YEAR = 2025
const SEASON_END_YEAR = 2026
const CLUB_NAME_NORMALIZED = 'wks wierzbice'

const PL_MONTHS: Record<string, number> = {
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
}

const normalize = (s = '') => s.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim()

const isWks = (team: string) => normalize(team).toLowerCase() === CLUB_NAME_NORMALIZED

type ParsedPlDate = { date: string | null; time: string | null; raw: string }

/** "10 sierpnia, 17:00" → { date: "2025-08-10", time: "17:00" } */
function parsePlDate(raw: string): ParsedPlDate {
  if (!raw) return { date: null, time: null, raw: '' }
  const text = normalize(raw)
  const m = text.match(/(\d{1,2})\s+([a-ząćęłńóśźż]+)(?:,\s*(\d{1,2}):(\d{2}))?/i)
  if (!m) return { date: null, time: null, raw: text }
  const day = Number(m[1])
  const monthName = m[2].toLowerCase()
  const month = PL_MONTHS[monthName]
  if (!month) return { date: null, time: null, raw: text }
  const year = month >= 7 ? SEASON_START_YEAR : SEASON_END_YEAR
  const dd = String(day).padStart(2, '0')
  const mm = String(month).padStart(2, '0')
  const time = m[3] && m[4] ? `${m[3].padStart(2, '0')}:${m[4]}` : null
  return { date: `${year}-${mm}-${dd}`, time, raw: text }
}

function parseScore(text: string) {
  const t = normalize(text).replace(/^<|>$/g, '')
  const m = t.match(/^(\d+)[-:](\d+)$/)
  if (!m) return null
  return { home: Number(m[1]), away: Number(m[2]) }
}

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; WKSWierzbiceSiteBot/1.0; +https://wkswierzbice.pl)',
      Accept: 'text/html,application/xhtml+xml',
    },
  })
  if (!res.ok) throw new Error(`90minut.pl ${url} – HTTP ${res.status}`)
  const buf = Buffer.from(await res.arrayBuffer())
  const decoder = new TextDecoder('iso-8859-2')
  return decoder.decode(buf)
}

function parseStandings($: cheerio.CheerioAPI) {
  const standings: any[] = []
  $('table.main2 tr').each((_, tr) => {
    const $tr = $(tr)
    const $tds = $tr.find('td')
    if ($tds.length < 20) return
    if ($tds.eq(0).attr('bgcolor')) return
    const first = normalize($tds.eq(0).text())
    const positionMatch = first.match(/^(\d+)\.$/)
    if (!positionMatch) return
    const nameCell = $tds.eq(1)
    const teamLink = nameCell.find('a').first()
    const team = normalize(teamLink.length ? teamLink.text() : nameCell.text())
    if (!team) return
    standings.push({
      position: Number(positionMatch[1]),
      team,
      played: Number(normalize($tds.eq(2).text())) || 0,
      points: Number(normalize($tds.eq(3).text())) || 0,
      wins: Number(normalize($tds.eq(4).text())) || 0,
      draws: Number(normalize($tds.eq(5).text())) || 0,
      losses: Number(normalize($tds.eq(6).text())) || 0,
      goals: normalize($tds.eq(7).text()),
    })
  })
  return standings
}

function parseFixtures(html: string) {
  const matches: any[] = []
  const rounds: any[] = []
  const roundHeaderRe = /<b><u>\s*Kolejka\s+(\d+)(?:\s*-\s*([^<]+))?<\/u><\/b>/gi
  const headerPositions: { number: number; label: string; start: number }[] = []
  let m: RegExpExecArray | null
  while ((m = roundHeaderRe.exec(html)) !== null) {
    headerPositions.push({
      number: Number(m[1]),
      label: normalize((m[2] || '').replace(/&nbsp;/g, ' ')),
      start: m.index,
    })
  }
  for (let i = 0; i < headerPositions.length; i++) {
    const header = headerPositions[i]
    const next = headerPositions[i + 1]
    const chunk = html.slice(header.start, next ? next.start : html.length)
    const $chunk = cheerio.load(`<div>${chunk}</div>`)
    const roundMatches: any[] = []
    $chunk('tr').each((_, tr) => {
      const $tr = $chunk(tr)
      const $tds = $tr.find('td')
      if ($tds.length < 4) return
      const homeCell = $tds.eq(0)
      const scoreCell = $tds.eq(1)
      const awayCell = $tds.eq(2)
      const dateCell = $tds.eq(3)
      if ((homeCell.attr('width') || '') !== '180') return
      if ((awayCell.attr('width') || '') !== '180') return
      const home = normalize(homeCell.text())
      const away = normalize(awayCell.text())
      if (!home || !away) return
      const scoreText = normalize(scoreCell.text())
      const score = parseScore(scoreText)
      const played = Boolean(score)
      const { date, time, raw: dateRaw } = parsePlDate(dateCell.text())
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
      }
      roundMatches.push(match)
      matches.push(match)
    })
    rounds.push({ number: header.number, label: header.label, matches: roundMatches })
  }
  return { matches, rounds }
}

function buildWksOverview(matches: any[]) {
  const wksMatches = matches
    .filter((m) => m.involvesWks)
    .sort((a, b) => {
      if (!a.date && !b.date) return a.round - b.round
      if (!a.date) return 1
      if (!b.date) return -1
      return a.date.localeCompare(b.date)
    })

  const played = wksMatches.filter((m) => m.played)
  const upcoming = wksMatches.filter((m) => !m.played)

  const decorate = (m: any) => {
    const wksIsHome = isWks(m.home)
    const opponent = wksIsHome ? m.away : m.home
    let result = null
    if (m.played) {
      const ours = wksIsHome ? m.homeScore : m.awayScore
      const theirs = wksIsHome ? m.awayScore : m.homeScore
      let outcome: 'win' | 'loss' | 'draw' = 'draw'
      if (ours > theirs) outcome = 'win'
      else if (ours < theirs) outcome = 'loss'
      result = {
        ours,
        theirs,
        outcome,
        scoreLabel: `${ours}:${theirs}`,
        homeAwayLabel: `${m.homeScore}:${m.awayScore}`,
      }
    }
    return {
      round: m.round,
      opponent,
      venue: wksIsHome ? 'home' : 'away',
      date: m.date,
      time: m.time,
      dateRaw: m.dateRaw,
      result,
    }
  }

  return {
    played: played.map(decorate),
    upcoming: upcoming.map(decorate),
  }
}

export type SeasonSnapshot = {
  season: string
  source: string
  fetchedAt: string
  standings: any[]
  rounds: any[]
  wks: any
}

export async function syncSeason(): Promise<SeasonSnapshot> {
  const html = await fetchHtml(LEAGUE_URL)
  const $ = cheerio.load(html)
  const standings = parseStandings($)
  const { matches, rounds } = parseFixtures(html)
  const wks = buildWksOverview(matches)
  return {
    season: SEASON_LABEL,
    source: LEAGUE_URL,
    fetchedAt: new Date().toISOString(),
    standings,
    rounds,
    wks,
  }
}

