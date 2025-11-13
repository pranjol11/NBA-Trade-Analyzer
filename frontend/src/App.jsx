import React, { useEffect, useMemo, useRef, useState } from 'react'

const presets = {
  'LeBron ↔ Curry swap': {
    sides: [
      { team: 'LAL', players_out: ['LeBron James'], players_in: ['Stephen Curry'], picks_out: [], picks_in: [] },
      { team: 'GSW', players_out: ['Stephen Curry'], players_in: ['LeBron James'], picks_out: [], picks_in: [] }
    ]
  },
  'BOS ↔ BKN pick swap': {
    sides: [
      // Use real pick_id values from data/picks.csv
      { team: 'BOS', players_out: [], players_in: [], picks_out: ['bos_2027_1st'], picks_in: ['brk_2027_1st'] },
      { team: 'BKN', players_out: [], players_in: [], picks_out: ['brk_2027_1st'], picks_in: ['bos_2027_1st'] }
    ]
  },
  'Custom': {
    sides: []
  }
}

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
  const initial = presets['LeBron ↔ Curry swap']
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
  }
  

  const parsePayload = () => {
    try { return JSON.parse(jsonText) } catch (e) { throw new Error('Invalid JSON: ' + e.message) }
  }

  const postJSON = async (url, body, m) => {
    setBusy(true); setMode(m); setError(''); setResult(null)
    try {
      const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
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
  const updateSide = (idx, patch) => {
    setBuilder(prev => {
      const next = JSON.parse(JSON.stringify(prev))
      next.sides[idx] = { ...next.sides[idx], ...patch }
      return next
    })
  }
  const addSide = () => setBuilder(prev => ({ ...prev, sides: [...prev.sides, { team: '', players_out: [], players_in: [], picks_out: [], picks_in: [] }] }))
  const removeSide = (idx) => setBuilder(prev => ({ ...prev, sides: prev.sides.filter((_, i) => i !== idx) }))

  const addToken = (idx, key, value) => {
    if (!value) return
    updateSide(idx, { [key]: [...builder.sides[idx][key], value] })
  }
  const removeToken = (idx, key, i) => {
    setBuilder(prev => {
      const next = JSON.parse(JSON.stringify(prev))
      next.sides[idx][key].splice(i, 1)
      return next
    })
  }

  // Player search suggestions
  const [suggestions, setSuggestions] = useState({ idx: -1, which: '', items: [] })
  const fetchPlayers = async (q, idx, which) => {
    if (!q || q.length < 2) { setSuggestions({ idx: -1, which: '', items: [] }); return }
    try {
      const res = await fetch(`/players/search?q=${encodeURIComponent(q)}&limit=8`)
      const items = await res.json()
      setSuggestions({ idx, which, items })
    } catch {
      setSuggestions({ idx: -1, which: '', items: [] })
    }
  }
  const applySuggestion = (idx, which, name) => {
    addToken(idx, which, name)
    setSuggestions({ idx: -1, which: '', items: [] })
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
            <th className="py-2 pr-4">Score</th>
            <th className="py-2 pr-4">Letter</th>
            <th className="py-2 pr-4">Impact Now</th>
            <th className="py-2 pr-4">Future</th>
            <th className="py-2 pr-4">Picks</th>
          </tr>
        </thead>
        <tbody>
          {grades.map((g, i) => (
            <tr key={i} className="border-t">
              <td className="py-2 pr-4 font-medium">{g.team}</td>
              <td className="py-2 pr-4">{Number(g.score_raw).toFixed(2)}</td>
              <td className="py-2 pr-4">
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${g.letter === 'A' ? 'bg-emerald-100 text-emerald-800' : g.letter === 'B' ? 'bg-green-100 text-green-800' : g.letter === 'C' ? 'bg-yellow-100 text-yellow-800' : g.letter === 'D' ? 'bg-orange-100 text-orange-800' : 'bg-red-100 text-red-800'}`}>{g.letter}</span>
              </td>
              <td className="py-2 pr-4">{g.breakdown?.impact_now?.toFixed?.(2) ?? g.breakdown?.impact_now}</td>
              <td className="py-2 pr-4">{g.breakdown?.future_value?.toFixed?.(2) ?? g.breakdown?.future_value}</td>
              <td className="py-2 pr-4">{g.breakdown?.pick_value?.toFixed?.(2) ?? g.breakdown?.pick_value}</td>
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
    if (result == null) return (
      <div className="p-3 rounded border bg-gray-50 border-gray-200 text-sm text-gray-600">Results will appear here…</div>
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

  // TokenEditor: small reusable input with chips and optional suggestions
  function TokenEditor({ tokens, onRemove, onAdd, placeholder, onSuggest, suggestions = [], onPickSuggest }) {
    const [value, setValue] = useState('')
    const [localSuggestions, setLocalSuggestions] = useState([])
    useEffect(() => {
      if (!onSuggest) return
      const h = setTimeout(async () => {
        const items = await onSuggest(value)
        setLocalSuggestions(items || [])
      }, 180)
      return () => clearTimeout(h)
    }, [value])
    const handlePickSuggest = (s) => {
      onPickSuggest?.(s.name || s)
      setLocalSuggestions([])
      setValue('')
    }
    return (
      <div>
        <div className="flex flex-wrap gap-2 mb-2">
          {tokens.map((t, i) => (
            <span key={i} className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-gray-100 border">
              <span>{t}</span>
              <button type="button" onClick={()=>onRemove(i)} className="text-gray-500 hover:text-red-600">×</button>
            </span>
          ))}
        </div>
        <div className="relative">
          <div className="flex gap-2">
            <input value={value} onChange={(e)=>setValue(e.target.value)} placeholder={placeholder} className="flex-1 text-sm border rounded px-2 py-1"/>
            <button type="button" onClick={()=>{onAdd(value); setValue('')}} className="px-2 py-1 text-sm rounded border bg-white hover:bg-gray-50">Add</button>
          </div>
          {localSuggestions.length > 0 && (
            <div className="absolute z-10 mt-1 w-full bg-white border rounded shadow" onMouseDown={(e)=> e.preventDefault()}>
              {localSuggestions.map((s, i) => (
                <button type="button" key={i} onClick={()=>handlePickSuggest(s)} className="w-full text-left px-2 py-1 text-sm hover:bg-indigo-50">
                  {s.name ? `${s.name} · ${s.team}` : String(s)}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white">
      <div className="max-w-6xl mx-auto p-4">
        <header className="rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-sky-500 text-white p-5 mb-6 shadow">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold">NBA Trade Analyzer</h1>
              <p className="text-sm text-indigo-100">Build trades, validate CBA constraints, and get team grades.</p>
            </div>
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card
            title="Trade Builder"
            actions={(
              <div className="flex items-center gap-2">
                <select className="text-sm border rounded px-2 py-1 bg-white" onChange={(e) => setPreset(e.target.value)} defaultValue="LeBron ↔ Curry swap">
                  {Object.keys(presets).map((k) => <option key={k} value={k}>{k}</option>)}
                </select>
                <div className="text-xs bg-gray-100 rounded border px-1.5 py-0.5">Mode:</div>
                <div className="inline-flex rounded-lg overflow-hidden border">
                  <button type="button" className={`px-2 py-1 text-sm ${activeTab==='builder'?'bg-indigo-600 text-white':'bg-white'}`} onClick={()=>setActiveTab('builder')}>Builder</button>
                  <button type="button" className={`px-2 py-1 text-sm ${activeTab==='json'?'bg-indigo-600 text-white':'bg-white'}`} onClick={()=>setActiveTab('json')}>JSON</button>
                </div>
              </div>
            )}
          >
            {activeTab === 'builder' ? (
              <div className="space-y-6">
                {builder.sides.map((side, idx) => (
                  <div key={idx} className="rounded-lg border p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <label className="text-sm text-gray-600">Team</label>
                        <input value={side.team} onChange={(e)=>updateSide(idx,{team:e.target.value.toUpperCase()})} placeholder="LAL" className="text-sm border rounded px-2 py-1 w-24"/>
                      </div>
                      <button type="button" onClick={()=>removeSide(idx)} className="text-sm text-red-600 hover:underline">Remove</button>
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <div className="text-sm font-medium mb-1">Players Out</div>
                        <TokenEditor
                          tokens={side.players_out}
                          onRemove={(i)=>removeToken(idx,'players_out',i)}
                          placeholder="Type player name..."
                          onAdd={(val)=>addToken(idx,'players_out',val)}
                          onSuggest={async (q) => {
                            if (!q || q.length < 2) return [];
                            try {
                              const res = await fetch(`/players/search?q=${encodeURIComponent(q)}&limit=8`)
                              return await res.json()
                            } catch {
                              return []
                            }
                          }}
                          onPickSuggest={(name)=>addToken(idx,'players_out',name)}
                        />
                      </div>
                      <div>
                        <div className="text-sm font-medium mb-1">Players In</div>
                        <TokenEditor
                          tokens={side.players_in}
                          onRemove={(i)=>removeToken(idx,'players_in',i)}
                          placeholder="Type player name..."
                          onAdd={(val)=>addToken(idx,'players_in',val)}
                          onSuggest={async (q) => {
                            if (!q || q.length < 2) return [];
                            try {
                              const res = await fetch(`/players/search?q=${encodeURIComponent(q)}&limit=8`)
                              return await res.json()
                            } catch {
                              return []
                            }
                          }}
                          onPickSuggest={(name)=>addToken(idx,'players_in',name)}
                        />
                      </div>
                      <div>
                        <div className="text-sm font-medium mb-1">Picks Out</div>
                        <TokenEditor
                          tokens={side.picks_out}
                          onRemove={(i)=>removeToken(idx,'picks_out',i)}
                          placeholder="e.g., BOS 2027 1st or BOS27"
                          onAdd={(val)=>addToken(idx,'picks_out',val)}
                        />
                      </div>
                      <div>
                        <div className="text-sm font-medium mb-1">Picks In</div>
                        <TokenEditor
                          tokens={side.picks_in}
                          onRemove={(i)=>removeToken(idx,'picks_in',i)}
                          placeholder="e.g., BRK 2030 1st or BRK30"
                          onAdd={(val)=>addToken(idx,'picks_in',val)}
                        />
                      </div>
                    </div>
                  </div>
                ))}
                <div>
                  <button type="button" onClick={addSide} className="px-2 py-1 text-sm rounded border bg-white hover:bg-gray-50">+ Add Team Side</button>
                </div>
                <p className="text-xs text-gray-500">Tip: Player names resolve automatically. Picks accept exact IDs or simple forms like "BOS 2027 1st" / "BOS27".</p>
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

          <Card title="Results">
            <ResultPanel />
          </Card>
        </div>

        <footer className="text-xs text-gray-500 mt-8 mb-6 text-center">Vite + React • Calling FastAPI at http://localhost:8000 via proxy</footer>
      </div>
    </div>
  )
}
