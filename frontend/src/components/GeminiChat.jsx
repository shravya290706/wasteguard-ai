import { useState, useRef, useEffect, useCallback } from 'react'
const API_BASE = "https://wasteguard-ai-hh4e.onrender.com";

const QUICK_PROMPTS = []

// Parse structured AI response into labeled sections
function parseResponse(text) {
  const sections = []
  const patterns = [
    { key: 'RISK LEVEL', label: 'Risk Level', color: 'text-red-700 bg-red-50 border-red-200' },
    { key: 'REASON', label: 'Reason', color: 'text-gray-700 bg-gray-50 border-gray-200' },
    { key: 'SUGGESTED ACTIONS', label: 'Suggested Actions', color: 'text-blue-700 bg-blue-50 border-blue-200' },
    { key: 'REDISTRIBUTION MESSAGE', label: 'Redistribution Message', color: 'text-green-700 bg-green-50 border-green-200' },
  ]

  let remaining = text
  let hasStructure = false

  for (const { key, label, color } of patterns) {
    const regex = new RegExp(`${key}[:\\s]*([\\s\\S]*?)(?=\\n(?:RISK LEVEL|REASON|SUGGESTED ACTIONS|REDISTRIBUTION MESSAGE)|$)`, 'i')
    const match = remaining.match(regex)
    if (match) {
      hasStructure = true
      sections.push({ label, content: match[1].trim(), color })
    }
  }

  return hasStructure ? sections : null
}

function StructuredMessage({ text }) {
  const sections = parseResponse(text)
  if (!sections) {
    return <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{text}</p>
  }
  return (
    <div className="space-y-2 w-full">
      {sections.map(({ label, content, color }) => (
        <div key={label} className={`rounded-lg border px-3 py-2 ${color}`}>
          <p className="text-xs font-bold uppercase tracking-wide mb-1 opacity-70">{label}</p>
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{content}</p>
        </div>
      ))}
    </div>
  )
}

export default function GeminiChat() {
  const [messages, setMessages] = useState([
    { role: 'assistant', text: "Hello! I'm WasteGuard AI. I can help you analyze inventory risks, suggest redistribution plans, and draft NGO communications. How can I help today?" }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const send = useCallback(async (text) => {
    const msg = text || input.trim()
    if (!msg || loading) return
    setInput('')
    setMessages(prev => [...prev, { role: 'user', text: msg }])
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg }),
      })
      const data = await res.json()
      setMessages(prev => [...prev, { role: 'assistant', text: data.response }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', text: 'Connection error. Please check the backend is running.' }])
    } finally {
      setLoading(false)
    }
  }, [input, loading])

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }, [send])

  const handleInputChange = useCallback((e) => setInput(e.target.value), [])

  return (
    <div className="flex flex-col h-[calc(100vh-160px)] bg-white rounded-xl shadow border border-gray-100">
      {/* Header */}
      <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-green-700 rounded-full flex items-center justify-center text-white text-lg">🤖</div>
          <div>
            <p className="font-semibold text-gray-800 text-sm">WasteGuard AI Assistant</p>
            <p className="text-xs text-green-600">Powered by Gemini 2.0 Flash</p>
          </div>
        </div>
      </div>

      {/* Quick prompts */}
      {QUICK_PROMPTS.length > 0 && (
        <div className="px-4 py-2.5 border-b border-gray-50 flex flex-wrap gap-2">
          {QUICK_PROMPTS.map(p => (
            <button
              key={p}
              onClick={() => send(p)}
              disabled={loading}
              className="text-xs bg-green-50 hover:bg-green-100 text-green-800 border border-green-200 px-3 py-1.5 rounded-full transition-colors disabled:opacity-50"
            >
              {p.length > 52 ? p.slice(0, 52) + '…' : p}
            </button>
          ))}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 scrollbar-thin">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {m.role === 'assistant' ? (
              <div className="max-w-[85%] space-y-1">
                <StructuredMessage text={m.text} />
              </div>
            ) : (
              <div className="max-w-[75%] bg-green-700 text-white rounded-2xl rounded-br-sm px-4 py-3 text-sm leading-relaxed">
                {m.text}
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-2xl rounded-bl-sm px-4 py-3">
              <div className="flex gap-1 items-center h-4">
                {[0, 1, 2].map(i => (
                  <div key={i} className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-gray-100 flex gap-2">
        <input
          value={input}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder="Ask about inventory risks, redistribution plans..."
          className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          disabled={loading}
        />
        <button
          onClick={() => send()}
          disabled={loading || !input.trim()}
          className="bg-green-700 hover:bg-green-800 text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {loading ? (
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
          ) : 'Analyze'}
        </button>
      </div>
    </div>
  )
}
