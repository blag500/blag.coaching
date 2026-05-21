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

  // Verify caller identity using their JWT token
  const authHeader = req.headers.get('authorization') ?? ''
  const token = authHeader.replace('Bearer ', '')
  const { data: { user: caller }, error: authError } = await adminClient.auth.getUser(token)
  if (authError || !caller) {
    return new Response('unauthorized', { status: 401, headers: CORS })
  }

  // Confirm caller is a coach
  const { data: callerProfile } = await adminClient
    .from('profiles')
    .select('role')
    .eq('id', caller.id)
    .single()

  if (callerProfile?.role !== 'coach') {
    return new Response('forbidden', { status: 403, headers: CORS })
  }

  const { userId } = await req.json()
  if (!userId) {
    return new Response('missing userId', { status: 400, headers: CORS })
  }

  // Delete the auth user — cascades to profile via DB foreign key
  const { error } = await adminClient.auth.admin.deleteUser(userId)
  if (error) {
    return new Response(error.message, { status: 500, headers: CORS })
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { ...CORS, 'content-type': 'application/json' },
  })
})
