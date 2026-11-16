import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigationType, useSearchParams } from 'react-router'

/**
 * Filter state for listing pages that is instant to edit AND shareable by URL.
 *
 * The state lives in React (so inputs never lag or drop characters — React Router applies
 * search-param updates in a transition, which can be delayed while many photos load) and is
 * mirrored to the query string with `replace` after a short debounce. Arriving at the page via a
 * link or back/forward re-reads the URL. Values equal to their default are left out of the URL.
 */
export function useUrlFilters<T extends Record<string, string>>(defaults: T, sanitize: (raw: Partial<T>) => T, delay = 200) {
  const [params, setParams] = useSearchParams()
  const location = useLocation()
  const navigationType = useNavigationType()

  const read = useCallback(
    (sp: URLSearchParams): T => {
      const raw: Partial<T> = {}
      for (const key of Object.keys(defaults) as (keyof T & string)[]) {
        const value = sp.get(key)
        if (value != null) raw[key] = value as T[keyof T & string]
      }
      return sanitize(raw)
    },
    [defaults, sanitize],
  )

  const [state, setState] = useState<T>(() => read(params))

  // Our own writes use REPLACE; anything else (a link to this page, back/forward) wins over local state.
  useEffect(() => {
    if (navigationType !== 'REPLACE') setState(read(new URLSearchParams(location.search)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.key])

  // Mirror local state to the URL.
  const searchRef = useRef(location.search)
  searchRef.current = location.search
  useEffect(() => {
    const next = new URLSearchParams(searchRef.current)
    for (const key of Object.keys(defaults)) {
      const value = state[key]
      if (!value || value === defaults[key]) next.delete(key)
      else next.set(key, value)
    }
    const nextSearch = next.toString()
    if (nextSearch === searchRef.current.replace(/^\?/, '')) return
    const timer = window.setTimeout(() => setParams(next, { replace: true, preventScrollReset: true }), delay)
    return () => window.clearTimeout(timer)
  }, [state, defaults, delay, setParams])

  const update = useCallback((patch: Partial<T>) => setState((s) => ({ ...s, ...patch })), [])
  return [state, update, setState] as const
}
