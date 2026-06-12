interface TicketEmailData {
  bookingNumber: string
  passengerNames: string[]
  origin: string
  destination: string
  date: string
  departureTime: string
  boardingStop: string
  total: number
  qrDataUrl: string
  tripType: string
  paymentMethod?: string
  returnDate?: string
}

function esc(s: string) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
}

export function ticketEmailHtml(d: TicketEmailData): string {
  const passengers = d.passengerNames.map(name =>
    `<tr><td style="padding:6px 0;border-bottom:1px solid #f0f0f0;color:#374151;font-size:14px;">👤 ${esc(name)}</td></tr>`
  ).join('')

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Tu boleto — Tres Estrellas de Oro</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);max-width:600px;width:100%;">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#0a1e42 0%,#0f2c5c 100%);padding:32px 40px;text-align:center;">
            <div style="background:#ffffff;border-radius:12px;display:inline-block;padding:12px 24px;margin-bottom:16px;">
              <span style="font-size:22px;font-weight:900;color:#0f2c5c;letter-spacing:1px;">★★★ TEO</span>
            </div>
            <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:900;">¡Reservación confirmada!</h1>
            <p style="margin:8px 0 0;color:rgba(255,255,255,0.65);font-size:14px;">Tres Estrellas de Oro Inc.</p>
          </td>
        </tr>

        <!-- Booking number -->
        <tr>
          <td style="background:#c01515;padding:14px 40px;text-align:center;">
            <p style="margin:0;color:rgba(255,255,255,0.8);font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">Número de reservación</p>
            <p style="margin:4px 0 0;color:#ffffff;font-size:28px;font-weight:900;letter-spacing:4px;">${d.bookingNumber}</p>
          </td>
        </tr>

        <!-- QR Code -->
        <tr>
          <td style="padding:32px 40px;text-align:center;border-bottom:2px dashed #e5e7eb;">
            <p style="margin:0 0 16px;color:#6b7280;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:1px;">Muestra este código al abordar</p>
            <img src="${d.qrDataUrl}" alt="QR Boleto" width="180" height="180" style="border-radius:12px;border:4px solid #f3f4f6;" />
            <p style="margin:12px 0 0;color:#9ca3af;font-size:11px;">Escanea para verificar tu boleto</p>
          </td>
        </tr>

        <!-- Trip info -->
        <tr>
          <td style="padding:28px 40px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="width:50%;padding-right:16px;">
                  <p style="margin:0 0 4px;color:#9ca3af;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;">Origen</p>
                  <p style="margin:0;color:#111827;font-size:18px;font-weight:900;">${d.origin}</p>
                  <p style="margin:4px 0 0;color:#6b7280;font-size:13px;">${d.boardingStop}</p>
                </td>
                <td style="width:0;text-align:center;padding:0 8px;">
                  <span style="font-size:24px;color:#c01515;">→</span>
                </td>
                <td style="width:50%;padding-left:16px;text-align:right;">
                  <p style="margin:0 0 4px;color:#9ca3af;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;">Destino</p>
                  <p style="margin:0;color:#111827;font-size:18px;font-weight:900;">${d.destination}</p>
                </td>
              </tr>
            </table>

            <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px;background:#f9fafb;border-radius:12px;padding:16px;">
              <tr>
                <td style="padding:6px 16px;width:33%;">
                  <p style="margin:0;color:#9ca3af;font-size:11px;font-weight:600;text-transform:uppercase;">Fecha ida</p>
                  <p style="margin:4px 0 0;color:#111827;font-size:14px;font-weight:700;">${d.date}</p>
                </td>
                <td style="padding:6px 16px;width:33%;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;">
                  <p style="margin:0;color:#9ca3af;font-size:11px;font-weight:600;text-transform:uppercase;">Salida</p>
                  <p style="margin:4px 0 0;color:#c01515;font-size:14px;font-weight:900;">${d.departureTime}</p>
                </td>
                <td style="padding:6px 16px;width:33%;">
                  <p style="margin:0;color:#9ca3af;font-size:11px;font-weight:600;text-transform:uppercase;">Tipo</p>
                  <p style="margin:4px 0 0;color:#111827;font-size:14px;font-weight:700;">${d.tripType === 'round_trip' ? 'Ida y vuelta' : 'Solo ida'}</p>
                </td>
              </tr>
              ${d.tripType === 'round_trip' && d.returnDate ? `
              <tr>
                <td colspan="3" style="padding:0 16px 10px;">
                  <div style="margin-top:12px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:10px 14px;">
                    <p style="margin:0;color:#1e40af;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;">Regreso</p>
                    <p style="margin:4px 0 0;color:#1e3a8a;font-size:15px;font-weight:900;">${d.returnDate}</p>
                    <p style="margin:4px 0 0;color:#3b82f6;font-size:12px;font-weight:600;">⏰ Hora abierta — puedes abordar cualquier autobús disponible ese día</p>
                  </div>
                </td>
              </tr>` : ''}
            </table>
          </td>
        </tr>

        <!-- Passengers -->
        <tr>
          <td style="padding:0 40px 24px;">
            <p style="margin:0 0 12px;color:#111827;font-size:14px;font-weight:700;text-transform:uppercase;letter-spacing:1px;">Pasajeros</p>
            <table width="100%" cellpadding="0" cellspacing="0">
              ${passengers}
            </table>
          </td>
        </tr>

        <!-- Total -->
        <tr>
          <td style="padding:20px 40px;background:#0f2c5c;text-align:right;">
            <span style="color:rgba(255,255,255,0.6);font-size:13px;">${d.paymentMethod === 'cash' ? 'Total a pagar en ventanilla: ' : 'Total pagado: '}</span>
            <span style="color:#c8a951;font-size:22px;font-weight:900;">$${d.total} USD</span>
            ${d.paymentMethod === 'cash' ? `<br><span style="color:#f59e0b;font-size:12px;font-weight:700;">💵 Pago en efectivo — cobra en taquilla antes de abordar</span>` : ''}
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:24px 40px;text-align:center;border-top:1px solid #f0f0f0;">
            <p style="margin:0;color:#9ca3af;font-size:12px;">Tres Estrellas de Oro Inc. · Los Angeles ↔ Tijuana</p>
            <p style="margin:6px 0 0;color:#9ca3af;font-size:12px;">
              📞 1 800 337-8745 &nbsp;|&nbsp; (213) 624-5524 &nbsp;|&nbsp; (619) 428-5512 &nbsp;|&nbsp; (664) 208-8399
            </p>
            <p style="margin:6px 0 0;color:#d1d5db;font-size:11px;">tresestrellasdeoroinc.com</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}
