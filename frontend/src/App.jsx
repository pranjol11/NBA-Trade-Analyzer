import React, { useState } from 'react'

const presets = {
  'LeBron ↔ Curry swap': {
    sides: [
      { team: 'LAL', players_out: [2544], players_in: [201939], picks_out: [], picks_in: [] },
      { team: 'GSW', players_out: [201939], players_in: [2544], picks_out: [], picks_in: [] }
    ]
  },
  'BOS ↔ BKN pick swap': {
    sides: [
      // Use real pick_id values from data/picks.csv
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
  const [jsonText, setJsonText] = useState(JSON.stringify(presets['LeBron ↔ Curry swap'], null, 2))
  const [busy, setBusy] = useState(false)
  const [mode, setMode] = useState('') // 'validate' | 'evaluate'
  const [error, setError] = useState('')
  const [result, setResult] = useState(null) // object or string

  const setPreset = (name) => setJsonText(JSON.stringify(presets[name], null, 2))
  

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

  const onValidate = () => postJSON('/trade/validate', parsePayload(), 'validate')
  const onEvaluate = () => postJSON('/trade/evaluate', parsePayload(), 'evaluate')

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

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white">
      <div className="max-w-6xl mx-auto p-4">
        <header className="rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-sky-500 text-white p-5 mb-6 shadow">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold">NBA Trade Analyzer</h1>
              <p className="text-sm text-indigo-100">Build trades, validate CBA constraints, and get team grades.</p>
            </div>
            <a className="text-sm bg-white/10 hover:bg-white/20 transition-colors px-3 py-1.5 rounded" href="/docs" target="_blank" rel="noreferrer">API Docs</a>
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
              </div>
            )}
          >
            <label className="block text-sm font-medium text-gray-700 mb-2">Trade JSON</label>
            <textarea
              className="w-full h-80 font-mono text-sm border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
              spellCheck={false}
            />
            <p className="mt-2 text-xs text-gray-500">Tip: use <code>player_id</code> numbers from <code>data/players.csv</code> and exact <code>pick_id</code> strings (e.g., <code>bos_2027_1st</code>) from <code>data/picks.csv</code>.</p>
            <div className="mt-4 flex gap-3">
              <button disabled={busy} onClick={onValidate} className="px-3 py-2 rounded-lg border bg-white hover:bg-gray-50 disabled:opacity-60 flex items-center gap-2">
                {busy && mode === 'validate' && <span className="inline-block w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />} Validate
              </button>
              <button disabled={busy} onClick={onEvaluate} className="px-3 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60 flex items-center gap-2">
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
