import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { LUGGAGE_OPTIONS } from '@/lib/data/bus-config'

// Public GET — no auth required
export async function GET() {
  try {
    const service = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    const { data, error } = await service
      .from('luggage_types')
      .select('id, name, description, max_weight_lbs, extra_fee')
      .eq('is_active', true)
      .order('extra_fee', { ascending: true })

    if (error || !data || data.length === 0) {
      // Fallback to static config if DB has no rows or errors
      return NextResponse.json({ options: LUGGAGE_OPTIONS })
    }

    const options = [
      {
        id:          'none',
        label:       'Sin equipaje adicional',
        description: 'Solo equipaje de mano (incluido)',
        price:       0,
        icon:        '🎒',
      },
      ...data.map((lt: any) => ({
        id:          lt.id,
        label:       lt.name,
        description: lt.description ?? '',
        price:       Number(lt.extra_fee),
        maxKg:       lt.max_weight_lbs ? Math.round(Number(lt.max_weight_lbs) / 2.205) : undefined,
        icon:        '🧳',
      })),
    ]

    return NextResponse.json({ options })
  } catch {
    return NextResponse.json({ options: LUGGAGE_OPTIONS })
  }
}
