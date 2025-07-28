// src/hooks/useHydrationSafe.ts
import { useEffect, useState } from 'react'

export function useHydrationSafe() {
  const [isHydrated, setIsHydrated] = useState(false)

  useEffect(() => {
    setIsHydrated(true)
  }, [])

  return isHydrated
}

// Hook para contenido que puede cambiar
export function useDynamicContent<T>(
  serverDefault: T,
  clientValue: () => T
): T {
  const [value, setValue] = useState<T>(serverDefault)
  const [isHydrated, setIsHydrated] = useState(false)

  useEffect(() => {
    setIsHydrated(true)
    setValue(clientValue())
  }, [])

  return isHydrated ? value : serverDefault
}