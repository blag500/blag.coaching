import { useState, useEffect } from 'react'

export function useAppUpdate() {
  const [updateAvailable, setUpdateAvailable] = useState(false)

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      setUpdateAvailable(true)
    })
  }, [])

  return { updateAvailable, reload: () => window.location.reload() }
}
