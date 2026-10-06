import React, { useEffect, useMemo, useRef, useState } from 'react'

// NBA team ids (stats.nba.com), used for logos and team input suggestions
const TEAM_IDS = {
  ATL: 1610612737, BOS: 1610612738, BKN: 1610612751, CHA: 1610612766, CHI: 1610612741, CLE: 1610612739,
  DAL: 1610612742, DEN: 1610612743, DET: 1610612765, GSW: 1610612744, HOU: 1610612745, IND: 1610612754,
  LAC: 1610612746, LAL: 1610612747, MEM: 1610612763, MIA: 1610612748, MIL: 1610612749, MIN: 1610612750,
  NOP: 1610612740, NYK: 1610612752, OKC: 1610612760, ORL: 1610612753, PHI: 1610612755, PHX: 1610612756,
  POR: 1610612757, SAC: 1610612758, SAS: 1610612759, TOR: 1610612761, UTA: 1610612762, WAS: 1610612764,
}
const TEAM_CODES = Object.keys(TEAM_IDS).sort()

const TeamLogo = ({ team, size = 20 }) => {
  const id = TEAM_IDS[(team || '').toUpperCase()]
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

const TeamSelect = ({ value, onChange, disabled }) => {
  const [open, setOpen, ref] = useDropdown()

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        disabled={disabled}
        className="flex items-center gap-2 text-sm border rounded px-2 py-1 w-28 bg-white disabled:bg-gray-100 disabled:text-gray-500"
      >
        <TeamLogo team={value} size={18} />
        <span className={value ? '' : 'text-gray-400'}>{value || 'Select'}</span>
        <span className="ml-auto text-gray-400 text-xs">▾</span>
      </button>
      {open && !disabled && (
        <div className="absolute z-10 mt-1 w-28 max-h-64 overflow-y-auto bg-white border rounded shadow text-sm">
          {TEAM_CODES.map(code => (
            <button
              type="button"
              key={code}
              onClick={() => { onChange(code); setOpen(false) }}
              className={`flex items-center gap-2 w-full text-left px-2 py-1 hover:bg-indigo-50 ${code === value ? 'bg-indigo-50 font-semibold' : ''}`}
            >
              <TeamLogo team={code} size={18} />{code}
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

  return (
    <div>
      {tokens.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {tokens.map((t, i) => (
            <span key={t} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm bg-gray-100 border font-medium">
              <span>{formatToken(t)}</span>
              {!locked && (
                <button type="button" onClick={() => onRemove(i)} className="text-gray-500 hover:text-red-600 text-base leading-none">×</button>
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
            className="flex items-center w-full text-sm border rounded px-2 py-1 bg-white text-left disabled:bg-gray-100"
          >
            <span className="text-gray-400">{(options.length === 0 ? emptyText : placeholder) || ' '}</span>
            <span className="ml-auto text-gray-400 text-xs">▾</span>
          </button>
          {open && !disabled && (
            <div className="absolute z-10 mt-1 w-full max-h-64 overflow-y-auto bg-white border rounded shadow text-sm">
              {remaining.length === 0 && <div className="px-2 py-1 text-gray-400">All added</div>}
              {remaining.map(o => (
                <button
                  type="button"
                  key={o.value}
                  onClick={() => { onAdd(o.value); setOpen(false) }}
                  className="flex items-center gap-2 w-full text-left px-2 py-1 hover:bg-indigo-50"
                >
                  <span>{o.label}</span>
                  {o.detail && <span className="ml-auto text-xs text-gray-500">{o.detail}</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

const LETTER_STYLES = {
  A: 'bg-emerald-100 text-emerald-800',
  B: 'bg-green-100 text-green-800',
  C: 'bg-yellow-100 text-yellow-800',
  D: 'bg-orange-100 text-orange-800',
  F: 'bg-red-100 text-red-800',
}

const AssetValues = ({ assets = [], total = 0 }) => (
  assets.length === 0 ? <span className="text-gray-400">Nothing</span> : (
    <div className="space-y-0.5">
      {assets.map((a, i) => (
        <div key={i} className="flex gap-3 justify-between max-w-xs">
          <span>{a.name}</span><span className="text-gray-600 tabular-nums">{a.value.toFixed(1)}</span>
        </div>
      ))}
      {assets.length > 1 && (
        <div className="flex gap-3 justify-between max-w-xs border-t pt-0.5 font-medium">
          <span>Total</span><span className="tabular-nums">{total.toFixed(1)}</span>
        </div>
      )}
    </div>
  )
)

const Badge = ({ color = 'gray', children }) => (
  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-${color}-100 text-${color}-800 border border-${color}-200`}>{children}</span>
)

const Card = ({ title, actions, children, className = '' }) => (
  <section className={`bg-white border rounded-xl shadow-sm ${className}`}>
    <div className="px-4 py-3 border-b flex items-center justify-between gap-4">
      <h2 className="text-base font-semibold">{title}</h2>
      <div className="flex gap-2">{actions}</div>
    </div>
    <div className="p-4">{children}</div>
  </section>
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
    detail: `value ${p.value.toFixed(0)} · ${formatSalary(p.salary)}${p.two_way ? ' · two-way' : ''}`,
  }))
  const pickOptions = (code) => (teamAssets[code]?.picks || []).map(p => ({
    value: p.pick_id,
    label: `${p.year} ${p.round === 1 ? '1st' : '2nd'}${p.original_team !== code ? ` (via ${p.original_team})` : ''}`,
    detail: [p.protection.replace(/^top(\d+)$/, 'top-$1 protected'), `value ${p.value.toFixed(0)}`].filter(Boolean).join(' · '),
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

  // ------- Small helpers for Builder UI -------
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
      // Add to the specified side
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

  const Legality = ({ data }) => {
    if (!data) return null
    const legal = !!data.legal
    return (
      <div className="flex items-center gap-2">
        <Badge color={legal ? 'green' : 'red'}>{legal ? 'LEGAL' : 'POTENTIAL ISSUES'}</Badge>
        {Array.isArray(data.issues) && data.issues.length > 0 && (
          <span className="text-xs text-gray-500">{data.issues.length} issue(s)</span>
        )}
      </div>
    )
  }

  const IssuesList = ({ issues = [] }) => (
    <ul className="mt-2 space-y-2">
      {issues.map((it, idx) => (
        <li key={idx} className="p-2 rounded border bg-amber-50 border-amber-200">
          <div className="flex items-center gap-2">
            <Badge color="amber">{it.code}</Badge>
            <span className="text-sm text-amber-900">{it.message}</span>
          </div>
        </li>
      ))}
    </ul>
  )

  const GradesTable = ({ grades = [] }) => (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="text-left text-gray-600">
            <th className="py-2 pr-4">Team</th>
            <th className="py-2 pr-4">Grade</th>
            <th className="py-2 pr-4">Receives</th>
            <th className="py-2 pr-4">Sends</th>
          </tr>
        </thead>
        <tbody>
          {grades.map((g, i) => (
            <tr key={i} className="border-t align-top">
              <td className="py-2 pr-4 font-medium">
                <span className="inline-flex items-center gap-2"><TeamLogo team={g.team} />{g.team}</span>
              </td>
              <td className="py-2 pr-4 whitespace-nowrap">
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold mr-2 ${LETTER_STYLES[g.letter[0]] || LETTER_STYLES.F}`}>{g.letter}</span>
                <span className="font-semibold">{Math.round(g.grade)}</span><span className="text-gray-400">/100</span>
              </td>
              <td className="py-2 pr-4"><AssetValues assets={g.assets_in} total={g.value_in} /></td>
              <td className="py-2 pr-4"><AssetValues assets={g.assets_out} total={g.value_out} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )

  const ResultPanel = () => {
    if (error) return (
      <div className="p-3 rounded border bg-red-50 border-red-200 text-sm text-red-800">{error}</div>
    )
    if (typeof result === 'string') {
      return <pre className="bg-gray-50 border rounded p-3 text-xs overflow-auto h-72 whitespace-pre">{result}</pre>
    }
    if (mode === 'validate') {
      return (
        <div className="space-y-2">
          <Legality data={result} />
          {Array.isArray(result.issues) && result.issues.length > 0 && <IssuesList issues={result.issues} />}
        </div>
      )
    }
    if (mode === 'evaluate') {
      return (
        <div className="space-y-3">
          <Legality data={result.legality} />
          {result.legality?.issues?.length > 0 && <IssuesList issues={result.legality.issues} />}
          {Array.isArray(result.grades) && result.grades.length > 0 ? (
            <GradesTable grades={result.grades} />
          ) : (
            <div className="text-sm text-gray-600">No grades returned.</div>
          )}
        </div>
      )
    }
    return <pre className="bg-gray-50 border rounded p-3 text-xs overflow-auto h-72 whitespace-pre-wrap">{JSON.stringify(result, null, 2)}</pre>
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white">
      <div className="max-w-6xl mx-auto p-4">
        <header className="rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-sky-500 text-white p-5 mb-6 shadow">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold">NBA Trade Analyzer</h1>
              <p className="text-sm text-indigo-100">Create trades and evaluate them</p>
            </div>
          </div>
        </header>

        <div className="space-y-6">
          <Card
            title="Trade Builder"
            actions={(
              <div className="flex items-center gap-2">
                <select className="text-sm border rounded px-2 py-1 bg-white" onChange={(e) => setPreset(e.target.value)} value={activePreset}>
                  {Object.keys(presets).map((k) => <option key={k} value={k}>{k}</option>)}
                </select>
                <div className="text-xs bg-gray-100 rounded border px-1.5 py-0.5">Mode:</div>
                <div className="inline-flex rounded-lg overflow-hidden border">
                  <button type="button" className={`px-2 py-1 text-sm ${activeTab==='builder'?'bg-indigo-600 text-white':'bg-white'}`} onClick={()=>setActiveTab('builder')}>Builder</button>
                  <button type="button" className={`px-2 py-1 text-sm ${activeTab==='json'?'bg-indigo-600 text-white':'bg-white'}`} onClick={()=>{ if (activeTab !== 'json') setJsonText(JSON.stringify(builder, null, 2)); setActiveTab('json') }}>JSON</button>
                </div>
              </div>
            )}
          >
            {activeTab === 'builder' ? (
              <div className="space-y-4">
                <div className="rounded-lg border p-4">
                  <div className="grid grid-cols-2 gap-6">
                    {[0, 1].map(idx => {
                      const side = builder.sides[idx] || {}
                      const code = side.team || ''
                      return (
                        <div key={idx}>
                          <div className="flex items-center gap-2 mb-3">
                            <label className="text-sm font-semibold text-gray-700">Team {idx + 1}</label>
                            <TeamSelect value={code} onChange={(team)=>changeTeam(idx, team)} disabled={isLocked} />
                          </div>
                          <div className="space-y-3">
                            <div>
                              <div className="text-sm font-medium text-gray-600 mb-1">Gives Up Players</div>
                              <AssetPicker
                                tokens={side.players_out || []}
                                options={playerOptions(code)}
                                onAdd={(val)=>addToken(idx,'players_out',val)}
                                onRemove={(i)=>removeToken(idx,'players_out',i)}
                                locked={isLocked}
                                placeholder="Add a player"
                                emptyText={emptyText(code, 'players')}
                              />
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-600 mb-1">Gives Up Picks</div>
                              <AssetPicker
                                tokens={side.picks_out || []}
                                options={pickOptions(code)}
                                onAdd={(val)=>addToken(idx,'picks_out',val)}
                                onRemove={(i)=>removeToken(idx,'picks_out',i)}
                                locked={isLocked}
                                placeholder="Add a pick"
                                emptyText={emptyText(code, 'picks')}
                                formatToken={formatPick}
                              />
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
                {isLocked && <p className="text-xs text-gray-500">Preset trade locked. Choose "Custom" to build your own.</p>}
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Trade JSON</label>
                <textarea
                  className="w-full h-80 font-mono text-sm border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={jsonText}
                  onChange={(e) => setJsonText(e.target.value)}
                  spellCheck={false}
                />
              </div>
            )}
            <div className="mt-4 flex gap-3">
              <button type="button" disabled={busy} onClick={onValidate} className="px-3 py-2 rounded-lg border bg-white hover:bg-gray-50 disabled:opacity-60 flex items-center gap-2">
                {busy && mode === 'validate' && <span className="inline-block w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />} Validate
              </button>
              <button type="button" disabled={busy} onClick={onEvaluate} className="px-3 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60 flex items-center gap-2">
                {busy && mode === 'evaluate' && <span className="inline-block w-3 h-3 border-2 border-white/80 border-t-transparent rounded-full animate-spin" />} Evaluate
              </button>
            </div>
          </Card>

          {(result != null || error) && (
            <Card title="Grades">
              <ResultPanel />
            </Card>
          )}
        </div>

        <div className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mt-6 mb-4 text-center">
          ⏳ <strong>Note:</strong> Initial data loading and trade processing may take 50+ seconds due to free tier hosting on Render.
        </div>

        <footer className="text-xs text-gray-500 mt-8 mb-6 text-center">Vite + React • Calling FastAPI at http://localhost:8000 via proxy</footer>
      </div>
    </div>
  )
}
