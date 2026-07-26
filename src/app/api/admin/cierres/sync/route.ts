import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/api-auth'
import { z } from 'zod'

function svc() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

const Schema = z.object({ cierre_id: z.string().uuid() })

// POST /api/admin/cierres/sync
// Retries QuickBooks sync for a cierre that previously failed
export async function POST(req: NextRequest) {
  const deny = await requireAdmin(req); if (deny) return deny

  const body   = await req.json()
  const parsed = Schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'cierre_id requerido' }, { status: 422 })

  const { cierre_id } = parsed.data

  const { data: cierre, error: fetchErr } = await svc()
    .from('cierres_turno')
    .select(`
      id, fecha, sucursal_id, user_id,
      total_efectivo, total_tarjeta, total_paquetes, total_general,
      total_boletos, notas, qb_synced,
      sucursales(name, code, qb_cash_account_id, qb_item_id),
      profiles(full_name, email)
    `)
    .eq('id', cierre_id)
    .maybeSingle() as { data: any; error: any }

  if (fetchErr || !cierre) return NextResponse.json({ error: 'Cierre no encontrado' }, { status: 404 })
  if (cierre.qb_synced) return NextResponse.json({ ok: true, message: 'Este cierre ya está sincronizado con QB.' })

  const { total_efectivo, total_tarjeta, total_paquetes, total_general, fecha, notas } = cierre
  const sucursales = cierre.sucursales as { name: string; code: string; qb_cash_account_id: string | null; qb_item_id: string | null } | null
  const profiles   = cierre.profiles   as { full_name: string; email: string } | null

  const sucName      = sucursales?.name ?? 'Sin sucursal'
  const sucCode      = sucursales?.code ?? ''
  const cajeroNombre = profiles?.full_name ?? profiles?.email ?? 'Cajero'
  const turnoSuffix  = cierre_id.slice(0, 6).toUpperCase()

  try {
    const { getValidTokens, logQBTransaction } = await import('@/lib/quickbooks/client')
    const tokens = await getValidTokens()

    if (!tokens) return NextResponse.json({ error: 'No hay tokens de QuickBooks válidos. Reconecta QB desde Ajustes.' }, { status: 503 })

    const itemRef = sucursales?.qb_item_id
      ? { value: sucursales.qb_item_id }
      : { value: '1', name: 'Services' }

    const privateNote = [
      `Cierre de turno — ${sucName} [${sucCode}]`,
      `Cajero: ${cajeroNombre}`,
      `Boletos: ${cierre.total_boletos}`,
      `Efectivo: $${total_efectivo.toFixed(2)}`,
      `Tarjeta: $${total_tarjeta.toFixed(2)}`,
      `Paquetes: $${total_paquetes.toFixed(2)}`,
      `Total: $${total_general.toFixed(2)}`,
      notas ? `Notas: ${notas}` : '',
      `(reintento desde admin)`,
    ].filter(Boolean).join('\n')

    const qbHeaders = {
      Authorization:  `Bearer ${tokens.access_token}`,
      'Content-Type': 'application/json',
      Accept:         'application/json',
    }
    const QB_URL = `https://quickbooks.api.intuit.com/v3/company/${tokens.realm_id}/salesreceipt`

    let synced = true

    if (total_efectivo + total_paquetes > 0) {
      const docNum  = `CIERRE-${sucCode}-${fecha}-${turnoSuffix}-EF`
      const cashBody: Record<string, unknown> = {
        DocNumber:   docNum,
        TxnDate:     fecha,
        PrivateNote: privateNote,
        Line: [{
          Amount:      total_efectivo + total_paquetes,
          DetailType:  'SalesItemLineDetail',
          Description: `[${sucCode}] ${cajeroNombre} — Efectivo/Paquetes ${fecha}`,
          SalesItemLineDetail: { ItemRef: itemRef, Qty: 1, UnitPrice: total_efectivo + total_paquetes },
        }],
        ...(sucursales?.qb_cash_account_id ? { DepositToAccountRef: { value: sucursales.qb_cash_account_id } } : {}),
      }
      const r = await fetch(QB_URL, { method: 'POST', headers: qbHeaders, body: JSON.stringify(cashBody) })
      const d = r.ok ? await r.json() : null
      if (!r.ok) {
        // QB duplicate doc = already exists → treat as success
        const errText = await r.text().catch(() => '')
        const isDupe  = errText.includes('6140') || errText.includes('Duplicate')
        if (!isDupe) synced = false
      }
      if (r.ok || true) {
        await logQBTransaction({
          type: 'sales_receipt', docNumber: docNum, qbId: d?.SalesReceipt?.Id ?? null,
          amount: total_efectivo + total_paquetes,
          description: `[${sucCode}] ${cajeroNombre} — Efectivo/Paquetes ${fecha} (retry)`,
          referenceType: 'cierre', referenceId: cierre_id, payload: cashBody,
        }).catch(() => {})
      }
    }

    if (total_tarjeta > 0) {
      const docNum  = `CIERRE-${sucCode}-${fecha}-${turnoSuffix}-TC`
      const cardBody: Record<string, unknown> = {
        DocNumber:   docNum,
        TxnDate:     fecha,
        PrivateNote: privateNote,
        Line: [{
          Amount:      total_tarjeta,
          DetailType:  'SalesItemLineDetail',
          Description: `[${sucCode}] ${cajeroNombre} — Tarjeta ${fecha}`,
          SalesItemLineDetail: { ItemRef: itemRef, Qty: 1, UnitPrice: total_tarjeta },
        }],
      }
      const r = await fetch(QB_URL, { method: 'POST', headers: qbHeaders, body: JSON.stringify(cardBody) })
      const d = r.ok ? await r.json() : null
      if (!r.ok) {
        const errText = await r.text().catch(() => '')
        const isDupe  = errText.includes('6140') || errText.includes('Duplicate')
        if (!isDupe) synced = false
      }
      if (r.ok || true) {
        await logQBTransaction({
          type: 'sales_receipt', docNumber: docNum, qbId: d?.SalesReceipt?.Id ?? null,
          amount: total_tarjeta,
          description: `[${sucCode}] ${cajeroNombre} — Tarjeta ${fecha} (retry)`,
          referenceType: 'cierre', referenceId: cierre_id, payload: cardBody,
        }).catch(() => {})
      }
    }

    if (synced) {
      await svc().from('cierres_turno').update({ qb_synced: true }).eq('id', cierre_id)
      return NextResponse.json({ ok: true, message: 'Cierre enviado a QuickBooks correctamente.' })
    } else {
      return NextResponse.json({ ok: false, error: 'QB rechazó el cierre. Verifica los logs de QB en Contabilidad.' }, { status: 502 })
    }
  } catch (err: any) {
    console.error('QB retry sync error:', err.message)
    return NextResponse.json({ error: 'Error al conectar con QuickBooks: ' + err.message }, { status: 500 })
  }
}
