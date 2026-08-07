import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()

  const { data: stops, error } = await supabase
    .from('stops')
    .select('id, code, name, city, state, terminal_name')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const res = NextResponse.json({ stops: stops ?? [] })
  res.headers.set('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400')
  return res
}
