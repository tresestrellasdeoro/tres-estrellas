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

export interface AwsTicket {
  ticket_id:        string
  booking_number:   string
  passenger_name:   string
  passenger_type:   string
  origin_code:      string
  destination_code: string
  ticket_type:      string
  travel_date:      string
  travel_time:      string | null
  amount:           number
  payment_method:   string
  sold_by:          string | null
  cancelled:        boolean
}

export async function findAwsTicket(booking: string): Promise<AwsTicket | null> {
  if (!process.env.AWS_MYSQL_HOST) return null

  // bolcodigo may be stored as plain number or with TEO prefix
  const normalized = booking.startsWith('TEO') ? booking.slice(3) : booking

  try {
    const db = getPool()
    const [rows] = await db.execute<mysql.RowDataPacket[]>(
      `SELECT
         bolid, bolcodigo, codBolImp, cod_antiguo,
         bolclinombre, bolorigen, boldestino, boltipo,
         bolfecha1, hrsal, bolcosto, usuario,
         cancelado, bolCheckin
       FROM boletos
       WHERE bolcodigo = ? OR bolcodigo = ?
          OR codBolImp = ? OR codBolImp = ?
          OR cod_antiguo = ? OR bolid = ?
       LIMIT 1`,
      [booking, normalized, booking, normalized, normalized, normalized]
    )
    if (!rows.length) return null
    const r = rows[0]
    return {
      ticket_id:        String(r.bolid),
      booking_number:   String(r.codBolImp ?? r.bolcodigo ?? r.bolid),
      passenger_name:   String(r.bolclinombre ?? ''),
      passenger_type:   'adult',
      origin_code:      String(r.bolorigen ?? ''),
      destination_code: String(r.boldestino ?? ''),
      ticket_type:      String(r.boltipo ?? 'one_way'),
      travel_date:      r.bolfecha1 ? String(r.bolfecha1).split('T')[0] : '',
      travel_time:      r.hrsal ? String(r.hrsal) : null,
      amount:           Number(r.bolcosto ?? 0),
      payment_method:   'cash',
      sold_by:          r.usuario ? String(r.usuario) : null,
      cancelled:        Number(r.cancelado ?? 0) !== 0,
    }
  } catch (err) {
    console.error('[AWS MySQL] Error:', err)
    return null
  }
}

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
