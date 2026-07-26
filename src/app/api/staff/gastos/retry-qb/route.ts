import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'
import { requireStaff } from '@/lib/api-auth'

function svc() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// POST /api/staff/gastos/retry-qb { gasto_id }
export async function POST(req: NextRequest) {
  const deny = await requireStaff(req); if (deny) return deny
  const { gasto_id } = await req.json()
  if (!gasto_id) return NextResponse.json({ error: 'gasto_id requerido' }, { status: 400 })

  const db = svc()

  // Fetch the gasto
  const { data: gasto, error: gastoErr } = await db
    .from('gastos')
    .select('*, sucursales(name, code, qb_cash_account_id, qb_expense_account_id, qb_expense_accounts)')
    .eq('id', gasto_id)
    .maybeSingle() as { data: any; error: any }

  if (gastoErr || !gasto) return NextResponse.json({ error: 'Gasto no encontrado' }, { status: 404 })
  if (gasto.qb_synced)     return NextResponse.json({ ok: true, message: 'Ya estaba sincronizado' })

  const suc = gasto.sucursales
  const sucursalName      = suc?.name ?? null
  const sucursalCode      = suc?.code ?? null
  const qbCashAccountId   = suc?.qb_cash_account_id ?? null
  const categoryMap: Record<string, string> = suc?.qb_expense_accounts ?? {}
  const qbExpenseAccountId = categoryMap[gasto.category] ?? suc?.qb_expense_account_id ?? null

  const docNumber = `GASTO-${sucursalCode ?? 'GEN'}-${gasto.date.replace(/-/g, '')}-${Date.now().toString().slice(-4)}`

  // Check category-level mapping override
  const { data: catMapping } = await db
    .from('qb_category_mappings')
    .select('qb_account_id')
    .eq('category', gasto.category)
    .maybeSingle() as { data: { qb_account_id: string } | null }

  let qbPurchaseId: string | null = null
  let message = ''

  try {
    const { createPurchase, logQBTransaction } = await import('@/lib/quickbooks/client')
    const result = await createPurchase({
      amount:          Number(gasto.amount),
      category:        gasto.category,
      description:     gasto.description ?? '',
      date:            gasto.date,
      paymentMethod:   gasto.payment_method,
      sucursalName,
      sucursalCode,
      docNumber,
      paymentAccountId: gasto.payment_method === 'cash' ? qbCashAccountId : null,
      expenseAccountId: catMapping?.qb_account_id ?? qbExpenseAccountId,
      vendor:           gasto.vendor ?? null,
      receiptNumber:    gasto.receipt_number ?? null,
    })
    qbPurchaseId = result.Purchase.Id

    await logQBTransaction({
      type:          'purchase',
      docNumber,
      qbId:          qbPurchaseId,
      amount:        Number(gasto.amount),
      description:   `[${sucursalCode ?? 'GEN'}] ${gasto.category} — ${gasto.description ?? ''} — ${gasto.date}`,
      referenceType: 'gasto',
      referenceId:   gasto.id,
      payload:       { category: gasto.category, vendor: gasto.vendor, payment_method: gasto.payment_method, sucursalCode },
    })

    await db.from('gastos').update({ qb_synced: true, qb_purchase_id: qbPurchaseId }).eq('id', gasto.id)
    message = `Sincronizado con QB — Purchase #${qbPurchaseId}`
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, qb_purchase_id: qbPurchaseId, message })
}
