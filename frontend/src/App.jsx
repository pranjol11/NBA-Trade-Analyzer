import React, { useState } from 'react'

const defaultPayload = {
  sides: [
    { team: 'LAL', players_out: [2544], players_in: [], picks_out: [], picks_in: ['p3'] },
    { team: 'SAS', players_out: [], players_in: [2544], picks_out: ['p3'], picks_in: [] }
  ]
}

export default function App() {
  const [jsonText, setJsonText] = useState(JSON.stringify(defaultPayload, null, 2))
  const [output, setOutput] = useState('')
  const [busy, setBusy] = useState(false)

  const parsePayload = () => {
    try { return JSON.parse(jsonText) } catch (e) { throw new Error('Invalid JSON: ' + e.message) }
  }

  const postJSON = async (url, body) => {
    setBusy(true)
    try {
      const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const text = await res.text()
      try { setOutput(JSON.stringify(JSON.parse(text), null, 2)) }
      catch { setOutput(text) }
    } catch (e) {
      setOutput(String(e))
    } finally {
      setBusy(false)
    }
  }

  const onValidate = () => postJSON('/trade/validate', parsePayload())
  const onEvaluate = () => postJSON('/trade/evaluate', parsePayload())

  return (
    <div className="max-w-5xl mx-auto p-4">
      <header className="bg-white border rounded shadow p-4 mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">NBA Trade Analyzer</h1>
        <a className="text-sm text-indigo-700 hover:underline" href="/docs" target="_blank">API Docs</a>
      </header>

      <section className="bg-white border rounded shadow p-4">
        <h2 className="text-lg font-semibold mb-2">Build a Trade</h2>
        <p className="text-sm text-gray-600 mb-4">Edit the JSON payload and click Validate or Evaluate.</p>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Trade JSON</label>
            <textarea
              className="w-full h-72 font-mono text-sm border rounded p-2"
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
              spellCheck={false}
            />
            <p className="mt-2 text-xs text-gray-500">Tip: Use player_ids from data/players.csv and pick_ids from data/picks.csv</p>
          </div>

          <div>
            <div className="flex gap-2 mb-3">
              <button disabled={busy} onClick={onValidate} className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded border disabled:opacity-60">Validate</button>
              <button disabled={busy} onClick={onEvaluate} className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded disabled:opacity-60">Evaluate</button>
            </div>
            <pre className="bg-gray-50 border rounded p-3 text-xs overflow-auto h-72 whitespace-pre-wrap">{output || 'Results will appear here…'}</pre>
          </div>
        </div>
      </section>

      <footer className="text-xs text-gray-500 mt-6">Prototype UI • Vite + React • Proxied to FastAPI at http://localhost:8000</footer>
    </div>
  )
}
