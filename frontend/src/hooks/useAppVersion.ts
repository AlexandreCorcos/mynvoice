import { useEffect, useState } from 'react'

const POLL_INTERVAL = 60_000

export function useAppVersion() {
  const [hasUpdate, setHasUpdate] = useState(false)

  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch(`/meta.json?t=${Date.now()}`, { cache: 'no-store' })
        if (!res.ok) return
        const { version } = await res.json()
        if (version !== process.env.NEXT_PUBLIC_APP_VERSION) {
          setHasUpdate(true)
        }
      } catch {
        // network error — ignore silently
      }
    }

    const id = setInterval(check, POLL_INTERVAL)
    return () => clearInterval(id)
  }, [])

  return { hasUpdate }
}
