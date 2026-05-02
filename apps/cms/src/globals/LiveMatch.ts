import type { GlobalConfig } from 'payload'
import { getRole } from '../access'
import { livePubSub } from '../live/pubsub'

export const LiveMatch: GlobalConfig = {
  slug: 'liveMatch',
  label: { pl: 'Relacja na żywo', en: 'Live match' },
  access: {
    read: () => true,
    update: ({ req }) => {
      const r = getRole(req)
      return r === 'admin' || r === 'redaktor' || r === 'trener'
    },
  },
  admin: {
    // Schowane z sidebara — wszystko robi się przez /admin/live-setup i /admin/live-studio.
    // Globala zostawiamy w schemie (przechowuje stan relacji), ale userzy nie wchodzą tu bezpośrednio.
    hidden: true,
    description:
      'Relacja na żywo w hero na stronie głównej. Edycja przez „Utwórz mecz live” + Studio Live. Bezpośrednia edycja tutaj jest schowana, żeby nie mylić.',
    components: {
      elements: {
        beforeDocumentControls: ['./components/LiveMatchWidget.tsx#default'],
      },
    },
  },
  hooks: {
    beforeChange: [
      ({ data }) => {
        // Czyszczenie: competitionCustomLabel ma sens TYLKO przy kind='custom'.
        // Bez tego label „TEST2” wpisany kiedyś przy kind='custom' wyciekał na stronę publiczną
        // nawet gdy admin przełączył mecz na kind='league'.
        if (data && (data as any).kind && (data as any).kind !== 'custom') {
          ;(data as any).competitionCustomLabel = null
        }
        return data
      },
    ],
    afterChange: [
      async ({ doc, previousDoc, req }) => {
        // 1. Publish latest snapshot for SSE subscribers.
        livePubSub.publish({ type: 'liveMatch', data: doc })

        // 2. When status transitions → 'ft', archive a snapshot to liveArchives
        //    so the editor can later write a news article from it.
        try {
          const prevStatus = (previousDoc as any)?.status
          const nextStatus = (doc as any)?.status
          if (nextStatus === 'ft' && prevStatus !== 'ft') {
            const home = (doc as any)?.homeLabel || 'Gospodarz'
            const away = (doc as any)?.awayLabel || 'Gość'
            const sh = Number((doc as any)?.scoreHome ?? 0)
            const sa = Number((doc as any)?.scoreAway ?? 0)
            const finishedAt = new Date()
            const dateLabel = finishedAt.toLocaleDateString('pl-PL', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })
            const title = `${home} ${sh}:${sa} ${away} · ${dateLabel}`

            // Compute duration: between kickoffReal and now (best-effort)
            let durationMinutes: number | undefined
            const kickoff = (doc as any)?.kickoffReal
            if (kickoff) {
              const ms = finishedAt.getTime() - new Date(kickoff).getTime()
              if (Number.isFinite(ms) && ms > 0) durationMinutes = Math.round(ms / 60000)
            }

            const matchRel = (doc as any)?.match
            const matchId =
              typeof matchRel === 'number' || typeof matchRel === 'string'
                ? matchRel
                : matchRel && typeof matchRel === 'object' && 'id' in matchRel
                  ? (matchRel as any).id
                  : undefined

            // Pull lineup from the linked match (if any)
            let lineupIds: number[] = []
            if (matchId) {
              try {
                const m = await req.payload.findByID({
                  collection: 'matches',
                  id: matchId as any,
                  depth: 0,
                })
                const raw = (m as any)?.lineup
                if (Array.isArray(raw)) {
                  lineupIds = raw
                    .map((x: any) => (typeof x === 'number' ? x : Number(x?.id ?? x)))
                    .filter((n: number) => Number.isFinite(n) && n > 0)
                }
              } catch {
                // ignore — archive without lineup if match fetch fails
              }
            }

            const customLabel = String((doc as any)?.competitionCustomLabel ?? '').trim() || null
            const competitionLabel =
              customLabel || String((doc as any)?.competitionLabel ?? '').trim() || null

            await req.payload.create({
              collection: 'liveArchives',
              data: {
                title,
                finishedAt: finishedAt.toISOString(),
                match: matchId as any,
                kind: ((doc as any)?.kind ?? 'league') as any,
                competitionLabel,
                homeLabel: home,
                awayLabel: away,
                scoreHome: sh,
                scoreAway: sa,
                finalScore: `${sh}:${sa}`,
                wksSide: home === 'WKS Wierzbice' ? 'home' : 'away',
                events: Array.isArray((doc as any)?.events) ? (doc as any).events : [],
                lineup: lineupIds,
                durationMinutes,
                usedForArticle: false,
              } as any,
            })

            // Cleanup terminarza: jeśli linkowany match był ręczny (test/sparing/puchar
            // one-off utworzony w Live Setup), usuwamy go z `matches` żeby nie zaśmiecał
            // listy. Mecze ligowe (source='imported' z 90minut) pozostają — terminarz
            // jest fundamentem strony publicznej.
            if (matchId) {
              try {
                const linked = await req.payload.findByID({
                  collection: 'matches',
                  id: matchId as any,
                  depth: 0,
                })
                if ((linked as any)?.source === 'manual') {
                  await req.payload.delete({
                    collection: 'matches',
                    id: matchId as any,
                  })
                }
              } catch (e) {
                // eslint-disable-next-line no-console
                console.warn('[liveMatch] Cleanup terminarza po FT pominięty:', e)
              }
            }
          }
        } catch (e) {
          // Don't break the live-match update if archiving fails — just log.
          // eslint-disable-next-line no-console
          console.error('[liveMatch] Nie udało się zarchiwizować zakończonej relacji:', e)
        }
      },
    ],
  },
  fields: [
    {
      name: 'enabled',
      type: 'checkbox',
      defaultValue: false,
      label: { pl: 'Włącz relację', en: 'Enable live match' },
      admin: { position: 'sidebar' },
    },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'pre',
      required: true,
      options: [
        { label: 'Przed meczem', value: 'pre' },
        { label: '1. połowa (live)', value: 'live' },
        { label: 'Przerwa', value: 'ht' },
        { label: '2. połowa (live)', value: 'live2' },
        { label: 'Koniec', value: 'ft' },
      ],
      label: { pl: 'Stan', en: 'State' },
      admin: { position: 'sidebar' },
    },
    {
      name: 'mode',
      type: 'select',
      defaultValue: 'fromMatch',
      required: true,
      options: [
        { label: 'Z terminarza', value: 'fromMatch' },
        { label: 'Ręcznie', value: 'manual' },
      ],
      label: { pl: 'Tryb danych meczu', en: 'Match data mode' },
      admin: { position: 'sidebar' },
    },
    {
      name: 'kind',
      type: 'select',
      defaultValue: 'league',
      required: true,
      options: [
        { label: 'Ligowy', value: 'league' },
        { label: 'Sparing', value: 'friendly' },
        { label: 'Puchar', value: 'cup' },
        { label: 'Własny tekst', value: 'custom' },
      ],
      label: { pl: 'Rodzaj meczu', en: 'Match kind' },
      admin: {
        position: 'sidebar',
        description: 'Wpływa na sugestię meczu oraz etykietę rozgrywek.',
      },
    },
    {
      name: 'match',
      type: 'relationship',
      relationTo: 'matches',
      label: { pl: 'Mecz (z terminarza)', en: 'Match (from schedule)' },
      admin: {
        position: 'sidebar',
        condition: (_, data) => data?.mode === 'fromMatch',
        description: 'Wybierz mecz z terminarza (liga/sparing/puchar). Studio i widget mogą sugerować najbliższy.',
      },
    },
    {
      name: 'competitionCustomLabel',
      type: 'text',
      label: { pl: 'Własny opis rozgrywek', en: 'Custom competition label' },
      admin: {
        position: 'sidebar',
        condition: (_, data) => data?.kind === 'custom' || data?.mode === 'manual',
        description: 'Np. „Sparing · Trening”, „Puchar Polski”, „Turniej”.',
      },
    },
    {
      name: 'competitionLabel',
      type: 'text',
      label: { pl: 'Rozgrywki / kolejka (opis)', en: 'Competition label' },
      admin: {
        condition: (_, data) => data?.mode === 'manual',
        description: 'Np. „Klasa okręgowa · K24”, „Puchar Polski”, „Sparing”.',
      },
    },
    {
      name: 'kickoffPlanned',
      type: 'date',
      label: { pl: 'Start (planowany)', en: 'Kickoff (planned)' },
      admin: {
        position: 'sidebar',
        description:
          'Używane w zapowiedzi pre‑match na stronie głównej („Relacja na żywo od HH:MM”). Gdy tryb = terminarz, możesz zostawić puste.',
      },
    },
    {
      name: 'kickoffReal',
      type: 'date',
      label: { pl: 'Start (realny)', en: 'Kickoff (real)' },
      admin: {
        position: 'sidebar',
        description: 'Od tego czasu liczona jest minuta w relacji (auto-clock).',
      },
    },
    {
      type: 'row',
      fields: [
        {
          name: 'addedTime1',
          type: 'number',
          min: 0,
          defaultValue: 0,
          label: { pl: 'Doliczony (1. poł.)', en: 'Added time (1H)' },
          admin: { width: '50%', position: 'sidebar' },
        },
        {
          name: 'addedTime2',
          type: 'number',
          min: 0,
          defaultValue: 0,
          label: { pl: 'Doliczony (2. poł.)', en: 'Added time (2H)' },
          admin: { width: '50%', position: 'sidebar' },
        },
      ],
    },
    {
      name: 'pauseAt',
      type: 'date',
      label: { pl: 'Pauza od (auto)', en: 'Paused at (auto)' },
      admin: {
        position: 'sidebar',
        readOnly: true,
        description: 'Ustawiane przez widget przy przejściu do przerwy.',
      },
    },
    {
      name: 'resumeAt',
      type: 'date',
      label: { pl: 'Wznowienie od (auto)', en: 'Resumed at (auto)' },
      admin: {
        position: 'sidebar',
        readOnly: true,
        description: 'Ustawiane przez widget przy starcie 2. połowy.',
      },
    },

    {
      name: 'homeLabel',
      type: 'text',
      required: false,
      defaultValue: 'WKS Wierzbice',
      label: { pl: 'Gospodarze', en: 'Home label' },
      admin: {
        condition: (_, data) => data?.mode === 'manual',
      },
    },
    {
      name: 'awayLabel',
      type: 'text',
      required: false,
      label: { pl: 'Goście', en: 'Away label' },
      admin: {
        condition: (_, data) => data?.mode === 'manual',
      },
    },

    // Legacy/DB compatibility: pola powstałe w dev podczas iteracji schematu.
    // Trzymamy je ukryte, żeby dev server nie próbował ich usuwać (drizzle push warnings).
    {
      name: 'manualCompetitionLabel',
      type: 'text',
      label: { pl: 'manualCompetitionLabel (ukryte)', en: 'manualCompetitionLabel (hidden)' },
      admin: { condition: () => false },
    },
    {
      name: 'manualHomeLabel',
      type: 'text',
      label: { pl: 'manualHomeLabel (ukryte)', en: 'manualHomeLabel (hidden)' },
      admin: { condition: () => false },
    },
    {
      name: 'manualAwayLabel',
      type: 'text',
      label: { pl: 'manualAwayLabel (ukryte)', en: 'manualAwayLabel (hidden)' },
      admin: { condition: () => false },
    },

    {
      type: 'row',
      fields: [
        {
          name: 'scoreHome',
          type: 'number',
          min: 0,
          defaultValue: 0,
          label: { pl: 'Gospodarze', en: 'Home' },
          admin: { width: '50%' },
        },
        {
          name: 'scoreAway',
          type: 'number',
          min: 0,
          defaultValue: 0,
          label: { pl: 'Goście', en: 'Away' },
          admin: { width: '50%' },
        },
      ],
    },
    {
      name: 'events',
      type: 'array',
      label: { pl: 'Zdarzenia', en: 'Events' },
      maxRows: 30,
      admin: {
        description:
          'Najpierw najnowsze. Dla WKS wybieraj zawodników z listy (bez literówek), dla rywala wpisz tekst ręcznie.',
      },
      fields: [
        {
          name: 'minute',
          type: 'number',
          min: 0,
          label: { pl: 'Minuta', en: 'Minute' },
          admin: { width: '15%' },
        },
        {
          name: 'half',
          type: 'select',
          options: [
            { label: '1', value: '1' },
            { label: '2', value: '2' },
          ],
          label: { pl: 'Połowa', en: 'Half' },
          admin: { width: '10%' },
        },
        {
          name: 'type',
          type: 'select',
          required: true,
          defaultValue: 'info',
          options: [
            { label: 'Gol', value: 'goal' },
            { label: 'Kartka', value: 'card' },
            { label: 'Zmiana', value: 'sub' },
            { label: 'Info', value: 'info' },
          ],
          label: { pl: 'Typ', en: 'Type' },
          admin: { width: '15%' },
        },
        {
          name: 'team',
          type: 'select',
          defaultValue: 'wks',
          options: [
            { label: 'WKS', value: 'wks' },
            { label: 'Rywal', value: 'opponent' },
          ],
          label: { pl: 'Drużyna', en: 'Team' },
          admin: {
            width: '15%',
            condition: (_, sibling) => sibling?.type !== 'info',
          },
        },
        {
          name: 'ownGoal',
          type: 'checkbox',
          defaultValue: false,
          label: { pl: 'Samobój', en: 'Own goal' },
          admin: {
            width: '15%',
            condition: (_, sibling) => sibling?.type === 'goal',
          },
        },
        {
          name: 'scorerWks',
          type: 'relationship',
          relationTo: 'players',
          label: { pl: 'Strzelec (WKS)', en: 'Scorer (WKS)' },
          admin: {
            condition: (_, sibling) => sibling?.type === 'goal' && sibling?.team === 'wks',
          },
        },
        {
          name: 'assistWks',
          type: 'relationship',
          relationTo: 'players',
          label: { pl: 'Asysta (WKS)', en: 'Assist (WKS)' },
          admin: {
            condition: (_, sibling) => sibling?.type === 'goal' && sibling?.team === 'wks',
          },
        },
        {
          name: 'scorerText',
          type: 'text',
          label: { pl: 'Strzelec (tekst, opcjonalnie)', en: 'Scorer (text, optional)' },
          admin: {
            description: 'Użyj, jeśli strzelec nie jest na liście kadry.',
            condition: (_, sibling) => sibling?.type === 'goal' && sibling?.team === 'wks',
          },
        },
        {
          name: 'assistText',
          type: 'text',
          label: { pl: 'Asysta (tekst, opcjonalnie)', en: 'Assist (text, optional)' },
          admin: {
            description: 'Opcjonalnie, jeśli nie wybierasz zawodnika.',
            condition: (_, sibling) => sibling?.type === 'goal' && sibling?.team === 'wks',
          },
        },
        {
          name: 'scorerOpponentText',
          type: 'text',
          label: { pl: 'Strzelec (rywal: imię/nazwisko/nr)', en: 'Scorer (opponent text)' },
          admin: {
            condition: (_, sibling) => sibling?.type === 'goal' && sibling?.team === 'opponent',
          },
        },
        {
          name: 'assistOpponentText',
          type: 'text',
          label: { pl: 'Asysta (rywal: tekst)', en: 'Assist (opponent text)' },
          admin: {
            condition: (_, sibling) => sibling?.type === 'goal' && sibling?.team === 'opponent',
          },
        },
        {
          name: 'text',
          type: 'text',
          required: false,
          label: { pl: 'Opis / notatka', en: 'Text' },
          admin: {
            condition: (_, sibling) => sibling?.type === 'info',
          },
        },
      ],
    },
  ],
}

