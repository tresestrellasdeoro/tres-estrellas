import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'

function svc() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function getStaffUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await svc()
    .from('profiles')
    .select('id, role, sucursal_id, full_name')
    .eq('id', user.id)
    .maybeSingle() as { data: { id: string; role: string; sucursal_id: string | null; full_name: string | null } | null }

  const staffRoles = ['cajero', 'admin', 'super_admin', 'developer']
  if (!profile || !staffRoles.includes(profile.role)) return null
  return { user, profile }
}

// GET — turno activo del cajero autenticado
export async function GET() {
  const auth = await getStaffUser()
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: turno } = await svc()
    .from('turnos')
    .select(`
      *,
      sucursales(name, code)
    `)
    .eq('cajero_user_id', auth.user.id)
    .eq('estado', 'activo')
    .maybeSingle()

  return NextResponse.json({ turno: turno ?? null })
}

// POST — iniciar o cerrar turno
export async function POST(req: NextRequest) {
  const auth = await getStaffUser()
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json()
  const { action, notas, sucursal_id: bodySucursalId } = body as { action: 'iniciar' | 'cerrar'; notas?: string; sucursal_id?: string }

  if (action === 'iniciar') {
    const sucursalId = bodySucursalId || auth.profile.sucursal_id
    if (!sucursalId) {
      return NextResponse.json({ error: 'Selecciona una sucursal para iniciar el turno.' }, { status: 422 })
    }

    // Verificar que no haya turno activo ya
    const { data: existing } = await svc()
      .from('turnos')
      .select('id')
      .eq('cajero_user_id', auth.user.id)
      .eq('estado', 'activo')
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ error: 'Ya tienes un turno activo.' }, { status: 409 })
    }

    const { data: turno, error } = await svc()
      .from('turnos')
      .insert({
        cajero_user_id: auth.user.id,
        sucursal_id:    sucursalId,
        inicio:         new Date().toISOString(),
        estado:         'activo',
      })
      .select('*, sucursales(name, code)')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ turno }, { status: 201 })
  }

  if (action === 'cerrar') {
    // Buscar turno activo
    const { data: turno } = await svc()
      .from('turnos')
      .select('*, sucursales(name, code)')
      .eq('cajero_user_id', auth.user.id)
      .eq('estado', 'activo')
      .maybeSingle() as { data: any }

    if (!turno) return NextResponse.json({ error: 'No tienes un turno activo.' }, { status: 404 })

    const fin   = new Date().toISOString()
    const fecha = fin.split('T')[0]

    // Calcular totales: ventas del cajero desde inicio del turno
    const { data: bookings } = await svc()
      .from('bookings')
      .select('id, total_amount, payment_method')
      .eq('sold_by_user_id', auth.user.id)
      .eq('status', 'confirmed')
      .gte('created_at', turno.inicio)
      .lte('created_at', fin)

    const { data: packages } = await svc()
      .from('packages')
      .select('price')
      .eq('sucursal_id', turno.sucursal_id)
      .gte('created_at', turno.inicio)
      .lte('created_at', fin)
      .then(r => r, () => ({ data: [] as any[] })) as any

    const total_boletos  = bookings?.length ?? 0
    const total_efectivo = bookings?.filter((b: any) => b.payment_method === 'cash').reduce((s: number, b: any) => s + (b.total_amount || 0), 0) ?? 0
    const total_tarjeta  = bookings?.filter((b: any) => b.payment_method === 'card').reduce((s: number, b: any) => s + (b.total_amount || 0), 0) ?? 0
    const total_paquetes = (packages ?? []).reduce((s: number, p: any) => s + (p.price || 0), 0)
    const total_general  = total_efectivo + total_tarjeta + total_paquetes

    // Crear cierre en cierres_turno (uno por cajero por turno)
    const sucursales = turno.sucursales as { name: string; code: string } | null
    const sucName    = sucursales?.name ?? 'Sin sucursal'
    const sucCode    = sucursales?.code ?? ''
    const cajeroNombre = auth.profile.full_name ?? auth.user.email ?? auth.user.id.slice(0, 8)

    const { data: cierre, error: cierreError } = await svc()
      .from('cierres_turno')
      .insert({
        sucursal_id:    turno.sucursal_id,
        user_id:        auth.user.id,
        fecha,
        total_boletos,
        total_efectivo,
        total_tarjeta,
        total_paquetes,
        total_general,
        notas: notas ?? null,
      })
      .select('id')
      .single()

    if (cierreError) {
      return NextResponse.json({ error: `Error al crear cierre: ${cierreError.message}` }, { status: 500 })
    }

    // Actualizar turno como cerrado
    await svc()
      .from('turnos')
      .update({
        fin,
        estado:         'cerrado',
        total_boletos,
        total_efectivo,
        total_tarjeta,
        total_paquetes,
        total_general,
        notas:          notas ?? null,
        cierre_id:      cierre.id,
      })
      .eq('id', turno.id)

    // Sync a QuickBooks
    let qbSynced = false
    try {
      const { getValidTokens, logQBTransaction } = await import('@/lib/quickbooks/client')
      const tokens = await getValidTokens()

      if (tokens && total_general > 0) {
        const { data: sucConfig } = await svc()
          .from('sucursales')
          .select('qb_cash_account_id, qb_item_id')
          .eq('id', turno.sucursal_id)
          .maybeSingle() as { data: any }

        const itemRef = sucConfig?.qb_item_id
          ? { value: sucConfig.qb_item_id }
          : { value: '1', name: 'Services' }

        const privateNote = [
          `Cierre de turno — ${sucName} [${sucCode}]`,
          `Cajero: ${cajeroNombre}`,
          `Turno: ${new Date(turno.inicio).toLocaleString('es-MX')} → ${new Date(fin).toLocaleString('es-MX')}`,
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
        const turnoSuffix = turno.id.slice(0, 6).toUpperCase()

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
            ...(sucConfig?.qb_cash_account_id ? { DepositToAccountRef: { value: sucConfig.qb_cash_account_id } } : {}),
          }
          const r = await fetch(QB_URL, { method: 'POST', headers: qbHeaders, body: JSON.stringify(cashBody) })
          const d = r.ok ? await r.json() : null
          await logQBTransaction({
            type: 'sales_receipt', docNumber: docNum, qbId: d?.SalesReceipt?.Id ?? null,
            amount: total_efectivo + total_paquetes,
            description: `[${sucCode}] ${cajeroNombre} — Efectivo/Paquetes ${fecha}`,
            referenceType: 'cierre', referenceId: cierre.id, payload: cashBody,
          })
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
          await logQBTransaction({
            type: 'sales_receipt', docNumber: docNum, qbId: d?.SalesReceipt?.Id ?? null,
            amount: total_tarjeta,
            description: `[${sucCode}] ${cajeroNombre} — Tarjeta ${fecha}`,
            referenceType: 'cierre', referenceId: cierre.id, payload: cardBody,
          })
        }

        await svc().from('cierres_turno').update({ qb_synced: true }).eq('id', cierre.id)
        qbSynced = true
      } else if (!tokens) {
        // No QB tokens — skip but flag as pending
        console.warn('QB turno sync: no valid tokens, cierre queued as pending')
      } else {
        // total_general = 0, nothing to sync
        qbSynced = true
      }
    } catch (qbErr: any) {
      console.error('QB turno sync failed:', qbErr.message)
    }

    return NextResponse.json({
      ok: true,
      cierre_id: cierre.id,
      qb_synced: qbSynced,
      totales: { total_boletos, total_efectivo, total_tarjeta, total_paquetes, total_general },
    })
  }

  return NextResponse.json({ error: 'Acción inválida. Usa iniciar o cerrar.' }, { status: 400 })
}
