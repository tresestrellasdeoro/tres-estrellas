import { NextResponse, type NextRequest } from 'next/server'
import { requireStaff } from '@/lib/api-auth'
import { findAwsPaquete, getAwsPaquetes } from '@/lib/aws-db'

export async function GET(req: NextRequest) {
  const deny = await requireStaff(req); if (deny) return deny

  const codigo = req.nextUrl.searchParams.get('codigo')
  if (codigo) {
    const paquete = await findAwsPaquete(codigo)
    if (!paquete) return NextResponse.json({ error: 'Paquete no encontrado' }, { status: 404 })
    return NextResponse.json(paquete)
  }

  const limit  = Math.min(Number(req.nextUrl.searchParams.get('limit') ?? 50), 200)
  const offset = Number(req.nextUrl.searchParams.get('offset') ?? 0)
  const status = req.nextUrl.searchParams.get('status')

  const paquetes = await getAwsPaquetes({
    limit, offset,
    status: status !== null ? Number(status) : undefined,
  })
  return NextResponse.json({ paquetes, total: paquetes.length })
}
