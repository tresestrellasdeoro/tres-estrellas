import { NextResponse, type NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/api-auth'
import mysql from 'mysql2/promise'

export async function GET(req: NextRequest) {
  const deny = await requireAdmin(req); if (deny) return deny

  const awsVars = {
    AWS_MYSQL_HOST:     process.env.AWS_MYSQL_HOST     ? `SET (${process.env.AWS_MYSQL_HOST})` : 'MISSING',
    AWS_MYSQL_PORT:     process.env.AWS_MYSQL_PORT     ? `SET (${process.env.AWS_MYSQL_PORT})` : 'MISSING',
    AWS_MYSQL_USER:     process.env.AWS_MYSQL_USER     ? `SET (${process.env.AWS_MYSQL_USER})` : 'MISSING',
    AWS_MYSQL_PASSWORD: process.env.AWS_MYSQL_PASSWORD ? 'SET' : 'MISSING',
    AWS_MYSQL_DATABASE: process.env.AWS_MYSQL_DATABASE ? `SET (${process.env.AWS_MYSQL_DATABASE})` : 'MISSING',
  }

  let connectionTest: string
  try {
    const conn = await mysql.createConnection({
      host:           process.env.AWS_MYSQL_HOST,
      port:           Number(process.env.AWS_MYSQL_PORT ?? 3306),
      user:           process.env.AWS_MYSQL_USER,
      password:       process.env.AWS_MYSQL_PASSWORD,
      database:       process.env.AWS_MYSQL_DATABASE,
      connectTimeout: 8000,
    })
    const [rows] = await conn.execute<mysql.RowDataPacket[]>(
      'SELECT bolId, nombreCliente FROM boletoventas ORDER BY bolId DESC LIMIT 1'
    )
    await conn.end()
    connectionTest = `OK — último boleto: ${rows[0]?.bolId} (${rows[0]?.nombreCliente})`
  } catch (err: any) {
    connectionTest = `ERROR: ${err.message}`
  }

  return NextResponse.json({ awsVars, connectionTest,
    SQUARE_ACCESS_TOKEN: process.env.SQUARE_ACCESS_TOKEN ? 'SET' : 'MISSING',
    RESEND_API_KEY:      process.env.RESEND_API_KEY      ? 'SET' : 'MISSING',
  })
}
