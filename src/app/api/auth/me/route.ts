import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ role: null })
  }

  const service = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: profile } = await service
    .from('profiles')
    .select('role, sucursal_id')
    .eq('id', user.id)
    .maybeSingle() as { data: { role: string; sucursal_id: string | null } | null }

  return NextResponse.json({
    role:        profile?.role        ?? null,
    sucursal_id: profile?.sucursal_id ?? null,
  })
}
