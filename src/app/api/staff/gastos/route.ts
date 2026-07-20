import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'

function svc() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

const GastoSchema = z.object({
  amount:         z.number().positive(),
  category:       z.string().min(1),
  description:    z.string().optional(),
  date:           z.string(),
  payment_method: z.enum(['cash', 'card']).default('cash'),
  sucursal_id:    z.string().uuid().optional().nullable(),
})

// GET — list gastos (filtered by sucursal/date for staff, all for admin)
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { searchParams } = req.nextUrl
  const sucursalId = searchParams.get('sucursal_id')
  const fecha      = searchParams.get('fecha')
  const limit      = parseInt(searchParams.get('limit') ?? '50')

  let query = svc()
    .from('gastos')
    .select('*, profiles(full_name, email), sucursales(name, code)')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (sucursalId) query = query.eq('sucursal_id', sucursalId) as any
  if (fecha)      query = query.eq('date', fecha) as any

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ gastos: data })
}

// POST — register a new expense
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body   = await req.json()
  const parsed = GastoSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })

  const { amount, category, description, date, payment_method, sucursal_id } = parsed.data
  const db = svc()

  // Get sucursal info + QB account map for this category
  let sucursalName: string | null = null
  let sucursalCode: string | null = null
  let qbCashAccountId: string | null = null
  let qbExpenseAccountId: string | null = null

  const resolveSucursal = (suc: any) => {
    sucursalName       = suc?.name ?? null
    sucursalCode       = suc?.code ?? null
    qbCashAccountId    = suc?.qb_cash_account_id ?? null
    // Pick the account for this specific category, fall back to generic expense account
    const map: Record<string, string> = suc?.qb_expense_accounts ?? {}
    qbExpenseAccountId = map[category] ?? suc?.qb_expense_account_id ?? null
  }

  if (sucursal_id) {
    const { data: suc } = await db
      .from('sucursales')
      .select('name, code, qb_cash_account_id, qb_expense_account_id, qb_expense_accounts')
      .eq('id', sucursal_id)
      .maybeSingle()
    resolveSucursal(suc)
  } else {
    // Fall back to the user's assigned sucursal
    const { data: profile } = await db
      .from('profiles')
      .select('sucursal_id, sucursales(name, code, qb_cash_account_id, qb_expense_account_id, qb_expense_accounts)')
      .eq('id', user.id)
      .maybeSingle() as { data: any }
    if (profile?.sucursales) resolveSucursal(profile.sucursales)
  }

  const docNumber = `GASTO-${sucursalCode ?? 'GEN'}-${date.replace(/-/g, '')}-${Date.now().toString().slice(-4)}`

  // Create gasto record
  const { data: gasto, error } = await db
    .from('gastos')
    .insert({
      user_id:        user.id,
      sucursal_id:    sucursal_id ?? null,
      amount,
      category,
      description:    description ?? null,
      date,
      payment_method,
    })
    .select('id')
    .single()

  if (error || !gasto) return NextResponse.json({ error: error?.message ?? 'Error al registrar gasto' }, { status: 500 })

  // Sync to QuickBooks
  let qbPurchaseId: string | null = null
  let qbError: string | null = null
  try {
    const { createPurchase, logQBTransaction } = await import('@/lib/quickbooks/client')
    const result = await createPurchase({
      amount,
      category,
      description:      description ?? '',
      date,
      paymentMethod:    payment_method,
      sucursalName,
      sucursalCode,
      docNumber,
      paymentAccountId: payment_method === 'cash' ? qbCashAccountId : null,
      expenseAccountId: qbExpenseAccountId,
    })
    qbPurchaseId = result.Purchase.Id

    await logQBTransaction({
      type:          'purchase',
      docNumber,
      qbId:          qbPurchaseId,
      amount,
      description:   `[${sucursalCode ?? 'GEN'}] ${category} — ${description ?? ''} — ${date}`,
      referenceType: 'gasto',
      referenceId:   gasto.id,
      payload:       { category, description, payment_method, sucursalCode },
    })

    await db.from('gastos').update({ qb_synced: true, qb_purchase_id: qbPurchaseId }).eq('id', gasto.id)
  } catch (err: any) {
    qbError = err.message
    console.error('QB gasto sync skipped:', err.message)
  }

  return NextResponse.json({
    gasto_id:      gasto.id,
    doc_number:    docNumber,
    qb_synced:     !!qbPurchaseId,
    qb_purchase_id: qbPurchaseId,
    qb_error:      qbError,
  }, { status: 201 })
}
