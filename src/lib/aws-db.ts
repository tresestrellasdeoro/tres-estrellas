import mysql from 'mysql2/promise'

let pool: mysql.Pool | null = null

function getPool(): mysql.Pool {
  if (!pool) {
    pool = mysql.createPool({
      host:               process.env.AWS_MYSQL_HOST,
      port:               Number(process.env.AWS_MYSQL_PORT ?? 3306),
      user:               process.env.AWS_MYSQL_USER,
      password:           process.env.AWS_MYSQL_PASSWORD,
      database:           process.env.AWS_MYSQL_DATABASE,
      waitForConnections: true,
      connectionLimit:    5,
      connectTimeout:     8000,
    })
  }
  return pool
}

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface AwsLuggage {
  exc_id:         number
  numero_maletas: number
  peso_total:     number
  bicicletas:     number
  electronicos:   number
  costo_exceso:   number
  fecha_exceso:   string | null
}

export interface AwsTicket {
  ticket_id:        string
  booking_number:   string
  folio:            string | null
  passenger_name:   string
  passenger_type:   string
  phone:            string | null
  origin_code:      string
  origin_name:      string | null
  destination_code: string
  destination_name: string | null
  ticket_type:      string
  travel_date:      string
  travel_time:      string | null
  amount:           number
  payment_method:   string
  sold_by:          string | null
  cancelled:        boolean
  seat:             number | null
  sale_date:        string | null
  luggage:          AwsLuggage[]
}

export interface AwsSale {
  id:             number
  venta_id:       number
  passenger_name: string
  origin_id:      number
  destination_id: number
  ticket_type:    number
  amount:         number
  sale_date:      string | null
  sale_time:      string | null
  cancelled:      boolean
  terminal_id:    number | null
}

export interface AwsPaquete {
  id:           number
  codigo:       string
  tipo:         number
  precio:       number
  peso:         number
  status:       number
}

// ─── Boletos (tickets) — production table: boletoventas + boletodetalles ──────

