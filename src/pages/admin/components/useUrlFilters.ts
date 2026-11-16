import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router'

export type UrlFilterValues<K extends string> = Record<K, string | null>

/**
 * Filter state mirrored to the query string (so links like /admin/users?status=invited work).
 *
 * React Router v8 applies URL updates as transitions, which made URL-controlled selects snap back to
 * their old value for a few frames. Here the local state updates immediately and the URL follows;
 * external URL changes (e.g. clicking a link to the same page with other params) flow back in.
 * `update` is stable, so it is safe to use inside callbacks handed to Modal / Drawer.
 */
export function useUrlFilters<K extends string>(keys: readonly K[]) {
  const [params, setParams] = useSearchParams()
  const read = (sp: URLSearchParams): UrlFilterValues<K> => Object.fromEntries(keys.map((k) => [k, sp.get(k) || null])) as UrlFilterValues<K>
  const signature = new URLSearchParams(keys.map((k) => [k, params.get(k) ?? ''])).toString()

  const [values, setValues] = useState<UrlFilterValues<K>>(() => read(params))
  const latest = useRef(values)
  const setParamsRef = useRef(setParams)
  const keysRef = useRef(keys)

  useEffect(() => {
    setParamsRef.current = setParams
  }, [setParams])

  // URL → state, only when one of the managed params really changed.
  useEffect(() => {
    const next = read(new URLSearchParams(signature))
    latest.current = next
    setValues(next)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature])

  const update = useCallback((patch: Partial<UrlFilterValues<K>>) => {
    const next = { ...latest.current, ...patch }
    latest.current = next
    setValues(next)
    setParamsRef.current(
      (prev) => {
        const sp = new URLSearchParams(prev)
        for (const k of keysRef.current) {
          const v = next[k]
          if (v == null || v === '') sp.delete(k)
          else sp.set(k, v)
        }
        return sp
      },
      { replace: true },
    )
  }, [])

  return [values, update] as const
}
