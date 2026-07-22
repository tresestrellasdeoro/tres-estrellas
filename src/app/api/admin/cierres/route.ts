import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/api-auth'
import { z } from 'zod'

function service() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// GET — list cierres with optional sucursal/date filters
export async function GET(req: NextRequest) {
  const deny = await requireAdmin(req); if (deny) return deny

  const { searchParams } = req.nextUrl
  const sucursalId = searchParams.get('sucursal_id')
  const fecha      = searchParams.get('fecha')
  const limit      = parseInt(searchParams.get('limit') ?? '50')

  let query = service()
    .from('cierres_turno')
    .select(`
      *,
      sucursales(name, code),
      profiles(full_name, email)
    `)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (sucursalId) query = query.eq('sucursal_id', sucursalId) as any
  if (fecha)      query = query.eq('fecha', fecha) as any

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ cierres: data })
}

const CierreSchema = z.object({
  sucursal_id:    z.string().uuid(),
  user_id:        z.string().uuid().optional(),
  fecha:          z.string().optional(),
  notas:          z.string().optional(),
})

// POST — create a new cierre de turno (auto-calculates totals from bookings)
export async function POST(req: NextRequest) {
  const deny = await requireAdmin(req); if (deny) return deny

  const body = await req.json()
  const parsed = CierreSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })

  const { sucursal_id, user_id, notas } = parsed.data
  const fecha = parsed.data.fecha ?? new Date().toISOString().split('T')[0]

  const svc = service()

  // Prevent duplicate cierres for same sucursal+fecha
  const { data: existing } = await svc
    .from('cierres_turno')
    .select('id')
    .eq('sucursal_id', sucursal_id)
    .eq('fecha', fecha)
    .maybeSingle()
  if (existing) {
    return NextResponse.json({ error: `Ya existe un cierre para esta sucursal el ${fecha}` }, { status: 409 })
  }

  // Branches are in Pacific Time (UTC-7). Midnight local = 07:00 UTC.
  // Filter created_at using UTC boundaries that correspond to the local calendar day.
  const fechaStart = `${fecha}T07:00:00.000Z`
  const nextDay = new Date(`${fecha}T12:00:00.000Z`)
  nextDay.setUTCDate(nextDay.getUTCDate() + 1)
  const fechaEnd = nextDay.toISOString().split('T')[0] + 'T06:59:59.999Z'

  let bookingQuery = svc
    .from('bookings')
    .select('id, total_amount, payment_method')
    .gte('created_at', fechaStart)
    .lte('created_at', fechaEnd)
    .eq('status', 'confirmed')

  if (sucursal_id) bookingQuery = bookingQuery.eq('sucursal_id', sucursal_id) as any
  if (user_id)     bookingQuery = bookingQuery.eq('sold_by_user_id', user_id) as any

  const { data: bookings } = await bookingQuery

  // Get packages for this sucursal/date
  const { data: packages } = await svc
    .from('packages')
    .select('price')
    .gte('created_at', fechaStart)
    .lte('created_at', fechaEnd)
    .eq('sucursal_id', sucursal_id)
    .then(r => r, () => ({ data: [] as any[] })) as any

  const total_boletos  = bookings?.length ?? 0
  const total_efectivo = bookings?.filter((b: any) => b.payment_method === 'cash').reduce((s: number, b: any) => s + (b.total_amount || 0), 0) ?? 0
  const total_tarjeta  = bookings?.filter((b: any) => b.payment_method === 'card').reduce((s: number, b: any) => s + (b.total_amount || 0), 0) ?? 0
  const total_paquetes = (packages ?? []).reduce((s: number, p: any) => s + (p.price || 0), 0)
  const total_general  = total_efectivo + total_tarjeta + total_paquetes

  const { data: cierre, error } = await svc
    .from('cierres_turno')
    .insert({
      sucursal_id,
      user_id:   user_id ?? null,
      fecha,
      total_boletos,
      total_efectivo,
      total_tarjeta,
      total_paquetes,
      total_general,
      notas: notas ?? null,
    })
    .select('*, sucursales(name, code)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Sync cierre to QuickBooks — one entry per branch per day (cleaner than per-ticket)
  try {
    const { getValidTokens } = await import('@/lib/quickbooks/client')
    const tokens = await getValidTokens()

    if (tokens && total_general > 0) {
      const sucData = (cierre as any).sucursales as { name: string; code: string } | null
      const sucName = sucData?.name ?? 'Sin sucursal'
      const sucCode = sucData?.code ?? ''

      // Get QB account config for this sucursal
      const { data: sucConfig } = await svc
        .from('sucursales')
        .select('qb_cash_account_id, qb_item_id')
        .eq('id', sucursal_id)
        .maybeSingle()
      const cashAccountId = (sucConfig as any)?.qb_cash_account_id ?? null
      const itemId        = (sucConfig as any)?.qb_item_id ?? null
      const itemRef       = itemId ? { value: itemId } : { value: '1', name: 'Services' }

      const privateNote = [
        `Cierre de turno — ${sucName} [${sucCode}]`,
        `Boletos: ${total_boletos}`,
        `Efectivo: $${total_efectivo.toFixed(2)}`,
        `Tarjeta: $${total_tarjeta.toFixed(2)}`,
        `Paquetes: $${total_paquetes.toFixed(2)}`,
        `Total: $${total_general.toFixed(2)}`,
        notas ? `Notas: ${notas}` : '',
      ].filter(Boolean).join('\n')

      const qbHeaders = {
        Authorization:  `Bearer ${tokens.access_token}`,
        'Content-Type': 'application/json',
        Accept:         'application/json',
      }
      const QB_URL = `https://quickbooks.api.intuit.com/v3/company/${tokens.realm_id}/salesreceipt`

      const { logQBTransaction } = await import('@/lib/quickbooks/client')
      const cierreId = (cierre as any).id as string

      // Send cash sales — deposit to the branch cash account
      if (total_efectivo + total_paquetes > 0) {
        const cashDocNumber = `CIERRE-${sucCode}-${fecha}-EF`
        const cashBody: Record<string, unknown> = {
          DocNumber:   cashDocNumber,
          TxnDate:     fecha,
          PrivateNote: privateNote,
          Line: [{
            Amount:      total_efectivo + total_paquetes,
            DetailType:  'SalesItemLineDetail',
            Description: `[${sucCode}] Efectivo y paquetes — ${fecha}`,
            SalesItemLineDetail: { ItemRef: itemRef, Qty: 1, UnitPrice: total_efectivo + total_paquetes },
          }],
          ...(cashAccountId ? { DepositToAccountRef: { value: cashAccountId } } : {}),
        }
        const cashRes  = await fetch(QB_URL, { method: 'POST', headers: qbHeaders, body: JSON.stringify(cashBody) })
        const cashData = cashRes.ok ? await cashRes.json() : null
        await logQBTransaction({
          type:          'sales_receipt',
          docNumber:     cashDocNumber,
          qbId:          cashData?.SalesReceipt?.Id ?? null,
          amount:        total_efectivo + total_paquetes,
          description:   `[${sucCode}] Efectivo y paquetes — ${fecha}`,
          referenceType: 'cierre',
          referenceId:   cierreId,
          payload:       cashBody,
        })
      }

      // Send card sales — go to Undeposited Funds (bank reconciliation done separately)
      if (total_tarjeta > 0) {
        const cardDocNumber = `CIERRE-${sucCode}-${fecha}-TC`
        const cardBody: Record<string, unknown> = {
          DocNumber:   cardDocNumber,
          TxnDate:     fecha,
          PrivateNote: privateNote,
          Line: [{
            Amount:      total_tarjeta,
            DetailType:  'SalesItemLineDetail',
            Description: `[${sucCode}] Tarjeta — ${fecha}`,
            SalesItemLineDetail: { ItemRef: itemRef, Qty: 1, UnitPrice: total_tarjeta },
          }],
        }
        const cardRes  = await fetch(QB_URL, { method: 'POST', headers: qbHeaders, body: JSON.stringify(cardBody) })
        const cardData = cardRes.ok ? await cardRes.json() : null
        await logQBTransaction({
          type:          'sales_receipt',
          docNumber:     cardDocNumber,
          qbId:          cardData?.SalesReceipt?.Id ?? null,
          amount:        total_tarjeta,
          description:   `[${sucCode}] Tarjeta — ${fecha}`,
          referenceType: 'cierre',
          referenceId:   cierreId,
          payload:       cardBody,
        })
      }

      await svc.from('cierres_turno').update({ qb_synced: true }).eq('id', cierreId)
    }
  } catch (qbErr: any) {
    console.error('QB cierre sync skipped:', qbErr.message)
  }

  return NextResponse.json({ cierre }, { status: 201 })
}