export async function findAwsTicket(booking: string): Promise<AwsTicket | null> {
  const proxyBase = process.env.AWS_PROXY_URL ?? 'http://54.212.85.161/api/boleto.php'
  const proxyKey  = process.env.AWS_PROXY_KEY  ?? 'teo2026'

  const normalized = booking.startsWith('TEO') ? booking.slice(3) : booking
  const bolId = Number(normalized)
  if (!bolId) return null

  try {
    const res = await fetch(`${proxyBase}?bolId=${bolId}&key=${proxyKey}`, {
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) return null
    const r = await res.json() as Record<string, string | null>

    const luggage: AwsLuggage[] = ((r.luggage as unknown as Record<string, string>[]) ?? []).map(l => ({
      exc_id:         Number(l.exc_id),
      numero_maletas: Number(l.numero_maletas ?? 0),
      peso_total:     Number(l.peso_total ?? 0),
      bicicletas:     Number(l.bicicletas ?? 0),
      electronicos:   Number(l.electronicos ?? 0),
      costo_exceso:   Number(l.costo_exceso ?? 0),
      fecha_exceso:   l.fecha_exceso ?? null,
    }))

    const clienteType = Number(r.tipoCliente ?? 1)
    const passengerType = clienteType === 2 ? 'senior' : clienteType === 3 ? 'child' : 'adult'
    const tripType = Number(r.tipoViaje ?? 1) === 2 ? 'round_trip' : 'one_way'

    return {
      ticket_id:        String(r.bolId),
      booking_number:   String(r.bolId),
      folio:            r.bolVenta ? String(r.bolVenta) : null,
      passenger_name:   String(r.nombreCliente ?? '').trim(),
      passenger_type:   passengerType,
      phone:            r.contacto ? String(r.contacto) : null,
      origin_code:      String(r.origen_clave ?? ''),
      origin_name:      r.origen_nombre ? String(r.origen_nombre) : null,
      destination_code: String(r.destino_clave ?? ''),
      destination_name: r.destino_nombre ? String(r.destino_nombre) : null,
      ticket_type:      tripType,
      travel_date:      r.bolDetFecha ? String(r.bolDetFecha).split('T')[0] : '',
      travel_time:      r.bolDetHora ?? null,
      amount:           Number(r.bolCosto ?? 0),
      payment_method:   'cash',
      sold_by:          r.bolUsuario ?? null,
      cancelled:        Number(r.esCancelado ?? 0) !== 0,
      seat:             r.bolDetAsiento ? Number(r.bolDetAsiento) : null,
      sale_date:        r.fechaVenta ? String(r.fechaVenta).split('T')[0] : null,
      luggage,
    }
  } catch (err) {
    console.error('[AWS Proxy] findAwsTicket error:', err)
    return null
  }
}

// ─── Ventas (boletoventa) ─────────────────────────────────────────────────────

export async function getAwsSales(opts: {
  limit?: number
  offset?: number
  from?: string   // YYYY-MM-DD
  to?: string
}): Promise<AwsSale[]> {
  if (!process.env.AWS_MYSQL_HOST) return []
  const { limit = 50, offset = 0, from, to } = opts
  try {
    const db = getPool()
    const conditions: string[] = []
    const params: (string | number)[] = []
    if (from) { conditions.push('fechaVenta >= ?'); params.push(from) }
    if (to)   { conditions.push('fechaVenta <= ?'); params.push(to) }
    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : ''
    params.push(limit, offset)

    const [rows] = await db.execute<mysql.RowDataPacket[]>(
      `SELECT bv.bolId, bv.bolVenta, bv.nombreCliente, bv.bolCosto,
              bv.fechaVenta, bv.horaVenta, bv.esCancelado, bv.terminalVenta,
              bv.tipoCliente, bv.contacto,
              o.orinombre as origen_nombre, d.desnombre as destino_nombre
       FROM boletoventas bv
       LEFT JOIN boletodetalles bd ON bd.bolVenta = bv.bolVenta
       LEFT JOIN origen o ON o.oriid = bd.bolDetOrigen
       LEFT JOIN destino d ON d.desid = bd.bolDetDestino
       ${where}
       GROUP BY bv.bolId
       ORDER BY bv.bolId DESC
       LIMIT ? OFFSET ?`,
      params
    )
    return rows.map(r => ({
      id:             Number(r.bolId),
      venta_id:       Number(r.bolVenta),
      passenger_name: String(r.nombreCliente ?? '').trim(),
      origin_id:      0,
      destination_id: 0,
      ticket_type:    Number(r.tipoCliente ?? 1),
      amount:         Number(r.bolCosto ?? 0),
      sale_date:      r.fechaVenta ? String(r.fechaVenta).split('T')[0] : null,
      sale_time:      r.horaVenta ? String(r.horaVenta) : null,
      cancelled:      Number(r.esCancelado ?? 0) !== 0,
      terminal_id:    r.terminalVenta ? Number(r.terminalVenta) : null,
    }))
  } catch (err) {
    console.error('[AWS MySQL] getAwsSales error:', err)
    return []
  }
}

// ─── Paquetes ─────────────────────────────────────────────────────────────────

export async function findAwsPaquete(codigo: string): Promise<AwsPaquete | null> {
  if (!process.env.AWS_MYSQL_HOST) return null
  try {
    const db = getPool()
    const [rows] = await db.execute<mysql.RowDataPacket[]>(
      `SELECT id_paquete, codigo, id_tipopaquete, precio, peso, calculo, status
       FROM paquetes
       WHERE codigo = ?
       LIMIT 1`,
      [codigo]
    )
    if (!rows.length) return null
    const r = rows[0]
    return {
      id:     Number(r.id_paquete),
      codigo: String(r.codigo),
      tipo:   Number(r.id_tipopaquete ?? 0),
      precio: Number(r.precio ?? 0),
      peso:   Number(r.peso ?? 0),
      status: Number(r.status ?? 0),
    }
  } catch (err) {
    console.error('[AWS MySQL] findAwsPaquete error:', err)
    return null
  }
}

export async function getAwsPaquetes(opts: { limit?: number; offset?: number; status?: number } = {}): Promise<AwsPaquete[]> {
  if (!process.env.AWS_MYSQL_HOST) return []
  const { limit = 50, offset = 0, status } = opts
  try {
    const db = getPool()
    const params: (string | number)[] = []
    const where = status !== undefined ? 'WHERE status = ?' : ''
    if (status !== undefined) params.push(status)
    params.push(limit, offset)

    const [rows] = await db.execute<mysql.RowDataPacket[]>(
      `SELECT id_paquete, codigo, id_tipopaquete, precio, peso, calculo, status
       FROM paquetes ${where}
       ORDER BY id_paquete DESC
       LIMIT ? OFFSET ?`,
      params
    )
    return rows.map(r => ({
      id:     Number(r.id_paquete),
      codigo: String(r.codigo),
      tipo:   Number(r.id_tipopaquete ?? 0),
      precio: Number(r.precio ?? 0),
      peso:   Number(r.peso ?? 0),
      status: Number(r.status ?? 0),
    }))
  } catch (err) {
    console.error('[AWS MySQL] getAwsPaquetes error:', err)
    return []
  }
}

// ─── Schema inspector (admin) ─────────────────────────────────────────────────

export async function getAwsTableColumns(): Promise<string[]> {
  try {
    const db = getPool()
    const [rows] = await db.execute<mysql.RowDataPacket[]>(
      `SELECT TABLE_NAME, COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
       ORDER BY TABLE_NAME, ORDINAL_POSITION`
    )
    return rows.map(r => `${r.TABLE_NAME}.${r.COLUMN_NAME}`)
  } catch {
    return []
  }
}
