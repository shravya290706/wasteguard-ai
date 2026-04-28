import { useRef } from 'react'

export function useCyclicScroll() {
  const containerRef = useRef(null)

  const handleScroll = (e) => {
    const container = e.target
    const isAtTop = container.scrollTop === 0
    const isAtBottom = container.scrollTop + container.clientHeight >= container.scrollHeight - 5

    if (isAtTop && e.deltaY < 0) {
      container.scrollTop = container.scrollHeight
    } else if (isAtBottom && e.deltaY > 0) {
      container.scrollTop = 0
    }
  }

  return { containerRef, handleScroll }
}

export function CyclicSelect({ value, onChange, options, className = '', title = '', name = 'unit' }) {
  const handleWheel = (e) => {
    e.preventDefault()
    const currentIndex = options.findIndex(opt => opt.value === value)
    let nextIndex

    if (e.deltaY < 0) {
      nextIndex = currentIndex === 0 ? options.length - 1 : currentIndex - 1
    } else {
      nextIndex = currentIndex === options.length - 1 ? 0 : currentIndex + 1
    }

    onChange({ target: { name, value: options[nextIndex].value } })
  }

  return (
    <select
      name={name}
      value={value}
      onChange={onChange}
      onWheel={handleWheel}
      title={title || 'Scroll up on first element to cycle to last'}
      className={`border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white cursor-pointer ${className}`}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  )
}

export function CyclicList({ children, className = '' }) {
  const { containerRef, handleScroll } = useCyclicScroll()

  return (
    <div
      ref={containerRef}
      onWheel={handleScroll}
      className={`overflow-y-auto ${className}`}
    >
      {children}
    </div>
  )
}
