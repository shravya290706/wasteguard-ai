/**
 * Tooltip component for icon descriptions
 * Shows description on hover
 */
export default function Tooltip({ text, children, position = 'top' }) {
  const positionClasses = {
    top: 'bottom-full mb-2 -translate-x-1/2 left-1/2',
    bottom: 'top-full mt-2 -translate-x-1/2 left-1/2',
    left: 'right-full mr-2 top-1/2 -translate-y-1/2',
    right: 'left-full ml-2 top-1/2 -translate-y-1/2',
  }

  return (
    <div className="relative group">
      <div className="transition-transform duration-150 group-hover:scale-110">
        {children}
      </div>
      {text && (
        <div
          className={`absolute ${positionClasses[position]} opacity-0 group-hover:opacity-100 scale-95 group-hover:scale-100 transition-all duration-150 z-50 pointer-events-none`}
        >
          <div className="bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs font-semibold px-3 py-2 rounded-lg whitespace-nowrap shadow-lg">
            {text}
            {/* Arrow */}
            {position === 'top' && (
              <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900 dark:border-t-gray-100" />
            )}
            {position === 'bottom' && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 border-4 border-transparent border-b-gray-900 dark:border-b-gray-100" />
            )}
            {position === 'right' && (
              <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-gray-900 dark:border-r-gray-100" />
            )}
            {position === 'left' && (
              <div className="absolute left-full top-1/2 -translate-y-1/2 border-4 border-transparent border-l-gray-900 dark:border-l-gray-100" />
            )}
          </div>
        </div>
      )}
    </div>
  )
}
