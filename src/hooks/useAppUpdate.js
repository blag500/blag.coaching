import { useState, useEffect } from 'react'
import { reloadWithNewSW } from '../lib/pwaUpdate'

/** Listens for the "new SW is waiting" event dispatched by pwaUpdate.js and
 *  hands the banner a reload button that actually activates the new worker. */
export function useAppUpdate() {
  const [updateAvailable, setUpdateAvailable] = useState(false)

  useEffect(() => {
    const on = () => setUpdateAvailable(true)
    window.addEventListener('pwa:need-refresh', on)
    return () => window.removeEventListener('pwa:need-refresh', on)
  }, [])

  return { updateAvailable, reload: reloadWithNewSW }
}
