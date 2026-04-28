import { useState, useCallback } from 'react'
import NGOMatching from './NGOMatching'
import { generateFallbackMessage } from '../utils/messageGenerator'
import { CyclicSelect } from '../utils/cyclicScroll'
import Tooltip from './Tooltip'

function matchScore(ngo) {
  return ((ngo.reliability * 0.5) + ((1 / ngo.distance_km) * 30) + (ngo.capacity_kg / 20)).toFixed(1)
}

const RISK_COLOR = { 1: 'text-red-700', 2: 'text-red-600', 3: 'text-red-500' }

export default function AutoComms({ item, store, ngos = [], onClose }) {
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [selectedNgo, setSelectedNgo] = useState(ngos[0]?.name || '')
  const [copied, setCopied] = useState(false)
  const [usedFallback, setUsedFallback] = useState(false)

  const rankedNgos = [...ngos].sort((a, b) => matchScore(b) - matchScore(a))

  const generate = useCallback(async () => {
    setLoading(true)
    setMessage('')
    setUsedFallback(false)
    
    try {
      const res = await fetch('/api/generate-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          store_name: store.name,
          item_name: item.name,
          quantity: item.quantity_kg,
          expiry_days: item.expiry_days,
          ngo_name: selectedNgo,
        }),
      })
      
      if (!res.ok) throw new Error('API Error')
      const data = await res.json()
      setMessage(data.message || data.explanation || '')
    } catch (error) {
      // Fallback to rule-based message generator
      console.warn('AI API failed, using fallback message generator:', error)
      const fallback = generateFallbackMessage(
        store.name,
        item.name,
        item.quantity_kg,
        item.expiry_days,
        selectedNgo
      )
      setMessage(fallback.message)
      setUsedFallback(true)
    } finally {
      setLoading(false)
    }
  }, [store.name, item.name, item.quantity_kg, item.expiry_days, selectedNgo])

  const copy = useCallback(() => {
    navigator.clipboard.writeText(message)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [message])

  const handleNgoChange = useCallback((e) => setSelectedNgo(e.target.value), [])
  const handleMessageChange = useCallback((e) => setMessage(e.target.value), [])
  const handleSelectNGO = useCallback((ngo) => {
    setSelectedNgo(ngo.name)
  }, [])

  const urgencyColor = RISK_COLOR[item.expiry_days] || 'text-red-400'

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <h2 className="font-bold text-gray-800 text-lg">Generate NGO Alert</h2>
            <p className="text-xs text-gray-400 mt-0.5">AI-powered redistribution message</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors">&times;</button>
        </div>

        <div className="p-5 space-y-4">
          {/* Item details */}
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold text-red-500 uppercase tracking-wide">Risk Level</p>
                <p className={`text-lg font-bold ${urgencyColor}`}>HIGH — Expiring in {item.expiry_days} day{item.expiry_days !== 1 ? 's' : ''}</p>
              </div>
              <span className="bg-red-600 text-white text-xs font-bold px-2 py-1 rounded-lg">URGENT</span>
            </div>
            <div className="mt-2 pt-2 border-t border-red-200 grid grid-cols-2 gap-2 text-xs">
              <div>
                <p className="text-red-400 font-medium">Store</p>
                <p className="text-red-800 font-semibold">{store.name}</p>
              </div>
              <div>
                <p className="text-red-400 font-medium">Item</p>
                <p className="text-red-800 font-semibold">{item.name} — {item.quantity_kg}kg</p>
              </div>
            </div>
          </div>

          {/* NGO selector */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Select NGO</label>
            <CyclicSelect
              value={selectedNgo}
              onChange={handleNgoChange}
              options={rankedNgos.map(n => ({ value: n.name, label: `${n.name} — Score: ${matchScore(n)}` }))}
              title="Scroll up on first element to cycle to last"
              className="w-full dark:bg-gray-700 dark:text-white"
            />
          </div>

          {/* NGO Matching Component */}
          <NGOMatching item={item} store={store} ngos={ngos} onSelectNGO={handleSelectNGO} />

          {/* NGO match scores */}
          <div>
            <p className="text-xs font-semibold text-gray-600 mb-2">NGO Match Scores</p>
            <div className="space-y-1.5">
              {rankedNgos.map((ngo, i) => (
                <div key={ngo.name} className={`flex items-center gap-2 text-xs rounded-lg px-3 py-2 ${i === 0 ? 'bg-green-50 border border-green-200' : 'bg-gray-50'}`}>
                  <span className={`font-bold w-4 ${i === 0 ? 'text-green-700' : 'text-gray-400'}`}>{i + 1}</span>
                  <span className="flex-1 font-medium text-gray-800">{ngo.name}</span>
                  <span className="text-gray-500">{ngo.distance_km}km</span>
                  <span className="text-blue-600">{ngo.reliability}%</span>
                  <span className="text-gray-500">{ngo.capacity_kg}kg</span>
                  <span className={`font-bold ${i === 0 ? 'text-green-700' : 'text-gray-500'}`}>★{matchScore(ngo)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Generate button */}
          <Tooltip text="Generate AI-powered or fallback message for NGO" position="bottom">
            <button
              onClick={generate}
              disabled={loading}
              className="w-full bg-green-700 hover:bg-green-800 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Generating Message...
                </>
              ) : '✉️ Generate NGO Message'}
            </button>
          </Tooltip>

          {/* Output */}
          {message && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-xs font-semibold text-gray-600">NGO Message Output</p>
                {usedFallback && <span className="text-xs text-yellow-600 bg-yellow-50 px-2 py-1 rounded font-medium">⚙️ Offline Mode</span>}
              </div>

              {/* WhatsApp Preview */}
              <div className="rounded-xl overflow-hidden border border-gray-200 mb-3">
                <div className="bg-[#075e54] px-4 py-2.5 flex items-center gap-3">
                  <div className="w-8 h-8 bg-green-400 rounded-full flex items-center justify-center text-white font-bold text-sm">
                    {selectedNgo?.[0] || 'N'}
                  </div>
                  <div>
                    <p className="text-white text-sm font-semibold">{selectedNgo}</p>
                    <p className="text-green-300 text-xs">NGO Partner</p>
                  </div>
                  <span className="ml-auto text-green-300 text-xs">📱 WhatsApp</span>
                </div>
                <div className="bg-[#ece5dd] p-4">
                  <div className="bg-white rounded-lg rounded-tl-none px-3 py-2.5 shadow-sm max-w-xs">
                    <p className="text-xs text-gray-800 whitespace-pre-wrap leading-relaxed">{message}</p>
                    <p className="text-right text-gray-400 mt-1" style={{fontSize:'10px'}}>
                      {new Date().toLocaleTimeString('en-IN', {hour:'2-digit', minute:'2-digit'})} ✓✓
                    </p>
                  </div>
                </div>
              </div>

              <textarea
                value={message}
                onChange={handleMessageChange}
                rows={4}
                className="w-full p-3 border border-gray-200 rounded-lg text-sm"
              />
              <Tooltip text="Copy message to clipboard" position="bottom">
                <button
                  onClick={copy}
                  className="mt-2 w-full border-2 border-green-700 text-green-700 hover:bg-green-50 font-semibold py-2.5 rounded-xl transition-colors text-sm"
                >
                  {copied ? '✅ Copied to Clipboard!' : '📋 Copy Message'}
                </button>
              </Tooltip>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
