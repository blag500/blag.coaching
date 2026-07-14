import { useState, useEffect } from 'react'

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)

  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true

  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream
  const isAndroid = /android/i.test(navigator.userAgent)

  useEffect(() => {
    const handler = e => {
      e.preventDefault()
      setDeferredPrompt(e)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  async function install() {
    if (!deferredPrompt) return false
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    setDeferredPrompt(null)
    return outcome === 'accepted'
  }

  return { canInstall: !!deferredPrompt, isIOS, isAndroid, isStandalone, install }
}
