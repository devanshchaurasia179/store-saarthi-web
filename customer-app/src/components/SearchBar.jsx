import { useState, useRef, useEffect, useCallback } from 'react'
import { Search, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

const RECENT_SEARCHES_KEY = 'store_saarthi_recent_searches'
const MAX_RECENT = 5

function getRecentSearches() {
  try {
    return JSON.parse(localStorage.getItem(RECENT_SEARCHES_KEY) || '[]')
  } catch {
    return []
  }
}

function saveRecentSearch(term) {
  const recent = getRecentSearches().filter((s) => s !== term)
  recent.unshift(term)
  localStorage.setItem(
    RECENT_SEARCHES_KEY,
    JSON.stringify(recent.slice(0, MAX_RECENT))
  )
}

export default function SearchBar({ onSearch, placeholder = 'Search products...' }) {
  const [query, setQuery] = useState('')
  const [isFocused, setIsFocused] = useState(false)
  const [recentSearches, setRecentSearches] = useState(getRecentSearches)
  const inputRef = useRef(null)
  const debounceRef = useRef(null)

  const handleChange = useCallback(
    (e) => {
      const value = e.target.value
      setQuery(value)

      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        onSearch(value.trim())
        if (value.trim()) {
          saveRecentSearch(value.trim())
          setRecentSearches(getRecentSearches())
        }
      }, 400)
    },
    [onSearch]
  )

  const handleClear = () => {
    setQuery('')
    onSearch('')
    inputRef.current?.focus()
  }

  const handleRecentClick = (term) => {
    setQuery(term)
    onSearch(term)
    setIsFocused(false)
  }

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  return (
    <div className="relative px-4 py-2">
      <div
        className={`flex items-center gap-3 bg-white border rounded-xl px-4 py-3 transition-all duration-200 ${
          isFocused
            ? 'border-primary shadow-md shadow-primary/10'
            : 'border-gray-200 shadow-sm'
        }`}
      >
        <Search className="w-5 h-5 text-gray-400 shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setTimeout(() => setIsFocused(false), 200)}
          placeholder={placeholder}
          className="flex-1 text-sm text-gray-800 placeholder-gray-400 outline-none bg-transparent font-body"
          aria-label="Search products"
        />
        <AnimatePresence>
          {query && (
            <motion.button
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              onClick={handleClear}
              className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center"
              aria-label="Clear search"
            >
              <X className="w-3.5 h-3.5 text-gray-500" />
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* Recent searches dropdown */}
      <AnimatePresence>
        {isFocused && !query && recentSearches.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            className="absolute left-4 right-4 top-full mt-1 bg-white border border-gray-100 rounded-xl shadow-lg z-50 overflow-hidden"
          >
            <p className="text-xs text-gray-400 px-4 pt-3 pb-1 font-medium uppercase tracking-wide">
              Recent Searches
            </p>
            {recentSearches.map((term) => (
              <button
                key={term}
                onMouseDown={() => handleRecentClick(term)}
                className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
              >
                <Search className="w-3.5 h-3.5 text-gray-300" />
                {term}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
