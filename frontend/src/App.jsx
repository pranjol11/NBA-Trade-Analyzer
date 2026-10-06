import React, { useEffect, useRef, useState } from 'react'

// NBA team ids (stats.nba.com) for logos, plus display names.
const TEAMS = {
  ATL: [1610612737, 'Atlanta Hawks'], BKN: [1610612751, 'Brooklyn Nets'], BOS: [1610612738, 'Boston Celtics'],
  CHA: [1610612766, 'Charlotte Hornets'], CHI: [1610612741, 'Chicago Bulls'], CLE: [1610612739, 'Cleveland Cavaliers'],
  DAL: [1610612742, 'Dallas Mavericks'], DEN: [1610612743, 'Denver Nuggets'], DET: [1610612765, 'Detroit Pistons'],
  GSW: [1610612744, 'Golden State Warriors'], HOU: [1610612745, 'Houston Rockets'], IND: [1610612754, 'Indiana Pacers'],
  LAC: [1610612746, 'LA Clippers'], LAL: [1610612747, 'Los Angeles Lakers'], MEM: [1610612763, 'Memphis Grizzlies'],
  MIA: [1610612748, 'Miami Heat'], MIL: [1610612749, 'Milwaukee Bucks'], MIN: [1610612750, 'Minnesota Timberwolves'],
  NOP: [1610612740, 'New Orleans Pelicans'], NYK: [1610612752, 'New York Knicks'], OKC: [1610612760, 'Oklahoma City Thunder'],
  ORL: [1610612753, 'Orlando Magic'], PHI: [1610612755, 'Philadelphia 76ers'], PHX: [1610612756, 'Phoenix Suns'],
  POR: [1610612757, 'Portland Trail Blazers'], SAC: [1610612758, 'Sacramento Kings'], SAS: [1610612759, 'San Antonio Spurs'],
  TOR: [1610612761, 'Toronto Raptors'], UTA: [1610612762, 'Utah Jazz'], WAS: [1610612764, 'Washington Wizards'],
}
const TEAM_CODES = Object.keys(TEAMS).sort()

const TeamLogo = ({ team, size = 20 }) => {
  const id = TEAMS[(team || '').toUpperCase()]?.[0]
  if (!id) return null
  return (
    <img
      src={`https://cdn.nba.com/logos/nba/${id}/global/L/logo.svg`}
      alt={`${team} logo`}
      width={size}
      height={size}
      className="inline-block shrink-0"
      onError={(e) => { e.currentTarget.style.display = 'none' }}
    />
  )
}

const presets = {
  'Custom': {
    sides: [
      { team: '', players_out: [], players_in: [], picks_out: [], picks_in: [] },
      { team: '', players_out: [], players_in: [], picks_out: [], picks_in: [] }
    ]
  },
  'Curry ↔ Tatum swap': {
    sides: [
      { team: 'GSW', players_out: ['Stephen Curry'], players_in: ['Jayson Tatum'], picks_out: [], picks_in: [] },
      { team: 'BOS', players_out: ['Jayson Tatum'], players_in: ['Stephen Curry'], picks_out: [], picks_in: [] }
    ]
  },
  'BOS ↔ BKN pick swap': {
    sides: [
      { team: 'BOS', players_out: [], players_in: [], picks_out: ['bos_2027_1st'], picks_in: ['brk_2027_1st'] },
      { team: 'BKN', players_out: [], players_in: [], picks_out: ['brk_2027_1st'], picks_in: ['bos_2027_1st'] }
    ]
  }
}

// Open/close state for a dropdown that closes on outside click or Escape.
const useDropdown = () => {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return [open, setOpen, ref]
}

const formatSalary = (s) => (s > 0 ? `$${(s / 1e6).toFixed(1)}M` : '—')

