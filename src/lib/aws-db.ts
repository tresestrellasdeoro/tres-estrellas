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

  const normalized = booking.startsWith('TEO') ? booking.slice(3) : booking

  try {
    const db = getPool()
    // Query the table — adjust column names if needed after first test
    const [rows] = await db.execute<mysql.RowDataPacket[]>(
      `SELECT
         ticket_id, booking_number, passenger_name, passenger_type,
         origin_code, destination_code, ticket_type,
         travel_date, travel_time, amount,
         payment_method, sold_by, cancelled
       FROM tickets
       WHERE booking_number = ? OR ticket_id = ?
       LIMIT 1`,
      [booking, normalized]
    )
    if (!rows.length) return null
    const r = rows[0]
    return {
      ticket_id:        String(r.ticket_id),
      booking_number:   String(r.booking_number),
      passenger_name:   String(r.passenger_name),
      passenger_type:   String(r.passenger_type ?? 'adult'),
      origin_code:      String(r.origin_code),
      destination_code: String(r.destination_code),
      ticket_type:      String(r.ticket_type ?? 'one_way'),
      travel_date:      String(r.travel_date ?? ''),
      travel_time:      r.travel_time ? String(r.travel_time) : null,
      amount:           Number(r.amount ?? 0),
      payment_method:   String(r.payment_method ?? 'cash'),
      sold_by:          r.sold_by ? String(r.sold_by) : null,
      cancelled:        Boolean(r.cancelled),
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
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
       ORDER BY TABLE_NAME, ORDINAL_POSITION`
    )
    return rows.map(r => `${r.TABLE_NAME}.${r.COLUMN_NAME}`)
  } catch {
    return []
  }
}
