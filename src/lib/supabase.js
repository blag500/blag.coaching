import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !key) {
  console.warn('Supabase env vars missing — set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY')
}

// Explicit auth storage so an installed PWA keeps the session across launches.
// The defaults are meant to be these, but stating them removes any doubt about
// where the token lives (localStorage, not sessionStorage — which a reopened
// standalone app would not carry) and that it refreshes itself in the
// background rather than expiring the client out to the landing page.
export const supabase = createClient(url ?? '', key ?? '', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    // No custom storageKey on purpose — changing it would orphan every existing
    // session under the old key and log the whole userbase out once.
  },
})
