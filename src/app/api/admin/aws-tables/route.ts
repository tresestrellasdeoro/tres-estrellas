import { NextResponse, type NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/api-auth'
import { getAwsTableColumns } from '@/lib/aws-db'

export async function GET(req: NextRequest) {
  const deny = await requireAdmin(req); if (deny) return deny
  const columns = await getAwsTableColumns()
  return NextResponse.json({ columns })
}
