'use client'

import { useCallback, useEffect, useState } from 'react'

/**
 * Persist a card ordering in localStorage. The hook reconciles saved order
 * against the current set of indicator IDs: ids present in both stay, removed
 * ids drop, and new ids append.
 */
export function useCardOrder(key: string, defaultIds: string[]): {
  order: string[]
  setOrder: (next: string[]) => void
  reset: () => void
  isLoaded: boolean
} {
  const [order, setOrderState] = useState<string[]>(defaultIds)
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const raw = window.localStorage.getItem(key)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) {
          const saved = parsed.filter((v): v is string => typeof v === 'string')
          const valid = saved.filter((id) => defaultIds.includes(id))
          const missing = defaultIds.filter((id) => !valid.includes(id))
          setOrderState([...valid, ...missing])
        }
      } else {
        setOrderState(defaultIds)
      }
    } catch {
      setOrderState(defaultIds)
    }
    setIsLoaded(true)
  }, [key, defaultIds.join('|')])

  const setOrder = useCallback(
    (next: string[]) => {
      setOrderState(next)
      try {
        window.localStorage.setItem(key, JSON.stringify(next))
      } catch {
        // ignore quota or privacy errors
      }
    },
    [key],
  )

  const reset = useCallback(() => {
    setOrderState(defaultIds)
    try {
      window.localStorage.removeItem(key)
    } catch {
      // ignore
    }
  }, [key, defaultIds.join('|')])

  return { order, setOrder, reset, isLoaded }
}
