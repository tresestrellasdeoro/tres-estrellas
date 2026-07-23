import { NextResponse, type NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/api-auth'

// Temporary diagnostic endpoint — shows which env vars are visible to the server
export async function GET(req: NextRequest) {
  const deny = await requireAdmin(req); if (deny) return deny

  return NextResponse.json({
    SQUARE_ACCESS_TOKEN:          process.env.SQUARE_ACCESS_TOKEN ? `SET (${process.env.SQUARE_ACCESS_TOKEN.substring(0, 8)}...)` : 'MISSING',
    SQUARE_LOCATION_ID:           process.env.SQUARE_LOCATION_ID  ? `SET (${process.env.SQUARE_LOCATION_ID})` : 'MISSING',
    NEXT_PUBLIC_SQUARE_APP_ID:    process.env.NEXT_PUBLIC_SQUARE_APP_ID    ? `SET (${process.env.NEXT_PUBLIC_SQUARE_APP_ID.substring(0, 10)}...)` : 'MISSING',
    NEXT_PUBLIC_SQUARE_LOCATION_ID: process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID ? `SET (${process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID})` : 'MISSING',
    RESEND_API_KEY:               process.env.RESEND_API_KEY ? `SET (${process.env.RESEND_API_KEY.substring(0, 8)}...)` : 'MISSING',
    squareConfigured:             !!(process.env.SQUARE_ACCESS_TOKEN && process.env.SQUARE_LOCATION_ID),
  })
}
