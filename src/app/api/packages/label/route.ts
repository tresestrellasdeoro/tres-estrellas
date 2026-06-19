import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'
import QRCode from 'qrcode'
import { PACKAGE_SIZES } from '@/lib/packages'

function svc() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(req: NextRequest) {
  const tracking = req.nextUrl.searchParams.get('n')?.toUpperCase().trim()
  if (!tracking) return new NextResponse('Tracking requerido', { status: 400 })

  const db = svc()
  const { data: pkg } = await db
    .from('packages')
    .select(`
      tracking_number, sender_name, sender_phone, recipient_name, recipient_phone, recipient_email,
      size, weight_lbs, declared_value, price, notes, created_at,
      origin:stops!packages_origin_stop_id_fkey(name, city),
      destination:stops!packages_destination_stop_id_fkey(name, city)
    `)
    .eq('tracking_number', tracking)
    .maybeSingle()

  if (!pkg) return new NextResponse('No encontrado', { status: 404 })

  const qrDataUrl = await QRCode.toDataURL(tracking, { width: 200, margin: 1 })
  const sizeInfo  = PACKAGE_SIZES[pkg.size as keyof typeof PACKAGE_SIZES]
  const date      = new Date(pkg.created_at).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })

  const origin      = (pkg.origin as unknown as { name: string; city: string } | null)
  const destination = (pkg.destination as unknown as { name: string; city: string } | null)

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Etiqueta ${tracking}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; background: #fff; }
    .label {
      width: 4in; min-height: 6in; border: 2px solid #000;
      margin: 0.25in auto; padding: 0.2in;
      page-break-inside: avoid;
    }
    .header { display: flex; align-items: center; gap: 12px; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 10px; }
    .header-logo { font-size: 22px; font-weight: 900; color: #c01515; letter-spacing: -1px; }
    .header-sub  { font-size: 10px; color: #666; }
    .tracking    { text-align: center; font-size: 28px; font-weight: 900; letter-spacing: 2px; margin: 10px 0; font-family: monospace; }
    .qr          { text-align: center; margin: 8px 0; }
    .section     { border: 1px solid #ccc; border-radius: 4px; padding: 8px; margin: 6px 0; }
    .section-title { font-size: 9px; font-weight: bold; text-transform: uppercase; color: #999; margin-bottom: 4px; }
    .section-value { font-size: 14px; font-weight: bold; }
    .section-sub   { font-size: 11px; color: #555; }
    .arrow { text-align: center; font-size: 24px; margin: 4px 0; }
    .size-badge { display: inline-block; background: #0a1e42; color: #fff; padding: 4px 12px; border-radius: 4px; font-size: 13px; font-weight: bold; }
    .price { font-size: 22px; font-weight: 900; color: #c01515; }
    .footer { border-top: 1px solid #ccc; margin-top: 8px; padding-top: 6px; font-size: 9px; color: #999; text-align: center; }
    .row { display: flex; gap: 8px; }
    .row .section { flex: 1; }
    @media print {
      body { margin: 0; }
      .no-print { display: none !important; }
      .label { margin: 0; border: 2px solid #000; }
    }
  </style>
</head>
<body>
  <div class="no-print" style="text-align:center;padding:16px;background:#f0f0f0;">
    <button onclick="window.print()" style="background:#c01515;color:#fff;border:none;padding:10px 24px;border-radius:8px;font-size:14px;font-weight:bold;cursor:pointer;">
      🖨️ Imprimir etiqueta
    </button>
  </div>

  <div class="label">
    <div class="header">
      <div>
        <div class="header-logo">TEO</div>
        <div class="header-sub">Tres Estrellas de Oro</div>
      </div>
      <div style="margin-left:auto;text-align:right;">
        <div class="size-badge">${sizeInfo?.label ?? pkg.size}</div>
        <div style="font-size:10px;color:#666;margin-top:4px;">${sizeInfo?.dims ?? ''}</div>
      </div>
    </div>

    <div class="tracking">${tracking}</div>
    <div class="qr"><img src="${qrDataUrl}" width="150" height="150" /></div>

    <div class="row">
      <div class="section">
        <div class="section-title">De (Remitente)</div>
        <div class="section-value">${pkg.sender_name}</div>
        <div class="section-sub">📞 ${pkg.sender_phone}</div>
      </div>
    </div>

    <div class="arrow">↓</div>

    <div class="row">
      <div class="section" style="border-color:#c01515;border-width:2px;">
        <div class="section-title" style="color:#c01515;">Para (Destinatario)</div>
        <div class="section-value">${pkg.recipient_name}</div>
        <div class="section-sub">📞 ${pkg.recipient_phone}</div>
        ${pkg.recipient_email ? `<div class="section-sub">✉️ ${pkg.recipient_email}</div>` : ''}
      </div>
    </div>

    <div class="row" style="margin-top:6px;">
      <div class="section">
        <div class="section-title">Origen</div>
        <div class="section-value" style="font-size:12px;">${origin?.name ?? '—'}</div>
        <div class="section-sub">${origin?.city ?? ''}</div>
      </div>
      <div style="display:flex;align-items:center;padding:0 4px;font-size:18px;">→</div>
      <div class="section">
        <div class="section-title">Destino</div>
        <div class="section-value" style="font-size:12px;">${destination?.name ?? '—'}</div>
        <div class="section-sub">${destination?.city ?? ''}</div>
      </div>
    </div>

    <div class="row" style="margin-top:6px;align-items:center;">
      <div class="section">
        <div class="section-title">Peso declarado</div>
        <div class="section-value">${pkg.weight_lbs > 0 ? `${pkg.weight_lbs} lbs` : 'No declarado'}</div>
      </div>
      <div class="section" style="text-align:center;">
        <div class="section-title">Total pagado</div>
        <div class="price">$${Number(pkg.price).toFixed(2)}</div>
      </div>
    </div>

    ${pkg.notes ? `<div class="section" style="margin-top:6px;"><div class="section-title">Nota</div><div class="section-sub">${pkg.notes}</div></div>` : ''}

    <div class="footer">
      Fecha: ${date} · tresestrellasdeoroinc.com · 1 800 337-8745
      <br>Rastrear: tresestrellasdeoroinc.com/paqueteo?t=${tracking}
    </div>
  </div>
</body>
</html>`

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}
