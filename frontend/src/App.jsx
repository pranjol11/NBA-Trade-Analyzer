import React, { useEffect, useMemo, useRef, useState } from 'react'

// NBA Team abbreviations used for team input suggestions
const TEAM_CODES = [
  'ATL','BOS','BKN','CHA','CHI','CLE','DAL','DEN','DET','GSW','HOU','IND','LAC','LAL','MEM','MIA','MIL','MIN','NOP','NYK','OKC','ORL','PHI','PHX','POR','SAC','SAS','TOR','UTA','WAS'
]

const presets = {
  'Custom': {
    sides: [
      { team: '', players_out: [], players_in: [], picks_out: [], picks_in: [] },
      { team: '', players_out: [], players_in: [], picks_out: [], picks_in: [] }
    ]
  },
  'LeBron ↔ Curry swap': {
    sides: [
      { team: 'LAL', players_out: ['LeBron James'], players_in: ['Stephen Curry'], picks_out: [], picks_in: [] },
      { team: 'GSW', players_out: ['Stephen Curry'], players_in: ['LeBron James'], picks_out: [], picks_in: [] }
    ]
  },
  'BOS ↔ BKN pick swap': {
    sides: [
      { team: 'BOS', players_out: [], players_in: [], picks_out: ['bos_2027_1st'], picks_in: ['brk_2027_1st'] },
      { team: 'BKN', players_out: [], players_in: [], picks_out: ['brk_2027_1st'], picks_in: ['bos_2027_1st'] }
    ]
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
  const updateSide = (idx, patch) => {
    setBuilder(prev => {
      const next = JSON.parse(JSON.stringify(prev))
      next.sides[idx] = { ...next.sides[idx], ...patch }
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
      <div className="p-3 rounded border bg-gray-50 border-gray-200 text-sm text-gray-600">Grades will appear here…</div>
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
  function TokenEditor({ tokens, onRemove, onAdd, onSuggest, suggestions = [], onPickSuggest, locked=false }) {
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
            <span key={i} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm bg-gray-100 border font-medium">
              <span>{t}</span>
              {!locked && (
                <button type="button" onClick={()=>onRemove(i)} className="text-gray-500 hover:text-red-600 text-base leading-none">×</button>
              )}
            </span>
          ))}
        </div>
        <div className="relative">
          {!locked && (
            <div className="flex gap-2">
              <input value={value} onChange={(e)=>setValue(e.target.value)} className="flex-1 text-sm border rounded px-2 py-1"/>
              <button type="button" onClick={()=>{onAdd(value); setValue('')}} className="px-2 py-1 text-sm rounded border bg-white hover:bg-gray-50">Add</button>
            </div>
          )}
          {!locked && localSuggestions.length > 0 && (
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
                  <button type="button" className={`px-2 py-1 text-sm ${activeTab==='json'?'bg-indigo-600 text-white':'bg-white'}`} onClick={()=>setActiveTab('json')}>JSON</button>
                </div>
              </div>
            )}
          >
            {activeTab === 'builder' ? (
              <div className="space-y-4">
                <div className="rounded-lg border p-4">
                  <div className="grid grid-cols-2 gap-6">
                    {/* Team 1 */}
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <label className="text-sm font-semibold text-gray-700">Team 1</label>
                        <div className="relative">
                          <input 
                            value={builder.sides[0]?.team || ''} 
                            onChange={(e)=>updateSide(0,{team:e.target.value.toUpperCase()})} 
                            className="text-sm border rounded px-2 py-1 w-24"
                            disabled={isLocked}
                          />
                          {!isLocked && builder.sides[0]?.team && builder.sides[0].team.length > 0 && (
                            (()=>{
                              const q = builder.sides[0].team.toUpperCase();
                              const matches = TEAM_CODES.filter(t=>t.startsWith(q) && t!==q).slice(0,5);
                              return matches.length ? (
                                <div className="absolute z-10 mt-1 w-24 bg-white border rounded shadow text-xs">
                                  {matches.map(m => (
                                    <button type="button" key={m} onClick={()=>updateSide(0,{team:m})} className="block w-full text-left px-2 py-1 hover:bg-indigo-50">
                                      {m}
                                    </button>
                                  ))}
                                </div>
                              ) : null
                            })()
                          )}
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div>
                          <div className="text-sm font-medium text-gray-600 mb-1">Gives Up Players</div>
                          <TokenEditor
                            tokens={builder.sides[0]?.players_out || []}
                            onRemove={(i)=>removeToken(0,'players_out',i)}
                            onAdd={(val)=>addToken(0,'players_out',val)}
                            onSuggest={async (q) => {
                              if (!q || q.length < 2) return [];
                              try {
                                const res = await fetch(`${API_BASE}/players/search?q=${encodeURIComponent(q)}&limit=8`)
                                return await res.json()
                              } catch {
                                return []
                              }
                            }}
                            onPickSuggest={(name)=>addToken(0,'players_out',name)}
                            locked={isLocked}
                          />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-600 mb-1">Gives Up Picks</div>
                          <TokenEditor
                            tokens={builder.sides[0]?.picks_out || []}
                            onRemove={(i)=>removeToken(0,'picks_out',i)}
                            onAdd={(val)=>addToken(0,'picks_out',val)}
                            locked={isLocked}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Team 2 */}
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <label className="text-sm font-semibold text-gray-700">Team 2</label>
                        <div className="relative">
                          <input 
                            value={builder.sides[1]?.team || ''} 
                            onChange={(e)=>updateSide(1,{team:e.target.value.toUpperCase()})} 
                            className="text-sm border rounded px-2 py-1 w-24"
                            disabled={isLocked}
                          />
                          {!isLocked && builder.sides[1]?.team && builder.sides[1].team.length > 0 && (
                            (()=>{
                              const q = builder.sides[1].team.toUpperCase();
                              const matches = TEAM_CODES.filter(t=>t.startsWith(q) && t!==q).slice(0,5);
                              return matches.length ? (
                                <div className="absolute z-10 mt-1 w-24 bg-white border rounded shadow text-xs">
                                  {matches.map(m => (
                                    <button type="button" key={m} onClick={()=>updateSide(1,{team:m})} className="block w-full text-left px-2 py-1 hover:bg-indigo-50">
                                      {m}
                                    </button>
                                  ))}
                                </div>
                              ) : null
                            })()
                          )}
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div>
                          <div className="text-sm font-medium text-gray-600 mb-1">Gives Up Players</div>
                          <TokenEditor
                            tokens={builder.sides[1]?.players_out || []}
                            onRemove={(i)=>removeToken(1,'players_out',i)}
                            onAdd={(val)=>addToken(1,'players_out',val)}
                            onSuggest={async (q) => {
                              if (!q || q.length < 2) return [];
                              try {
                                const res = await fetch(`${API_BASE}/players/search?q=${encodeURIComponent(q)}&limit=8`)
                                return await res.json()
                              } catch {
                                return []
                              }
                            }}
                            onPickSuggest={(name)=>addToken(1,'players_out',name)}
                            locked={isLocked}
                          />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-600 mb-1">Gives Up Picks</div>
                          <TokenEditor
                            tokens={builder.sides[1]?.picks_out || []}
                            onRemove={(i)=>removeToken(1,'picks_out',i)}
                            onAdd={(val)=>addToken(1,'picks_out',val)}
                            locked={isLocked}
                          />
                        </div>
                      </div>
                    </div>
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

          <Card title="Grades">
            <ResultPanel />
          </Card>
        </div>

        <footer className="text-xs text-gray-500 mt-8 mb-6 text-center">Vite + React • Calling FastAPI at http://localhost:8000 via proxy</footer>
      </div>
    </div>
  )
}
