import { createClient } from 'npm:@supabase/supabase-js@2'

const SUPABASE_URL     = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS })
  }

  const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

  // Verify caller identity
  const authHeader = req.headers.get('authorization') ?? ''
  const token = authHeader.replace(/^Bearer\s+/i, '').trim()
  if (!token) {
    return new Response('missing token', { status: 401, headers: CORS })
  }

  const { data: userData, error: authError } = await adminClient.auth.getUser(token)
  if (authError || !userData?.user) {
    return new Response(`unauthorized: ${authError?.message ?? 'no user'}`, { status: 401, headers: CORS })
  }

  // Confirm caller is a coach
  const { data: callerProfile, error: profileError } = await adminClient
    .from('profiles')
    .select('role')
    .eq('id', userData.user.id)
    .single()

  if (profileError || callerProfile?.role !== 'coach') {
    return new Response(`forbidden: ${profileError?.message ?? 'not a coach'}`, { status: 403, headers: CORS })
  }

  // Parse body
  let userId: string
  try {
    const body = await req.json()
    userId = body.userId
  } catch {
    return new Response('invalid json body', { status: 400, headers: CORS })
  }

  if (!userId) {
    return new Response('missing userId', { status: 400, headers: CORS })
  }

  // Delete the auth user — cascades to profile via DB foreign key
  const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId)
  if (deleteError) {
    return new Response(`delete failed: ${deleteError.message}`, { status: 500, headers: CORS })
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { ...CORS, 'content-type': 'application/json' },
  })
})
