import { useState } from 'react'
import { CyclicSelect } from '../utils/cyclicScroll.jsx'
const API_BASE = "https://wasteguard-ai-hh4e.onrender.com";

const ISSUE_TYPES = ['Spoiled stock', 'Uncollected redistribution', 'Overstock not reported', 'Other']

export default function CitizenPortal({ stores = [] }) {
  const [form, setForm] = useState({ store_id: '', issue_type: ISSUE_TYPES[0], description: '', photo_filename: '' })
  const [submitted, setSubmitted] = useState(false)
  const [summary, setSummary] = useState('')
  const [loading, setLoading] = useState(false)

  const selectedStore = stores.find(s => s.id === parseInt(form.store_id))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!selectedStore) return
    setLoading(true)
    try {
      await fetch(`${API_BASE}/api/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          store_id: selectedStore.id,
          store_name: selectedStore.name,
          issue_type: form.issue_type,
          description: form.description,
          location: selectedStore.location,
          photo_filename: form.photo_filename,
        }),
      })

      // Fetch summary
      const sumRes = await fetch(`${API_BASE}/api/summarize-reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ store_id: selectedStore.id }),
      })
      const sumData = await sumRes.json()
      setSummary(sumData.summary)
      setSubmitted(true)
    } catch {
      setSummary('Report submitted. Summary unavailable.')
      setSubmitted(true)
    } finally {
      setLoading(false)
    }
  }

  const reset = () => {
    setForm({ store_id: '', issue_type: ISSUE_TYPES[0], description: '', photo_filename: '' })
    setSubmitted(false)
    setSummary('')
  }

  if (submitted) {
    return (
      <div className="max-w-xl mx-auto">
        <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center mb-4">
          <div className="text-4xl mb-2">✅</div>
          <h3 className="font-bold text-green-800 text-lg">Report Submitted!</h3>
          <p className="text-green-700 text-sm mt-1">Thank you for helping reduce food waste in your community.</p>
        </div>
        {summary && (
          <div className="bg-white rounded-xl shadow border border-gray-100 p-5 mb-4">
            <h4 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
              <span>🤖</span> AI Analysis for {selectedStore?.name}
            </h4>
            <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{summary}</p>
          </div>
        )}
        <button onClick={reset} className="w-full bg-green-700 hover:bg-green-800 text-white font-semibold py-2.5 rounded-xl transition-colors">
          Submit Another Report
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-xl mx-auto">
      <div className="bg-white rounded-xl shadow border border-gray-100 p-6">
        <h2 className="font-bold text-gray-800 text-lg mb-1">📱 Citizen Report Portal</h2>
        <p className="text-sm text-gray-500 mb-5">Report food waste issues at your local ration shop</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Select Ration Shop *</label>
            <CyclicSelect
              name="store_id"
              value={form.store_id}
              onChange={e => setForm(f => ({ ...f, store_id: e.target.value }))}
              options={[
                { value: '', label: '-- Choose a store --' },
                ...stores.map(s => ({ value: String(s.id), label: s.name }))
              ]}
              className="w-full !rounded-lg !px-3 !py-2.5 !text-sm"
            />
          </div>

          {selectedStore && (
            <div className="bg-gray-50 rounded-lg px-3 py-2 text-xs text-gray-600">
              📍 {selectedStore.location}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Issue Type *</label>
            <CyclicSelect
              name="issue_type"
              value={form.issue_type}
              onChange={e => setForm(f => ({ ...f, issue_type: e.target.value }))}
              options={ISSUE_TYPES.map(t => ({ value: t, label: t }))}
              className="w-full !rounded-lg !px-3 !py-2.5 !text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Description *</label>
            <textarea
              required
              rows={4}
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Describe the issue in detail..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Photo (optional)</label>
            <div className="flex items-center gap-2">
              <label className="cursor-pointer bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg px-4 py-2 text-sm text-gray-600 transition-colors">
                📷 Attach Photo
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={e => setForm(f => ({ ...f, photo_filename: e.target.files[0]?.name || '' }))}
                />
              </label>
              {form.photo_filename && <span className="text-xs text-green-700">{form.photo_filename}</span>}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-700 hover:bg-green-800 text-white font-semibold py-2.5 rounded-xl transition-colors disabled:opacity-60"
          >
            {loading ? 'Submitting...' : 'Submit Report'}
          </button>
        </form>
      </div>
    </div>
  )
}
