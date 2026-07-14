import { NextResponse, type NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/api-auth'
import { getValidTokens } from '@/lib/quickbooks/client'

const QB_API = 'https://quickbooks.api.intuit.com/v3/company'

export async function GET(req: NextRequest) {
  const deny = await requireAdmin(req); if (deny) return deny

  const tokens = await getValidTokens()
  if (!tokens) return NextResponse.json({ error: 'QuickBooks no conectado' }, { status: 503 })

  const headers = {
    Authorization:  `Bearer ${tokens.access_token}`,
    Accept:         'application/json',
  }

  // Fetch accounts and items in parallel
  const [acctRes, itemRes] = await Promise.all([
    fetch(`${QB_API}/${tokens.realm_id}/query?query=SELECT%20Id%2CName%2CAccountType%2CAccountSubType%20FROM%20Account%20WHERE%20AccountType%20%3D%20'Bank'%20MAXRESULTS%20200&minorversion=65`, { headers }),
    fetch(`${QB_API}/${tokens.realm_id}/query?query=SELECT%20Id%2CName%2CType%20FROM%20Item%20WHERE%20Active%20%3D%20true%20MAXRESULTS%20200&minorversion=65`, { headers }),
  ])

  const acctData = await acctRes.json()
  const itemData = await itemRes.json()

  const accounts = (acctData?.QueryResponse?.Account ?? []).map((a: any) => ({
    id:   a.Id,
    name: a.Name,
    type: a.AccountSubType,
  }))

  const items = (itemData?.QueryResponse?.Item ?? []).map((i: any) => ({
    id:   i.Id,
    name: i.Name,
    type: i.Type,
  }))

  return NextResponse.json({ accounts, items })
}