// "brk_2027_1st" -> "BKN 2027 1st"
const formatPick = (id) => {
  const [prefix, year, round] = String(id).split('_')
  if (!year || !round) return String(id)
  const team = { BRK: 'BKN' }[prefix.toUpperCase()] || prefix.toUpperCase()
  return `${team} ${year} ${round}`
}

const Label = ({ children }) => (
  <div className="font-display text-xs font-semibold uppercase tracking-[0.14em] text-muted mb-1.5">{children}</div>
)

const menuClass = 'absolute z-20 mt-1 max-h-72 overflow-y-auto bg-card border border-ink text-sm'
const menuItemClass = 'flex items-center gap-2 w-full text-left px-3 py-1.5 hover:bg-paper'

const TeamSelect = ({ value, onChange, disabled }) => {
  const [open, setOpen, ref] = useDropdown()
  const [query, setQuery] = useState('')
  const matches = TEAM_CODES.filter(code => code.startsWith(query))

  useEffect(() => { if (!open) setQuery('') }, [open])

  const pick = (code) => { onChange(code); setOpen(false) }

  return (
    <div className="relative" ref={ref}>
      <div className={`flex items-center h-10 w-32 border px-2.5 ${disabled ? 'border-rule bg-paper text-muted' : 'border-ink bg-card'}`}>
        <input
          value={open ? query : value}
          onChange={(e) => { setQuery(e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3)); setOpen(true) }}
          onFocus={() => setOpen(true)}
          onClick={() => setOpen(true)}
          onKeyDown={(e) => { if (e.key === 'Enter' && matches.length) { e.preventDefault(); pick(matches[0]) } }}
          disabled={disabled}
          placeholder={open ? 'Type…' : 'Team'}
          className="w-full min-w-0 bg-transparent outline-none font-display text-xl font-semibold tracking-wide placeholder:text-muted/60 placeholder:font-medium"
          aria-label="Team"
        />
        <span className="text-muted text-xs">▾</span>
      </div>
      {open && !disabled && (
        <div className={`${menuClass} w-64`}>
          {matches.length === 0 && <div className="px-3 py-1.5 text-muted">No match</div>}
          {matches.map((code, i) => (
            <button
              type="button"
              key={code}
              onClick={() => pick(code)}
              className={`${menuItemClass} ${code === value || (query && i === 0) ? 'bg-paper' : ''}`}
            >
              <TeamLogo team={code} size={20} />
              <span className="font-display font-semibold text-base w-10">{code}</span>
              <span className="text-xs text-muted truncate">{TEAMS[code][1]}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// Chips for chosen assets plus a dropdown of the team's remaining ones.
// options: [{ value, label, detail }]
const AssetPicker = ({ tokens, options, onAdd, onRemove, locked, placeholder, emptyText, formatToken = (t) => t }) => {
  const [open, setOpen, ref] = useDropdown()
  const remaining = options.filter(o => !tokens.includes(o.value))
  const disabled = locked || options.length === 0

  if (locked && tokens.length === 0) return <div className="text-sm text-muted">—</div>

  return (
    <div>
      {tokens.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {tokens.map((t, i) => (
            <span key={t} className="inline-flex items-center gap-2 pl-2.5 pr-1.5 py-1 border border-ink bg-card text-sm font-medium">
              {formatToken(t)}
              {!locked && (
                <button type="button" onClick={() => onRemove(i)} aria-label={`Remove ${formatToken(t)}`}
                  className="text-muted hover:text-accent leading-none px-0.5">✕</button>
              )}
            </span>
          ))}
        </div>
      )}
      {!locked && (
        <div className="relative" ref={ref}>
          <button
            type="button"
            onClick={() => setOpen(o => !o)}
            disabled={disabled}
            className="flex items-center w-full h-9 text-sm border border-dashed border-rule px-2.5 text-left hover:border-ink disabled:hover:border-rule disabled:cursor-default"
          >
            <span className="text-muted">{(options.length === 0 ? emptyText : `+ ${placeholder}`) || ' '}</span>
          </button>
          {open && !disabled && (
            <div className={`${menuClass} w-full`}>
              {remaining.length === 0 && <div className="px-3 py-1.5 text-muted">All added</div>}
              {remaining.map(o => (
                <button
                  type="button"
                  key={o.value}
                  onClick={() => { onAdd(o.value); setOpen(false) }}
                  className={menuItemClass}
                >
                  <span>{o.label}</span>
                  {o.detail && <span className="ml-auto text-xs text-muted tabular-nums whitespace-nowrap">{o.detail}</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

const gradeColor = (letter = 'F') => (
  { A: 'text-win', B: letter === 'B' ? 'text-even' : 'text-win', C: 'text-loss', D: 'text-loss', F: 'text-loss' }[letter[0]] || 'text-loss'
)

const AssetTable = ({ title, assets = [], total = 0 }) => (
  <div>
    <Label>{title}</Label>
    {assets.length === 0 ? <div className="text-sm text-muted">Nothing</div> : (
      <table className="w-full text-sm">
        <tbody>
          {assets.map((a, i) => (
            <tr key={i} className="border-t border-rule">
              <td className="py-1">{a.name}</td>
              <td className="py-1 text-right tabular-nums text-muted">{a.value.toFixed(1)}</td>
            </tr>
          ))}
          {assets.length > 1 && (
            <tr className="border-t border-ink font-semibold">
              <td className="py-1">Total</td>
              <td className="py-1 text-right tabular-nums">{total.toFixed(1)}</td>
            </tr>
          )}
        </tbody>
      </table>
    )}
  </div>
)

const LegalityLine = ({ data }) => {
  if (!data) return null
  const issues = data.issues || []
  return (
    <div className="mb-5">
      <div className={`font-display text-sm font-semibold uppercase tracking-[0.14em] ${data.legal ? 'text-win' : 'text-loss'}`}>
        {data.legal ? '✓ Legal trade' : `✕ Not legal as built — ${issues.length} issue${issues.length === 1 ? '' : 's'}`}
      </div>
      {issues.length > 0 && (
        <ul className="mt-2 border-l-2 border-loss pl-3 space-y-1">
          {issues.map((it, i) => (
            <li key={i} className="text-sm">
              <span className="font-mono text-[11px] text-muted mr-2">{it.code}</span>{it.message}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

const Scoreboard = ({ grades = [] }) => (
  <div className="grid md:grid-cols-2 border-t border-ink">
    {grades.map((g, i) => (
      <div key={i} className={`py-5 ${i === 1 ? 'md:pl-8 md:border-l border-rule border-t md:border-t-0' : 'md:pr-8'}`}>
        <div className="flex items-center gap-3">
          <TeamLogo team={g.team} size={40} />
          <div className="min-w-0">
            <div className="font-display text-2xl font-semibold leading-none">{g.team}</div>
            <div className="text-xs text-muted truncate">{TEAMS[g.team]?.[1]}</div>
          </div>
          <div className="ml-auto text-right">
            <div className="flex items-baseline justify-end gap-2">
              <span className={`font-display text-2xl font-bold ${gradeColor(g.letter)}`}>{g.letter}</span>
              <span className="font-display text-5xl font-bold leading-none tabular-nums">{Math.round(g.grade)}</span>
            </div>
            <div className="text-[11px] text-muted uppercase tracking-wider">out of 100</div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-6 mt-5">
          <AssetTable title="Receives" assets={g.assets_in} total={g.value_in} />
          <AssetTable title="Sends" assets={g.assets_out} total={g.value_out} />
        </div>
      </div>
    ))}
  </div>
)

export default function App() {
  const API_BASE = (import.meta?.env?.VITE_API_BASE) ? (import.meta.env.VITE_API_BASE || '') : ''
  const initial = presets['Custom']
  const [activeTab, setActiveTab] = useState('builder') // 'builder' | 'json'
  const [builder, setBuilder] = useState(() => JSON.parse(JSON.stringify(initial)))
  const [jsonText, setJsonText] = useState(JSON.stringify(initial, null, 2))
  const [busy, setBusy] = useState(false)
  const [mode, setMode] = useState('') // 'validate' | 'evaluate'
  const [error, setError] = useState('')
  const [result, setResult] = useState(null) // object or string

  const setPreset = (name) => {
    const p = presets[name]
    setBuilder(JSON.parse(JSON.stringify(p)))
    setJsonText(JSON.stringify(p, null, 2))
    setActivePreset(name)
  }
  const [activePreset, setActivePreset] = useState('Custom')
  const isLocked = activePreset !== 'Custom'

  const [teamAssets, setTeamAssets] = useState({}) // team code -> { players, picks }
  const selectedTeams = builder.sides.map(s => s?.team || '').join(',')
  useEffect(() => {
    selectedTeams.split(',').forEach(code => {
      if (!code || teamAssets[code]) return
      fetch(`${API_BASE}/teams/${code}/assets`)
        .then(r => r.json())
        .then(data => setTeamAssets(prev => ({ ...prev, [code]: data })))
        .catch(() => {})
    })
  }, [selectedTeams])

  const playerOptions = (code) => (teamAssets[code]?.players || []).map(p => ({
    value: p.name,
    label: p.name,
    detail: `${p.value.toFixed(0)} val · ${formatSalary(p.salary)}${p.two_way ? ' · two-way' : ''}`,
  }))
  const pickOptions = (code) => (teamAssets[code]?.picks || []).map(p => ({
    value: p.pick_id,
    label: `${p.year} ${p.round === 1 ? '1st' : '2nd'}${p.original_team !== code ? ` (via ${p.original_team})` : ''}`,
    detail: [p.protection.replace(/^top(\d+)$/, 'top-$1 prot.'), `${p.value.toFixed(0)} val`].filter(Boolean).join(' · '),
  }))
  const emptyText = (code, kind) =>
    !code ? '' : !teamAssets[code] ? 'Loading…' : `No ${kind} available`

  const parsePayload = () => {
    try { return JSON.parse(jsonText) } catch (e) { throw new Error('Invalid JSON: ' + e.message) }
  }

  const postJSON = async (url, body, m) => {
    setBusy(true); setMode(m); setError(''); setResult(null)
    try {
      const target = url.startsWith('http') ? url : `${API_BASE}${url}`
      const res = await fetch(target, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const text = await res.text()
      try { setResult(JSON.parse(text)) } catch { setResult(text) }
    } catch (e) {
      setError(String(e))
    } finally {
      setBusy(false)
    }
  }

  const currentPayload = () => activeTab === 'builder' ? builder : parsePayload()

  const onValidate = () => postJSON('/trade/validate', currentPayload(), 'validate')
  const onEvaluate = () => postJSON('/trade/evaluate', currentPayload(), 'evaluate')

  // Switching teams drops what the old team was giving up (and the mirrored receives).
  const changeTeam = (idx, team) => {
    setBuilder(prev => {
      const side = prev.sides[idx]
      if (side.team === team) return prev
      const next = JSON.parse(JSON.stringify(prev))
      const other = next.sides[idx === 0 ? 1 : 0]
      if (other) {
        other.players_in = other.players_in.filter(p => !side.players_out.includes(p))
        other.picks_in = other.picks_in.filter(p => !side.picks_out.includes(p))
      }
      next.sides[idx] = { ...next.sides[idx], team, players_out: [], picks_out: [] }
      return next
    })
  }

  const addToken = (idx, key, value) => {
    if (!value) return
    setBuilder(prev => {
      const next = JSON.parse(JSON.stringify(prev))
      next.sides[idx][key].push(value)

      // Auto-mirror: what one team gives up, the other receives
      const otherIdx = idx === 0 ? 1 : 0
      if (key === 'players_out' && next.sides[otherIdx]) {
        if (!next.sides[otherIdx].players_in.includes(value)) {
          next.sides[otherIdx].players_in.push(value)
        }
      } else if (key === 'picks_out' && next.sides[otherIdx]) {
        if (!next.sides[otherIdx].picks_in.includes(value)) {
          next.sides[otherIdx].picks_in.push(value)
        }
      }

      return next
    })
  }

  const removeToken = (idx, key, i) => {
    setBuilder(prev => {
      const next = JSON.parse(JSON.stringify(prev))
      const removedValue = next.sides[idx][key][i]
      next.sides[idx][key].splice(i, 1)

      // Auto-mirror removal: remove from other team's receives
      const otherIdx = idx === 0 ? 1 : 0
      if (key === 'players_out' && next.sides[otherIdx]) {
        const inIdx = next.sides[otherIdx].players_in.indexOf(removedValue)
        if (inIdx !== -1) {
          next.sides[otherIdx].players_in.splice(inIdx, 1)
        }
      } else if (key === 'picks_out' && next.sides[otherIdx]) {
        const inIdx = next.sides[otherIdx].picks_in.indexOf(removedValue)
        if (inIdx !== -1) {
          next.sides[otherIdx].picks_in.splice(inIdx, 1)
        }
      }

      return next
    })
  }

  const ResultPanel = () => {
    if (error) return <div className="text-sm text-loss">{error}</div>
    if (typeof result === 'string') {
      return <pre className="bg-card border border-rule p-3 text-xs overflow-auto h-72 whitespace-pre">{result}</pre>
    }
    if (mode === 'validate') return <LegalityLine data={result} />
    if (mode === 'evaluate') {
      return (
        <>
          <LegalityLine data={result.legality} />
          {Array.isArray(result.grades) && result.grades.length > 0
            ? <Scoreboard grades={result.grades} />
            : <div className="text-sm text-muted">No grades returned.</div>}
        </>
      )
    }
    return <pre className="bg-card border border-rule p-3 text-xs overflow-auto h-72 whitespace-pre-wrap">{JSON.stringify(result, null, 2)}</pre>
  }

  const tabClass = (tab) => `pb-0.5 border-b-2 ${activeTab === tab ? 'border-accent text-white' : 'border-transparent text-white/60 hover:text-white'}`

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-ink text-white">
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src="https://cdn.nba.com/logos/leagues/logo-nba.svg" alt="NBA logo" className="h-10 sm:h-12 w-auto" />
            <h1 className="font-display text-3xl sm:text-4xl font-bold uppercase tracking-wide leading-none">
              <span className="sr-only">NBA </span>Trade Analyzer
            </h1>
          </div>
          <div className="flex items-center gap-5 font-display text-sm font-semibold uppercase tracking-wider">
            <select
              className="bg-card text-ink border border-card px-2 py-1 normal-case tracking-normal font-sans font-medium"
              onChange={(e) => setPreset(e.target.value)}
              value={activePreset}
              aria-label="Example trades"
            >
              {Object.keys(presets).map((k) => <option key={k} value={k}>{k}</option>)}
            </select>
            <button type="button" className={tabClass('builder')} onClick={() => setActiveTab('builder')}>Builder</button>
            <button type="button" className={tabClass('json')}
              onClick={() => { if (activeTab !== 'json') setJsonText(JSON.stringify(builder, null, 2)); setActiveTab('json') }}>JSON</button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 pt-10 pb-10 sm:pt-14">
        <section className="bg-card border border-ink">
          {activeTab === 'builder' ? (
            <div className="relative grid md:grid-cols-2">
              <div className="hidden md:flex absolute inset-y-0 left-1/2 -translate-x-1/2 items-center pointer-events-none">
                <div className="h-full w-px bg-rule" />
                <span className="absolute left-1/2 -translate-x-1/2 bg-card border border-ink w-9 h-9 flex items-center justify-center font-display text-lg">⇄</span>
              </div>
              {[0, 1].map(idx => {
                const side = builder.sides[idx] || {}
                const code = side.team || ''
                const receives = [...(side.players_in || []), ...(side.picks_in || []).map(formatPick)]
                return (
                  <div key={idx} className={`p-5 sm:p-6 ${idx === 0 ? 'md:pr-10' : 'md:pl-10 border-t md:border-t-0 border-rule'}`}>
                    <div className="flex items-center gap-3 mb-6 min-h-12">
                      <div className="w-12 h-12 flex items-center justify-center border border-rule bg-paper shrink-0">
                        {code ? <TeamLogo team={code} size={36} /> : <span className="font-display text-muted">{idx + 1}</span>}
                      </div>
                      <TeamSelect value={code} onChange={(team) => changeTeam(idx, team)} disabled={isLocked} />
                      <div className="text-sm text-muted truncate">{TEAMS[code]?.[1] || `Team ${idx + 1}`}</div>
                    </div>
                    <div className="space-y-5">
                      <div>
                        <Label>Sends · Players</Label>
                        <AssetPicker
                          tokens={side.players_out || []}
                          options={playerOptions(code)}
                          onAdd={(val) => addToken(idx, 'players_out', val)}
                          onRemove={(i) => removeToken(idx, 'players_out', i)}
                          locked={isLocked}
                          placeholder="Add player"
                          emptyText={emptyText(code, 'players')}
                        />
                      </div>
                      <div>
                        <Label>Sends · Picks</Label>
                        <AssetPicker
                          tokens={side.picks_out || []}
                          options={pickOptions(code)}
                          onAdd={(val) => addToken(idx, 'picks_out', val)}
                          onRemove={(i) => removeToken(idx, 'picks_out', i)}
                          locked={isLocked}
                          placeholder="Add pick"
                          emptyText={emptyText(code, 'picks')}
                          formatToken={formatPick}
                        />
                      </div>
                      <div>
                        <Label>Receives</Label>
                        <div className="text-sm">{receives.length ? receives.join(', ') : <span className="text-muted">—</span>}</div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="p-5 sm:p-6">
              <Label>Trade JSON</Label>
              <textarea
                className="w-full h-80 font-mono text-sm border border-rule bg-paper p-3 focus:outline-none focus:border-ink"
                value={jsonText}
                onChange={(e) => setJsonText(e.target.value)}
                spellCheck={false}
              />
            </div>
          )}

          <div className="border-t border-ink px-5 sm:px-6 py-4 flex flex-wrap items-center gap-4">
            <button type="button" disabled={busy} onClick={onEvaluate}
              className="bg-ink text-white font-display text-base font-semibold uppercase tracking-wider px-5 h-11 hover:bg-accent disabled:opacity-60 flex items-center gap-2">
              {busy && mode === 'evaluate' && <span className="inline-block w-3.5 h-3.5 border-2 border-white/80 border-t-transparent rounded-full animate-spin" />}
              Grade trade
            </button>
            <button type="button" disabled={busy} onClick={onValidate}
              className="font-display text-base font-semibold uppercase tracking-wider px-1 h-11 underline underline-offset-4 decoration-rule hover:decoration-ink disabled:opacity-60 flex items-center gap-2">
              {busy && mode === 'validate' && <span className="inline-block w-3.5 h-3.5 border-2 border-ink/60 border-t-transparent rounded-full animate-spin" />}
              Legality
            </button>
            {busy && <span className="text-sm text-muted">Waking the server can take up to a minute on the first request.</span>}
            {isLocked && !busy && <span className="text-sm text-muted">Example trades are read-only. Pick “Custom” to build your own.</span>}
          </div>
        </section>

        {(result != null || error) && (
          <section className="mt-8">
            <h2 className="font-display text-2xl font-bold uppercase tracking-wide mb-3">The verdict</h2>
            <ResultPanel />
          </section>
        )}
      </main>
    </div>
  )
}
