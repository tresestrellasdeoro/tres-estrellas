import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/api-auth'
import { fetchExpenseAccounts } from '@/lib/quickbooks/client'
import { z } from 'zod'

function svc() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// GET — returns current mappings + QB expense accounts for UI
export async function GET(req: NextRequest) {
  const deny = await requireAdmin(req); if (deny) return deny

  const [{ data: mappings }, accounts] = await Promise.all([
    svc().from('qb_category_mappings').select('*').order('category'),
    fetchExpenseAccounts(),
  ])

  return NextResponse.json({ mappings: mappings ?? [], accounts })
}

const SaveSchema = z.object({
  mappings: z.array(z.object({
    category:        z.string().min(1),
    qb_account_id:   z.string().min(1),
    qb_account_name: z.string().optional(),
  })),
})

// POST — upsert all category mappings
export async function POST(req: NextRequest) {
  const deny = await requireAdmin(req); if (deny) return deny
  const body   = await req.json()
  const parsed = SaveSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })

  const rows = parsed.data.mappings.map(m => ({
    category:        m.category,
    qb_account_id:   m.qb_account_id,
    qb_account_name: m.qb_account_name ?? null,
    updated_at:      new Date().toISOString(),
  }))

  const { error } = await svc()
    .from('qb_category_mappings')
    .upsert(rows, { onConflict: 'category', ignoreDuplicates: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
