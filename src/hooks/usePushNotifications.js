import { useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

const VAPID_PUBLIC_KEY = 'BCPm_aC-y7XxsFPGmfD3HitOSaQu8o7q7iWhKsB3iKMcNpBPFeX72JLD3v-P2EYeiWZFeLmmslC1fBS4PvDWbSc'

function urlBase64ToUint8Array(b64) {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4)
  const base64 = (b64 + pad).replace(/-/g, '+').replace(/_/g, '/')
  const raw = window.atob(base64)
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)))
}

export async function registerPushSubscription(userId) {
  if (!userId || !('serviceWorker' in navigator) || !('PushManager' in window)) return
  if (Notification.permission !== 'granted') return

  const reg = await navigator.serviceWorker.ready
  let sub = await reg.pushManager.getSubscription()
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    })
  }

  // Always upsert — keeps the DB in sync even if the subscription object changed
  await supabase.from('push_subscriptions').upsert(
    { user_id: userId, endpoint: sub.endpoint, subscription: sub.toJSON() },
    { onConflict: 'endpoint' }
  )

  // Reinstalling the PWA leaves a fresh endpoint under the same push service
  // (web.push.apple.com for iOS, fcm.googleapis.com for Chrome) — same device,
  // different subscription. Nothing revokes the old one, so send-push keeps
  // firing 2 or 3 notifications per event. Deleting other subscriptions from
  // this user with the same push-service origin keeps at most one per browser
  // family, which is what a person means when they see "my phone" here. Cross-
  // browser stays separate: Safari and Chrome use different origins.
  try {
    const origin = new URL(sub.endpoint).origin
    const { data: mine } = await supabase
      .from('push_subscriptions')
      .select('id, endpoint')
      .eq('user_id', userId)
    const stale = (mine ?? [])
      .filter(row => row.endpoint !== sub.endpoint)
      .filter(row => {
        try { return new URL(row.endpoint).origin === origin }
        catch { return false }
      })
      .map(row => row.id)
    if (stale.length) {
      await supabase.from('push_subscriptions').delete().in('id', stale)
    }
  } catch { /* cleanup is a nice-to-have — never block registration */ }
}

export function usePushNotifications() {
  const { user } = useAuth()

  useEffect(() => {
    if (!user) return

    // Register on mount
    registerPushSubscription(user.id).catch(console.error)

    // Re-register every time the app comes back to the foreground —
    // mobile browsers expire push subscriptions after periods of inactivity
    function onVisible() {
      if (document.visibilityState === 'visible') {
        registerPushSubscription(user.id).catch(console.error)
      }
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [user?.id])
}
