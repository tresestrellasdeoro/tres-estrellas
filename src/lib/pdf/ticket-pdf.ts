import jsPDF from 'jspdf'

interface TicketPdfData {
  bookingNumber: string
  passengerNames: string[]
  selectedSeats: Record<number, string>
  origin: string
  destination: string
  boardingStop: string
  boardingTime: string
  date: string
  departureTime: string
  tripType: string
  total: number
  paymentMethod: string
  email: string
}

export async function generateTicketPdf(d: TicketPdfData) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })
  const W = 210
  const margin = 20

  // ── Paleta ──
  const navy  = [10,  30,  66]  as [number,number,number]
  const red   = [192, 21,  21]  as [number,number,number]
  const gold  = [200, 169, 81]  as [number,number,number]
  const white = [255, 255, 255] as [number,number,number]
  const light = [248, 249, 250] as [number,number,number]
  const gray  = [100, 116, 139] as [number,number,number]

  let y = 0

  // ── Header navy ──
  doc.setFillColor(...navy)
  doc.rect(0, 0, W, 52, 'F')

  // Franja roja
  doc.setFillColor(...red)
  doc.rect(0, 0, W, 3, 'F')

  // Logo text
  doc.setTextColor(...gold)
  doc.setFontSize(22)
  doc.setFont('helvetica', 'bold')
  doc.text('★ ★ ★  TEO', W / 2, 20, { align: 'center' })

  doc.setTextColor(...white)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.text('Tres Estrellas de Oro Inc.', W / 2, 28, { align: 'center' })

  doc.setFontSize(9)
  doc.setTextColor(200, 200, 200)
  doc.text('Los Angeles  ↔  Tijuana', W / 2, 35, { align: 'center' })

  y = 55

  // ── Número de reservación ──
  doc.setFillColor(...red)
  doc.roundedRect(margin, y, W - margin * 2, 18, 3, 3, 'F')
  doc.setTextColor(...white)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.text('NÚMERO DE RESERVACIÓN', W / 2, y + 6, { align: 'center' })
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text(d.bookingNumber, W / 2, y + 14, { align: 'center' })
  y += 26

  // ── Sección viaje ──
  doc.setFillColor(...light)
  doc.roundedRect(margin, y, W - margin * 2, 38, 3, 3, 'F')

  // Origen → Destino
  doc.setTextColor(...navy)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text(d.origin, margin + 6, y + 12)
  doc.text(d.destination, W - margin - 6, y + 12, { align: 'right' })

  doc.setFontSize(18)
  doc.setTextColor(...red)
  doc.text('→', W / 2, y + 13, { align: 'center' })

  doc.setFontSize(8)
  doc.setTextColor(...gray)
  doc.setFont('helvetica', 'normal')
  doc.text('Origen', margin + 6, y + 18)
  doc.text('Destino', W - margin - 6, y + 18, { align: 'right' })

  // Abordaje
  doc.setFontSize(9)
  doc.setTextColor(...navy)
  doc.setFont('helvetica', 'bold')
  doc.text(`Abordaje: ${d.boardingStop}  ·  ${d.boardingTime}`, W / 2, y + 26, { align: 'center' })

  // Info pills
  const infoY = y + 33
  const pillW = (W - margin * 2 - 12) / 3
  ;[
    { label: 'FECHA',  val: d.date },
    { label: 'SALIDA', val: d.departureTime },
    { label: 'TIPO',   val: d.tripType === 'round_trip' ? 'Ida y vuelta' : 'Solo ida' },
  ].forEach((item, i) => {
    const x = margin + i * (pillW + 6)
    doc.setFillColor(225, 230, 240)
    doc.roundedRect(x, infoY - 4, pillW, 10, 2, 2, 'F')
    doc.setFontSize(7)
    doc.setTextColor(...gray)
    doc.setFont('helvetica', 'normal')
    doc.text(item.label, x + pillW / 2, infoY, { align: 'center' })
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...navy)
    doc.text(item.val, x + pillW / 2, infoY + 4, { align: 'center' })
  })

  y += 46

  // ── Pasajeros ──
  doc.setTextColor(...navy)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('PASAJEROS', margin, y + 5)
  doc.setFillColor(...red)
  doc.rect(margin, y + 7, 30, 0.5, 'F')
  y += 12

  d.passengerNames.forEach((name, i) => {
    const seat = d.selectedSeats[i]
    doc.setFillColor(i % 2 === 0 ? 248 : 255, i % 2 === 0 ? 249 : 255, i % 2 === 0 ? 250 : 255)
    doc.rect(margin, y, W - margin * 2, 9, 'F')
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...navy)
    doc.text(`${i + 1}.  ${name}`, margin + 4, y + 6)
    if (seat) {
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(...red)
      doc.text(`Asiento ${seat}`, W - margin - 4, y + 6, { align: 'right' })
    }
    y += 10
  })
  y += 4

  // ── Línea punteada ──
  doc.setDrawColor(200, 200, 200)
  doc.setLineDashPattern([2, 2], 0)
  doc.line(margin, y, W - margin, y)
  doc.setLineDashPattern([], 0)
  y += 8

  // ── Total y pago ──
  doc.setFillColor(...navy)
  doc.roundedRect(margin, y, W - margin * 2, 20, 3, 3, 'F')
  doc.setTextColor(180, 180, 200)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text('Total:', margin + 6, y + 8)
  doc.text('Pago:', margin + 6, y + 15)
  doc.setTextColor(...gold)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text(`$${d.total} USD`, W - margin - 6, y + 10, { align: 'right' })
  doc.setFontSize(9)
  doc.setTextColor(180, 220, 180)
  doc.text(d.paymentMethod === 'cash' ? 'Efectivo en ventanilla' : 'Tarjeta', W - margin - 6, y + 16, { align: 'right' })
  y += 28

  // ── Correo ──
  doc.setFontSize(8)
  doc.setTextColor(...gray)
  doc.setFont('helvetica', 'normal')
  doc.text(`Boleto enviado a: ${d.email}`, W / 2, y, { align: 'center' })
  y += 10

  // ── Instrucciones ──
  doc.setFillColor(255, 247, 230)
  doc.roundedRect(margin, y, W - margin * 2, 18, 2, 2, 'F')
  doc.setFontSize(8)
  doc.setTextColor(180, 100, 0)
  doc.setFont('helvetica', 'bold')
  doc.text('INSTRUCCIONES DE ABORDAJE', W / 2, y + 6, { align: 'center' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.text('Presenta este boleto (digital o impreso) al subir al autobús. Llega 15 minutos antes de la salida.', W / 2, y + 12, { align: 'center' })
  if (d.paymentMethod === 'cash') {
    doc.text('PAGO EN EFECTIVO: Paga en ventanilla antes de abordar.', W / 2, y + 17, { align: 'center' })
  }
  y += 26

  // ── Footer ──
  doc.setFillColor(...navy)
  doc.rect(0, 280, W, 17, 'F')
  doc.setFillColor(...red)
  doc.rect(0, 294, W, 3, 'F')
  doc.setTextColor(150, 160, 180)
  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'normal')
  doc.text('(213) 275-1402  ·  (323) 588-9188  ·  (619) 428-5512  ·  (664) 208-8399', W / 2, 287, { align: 'center' })
  doc.text('tresestrellasdeoroinc.com', W / 2, 292, { align: 'center' })

  doc.save(`boleto-${d.bookingNumber}.pdf`)
}
