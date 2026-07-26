import { createClient as createServiceClient } from '@supabase/supabase-js'

const QB_AUTH_URL  = 'https://appcenter.intuit.com/connect/oauth2'
const QB_TOKEN_URL = 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer'
const QB_API_BASE  = 'https://quickbooks.api.intuit.com/v3/company'
const SCOPE        = 'com.intuit.quickbooks.accounting'

function redirectUri() {
  return `${process.env.NEXT_PUBLIC_APP_URL}/api/admin/quickbooks/callback`
}

function service() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function basicAuth() {
  return Buffer.from(
    `${process.env.QUICKBOOKS_CLIENT_ID}:${process.env.QUICKBOOKS_CLIENT_SECRET}`
  ).toString('base64')
}

export function getAuthUrl(state: string) {
  const params = new URLSearchParams({
    client_id:     process.env.QUICKBOOKS_CLIENT_ID!,
    response_type: 'code',
    scope:         SCOPE,
    redirect_uri:  redirectUri(),
    state,
  })
  return `${QB_AUTH_URL}?${params}`
}

export async function exchangeCode(code: string, realmId: string) {
  const res = await fetch(QB_TOKEN_URL, {
    method:  'POST',
    headers: {
      Authorization:  `Basic ${basicAuth()}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type:   'authorization_code',
      code,
      redirect_uri: redirectUri(),
    }),
  })
  const data = await res.json()
  if (!data.access_token) throw new Error(`QB token exchange failed: ${JSON.stringify(data)}`)
  return {
    access_token:  data.access_token  as string,
    refresh_token: data.refresh_token as string,
    expires_in:    data.expires_in    as number,
    realm_id:      realmId,
  }
}

export async function getValidTokens() {
  const db = service()
  const { data } = await (db as any)
    .from('quickbooks_settings')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!data) return null

  const bufferMs  = 5 * 60 * 1000
  const expiresAt = new Date(data.expires_at).getTime()
  if (expiresAt - Date.now() > bufferMs) return data

  // Access token expired — refresh it
  const res = await fetch(QB_TOKEN_URL, {
    method:  'POST',
    headers: {
      Authorization:  `Basic ${basicAuth()}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type:    'refresh_token',
      refresh_token: data.refresh_token,
    }),
  })
  const refreshed = await res.json()
  if (!refreshed.access_token) return null

  const newExpiresAt = new Date(Date.now() + refreshed.expires_in * 1000).toISOString()
  await (db as any).from('quickbooks_settings').update({
    access_token:  refreshed.access_token,
    refresh_token: refreshed.refresh_token ?? data.refresh_token,
    expires_at:    newExpiresAt,
    updated_at:    new Date().toISOString(),
  }).eq('realm_id', data.realm_id)

  return { ...data, access_token: refreshed.access_token }
}

export async function isConnected() {
  const tokens = await getValidTokens()
  return !!tokens
}

export interface SalesReceiptParams {
  bookingNumber:      string
  originName:         string
  destinationName:    string
  totalAmount:        number
  passengerNames:     string[]
  date:               string
  paymentMethod:      'card' | 'cash'
  sucursalName?:      string | null
  sucursalCode?:      string | null
  // Sucursal QB account IDs (optional — falls back to generic if not set)
  qbCashAccountId?:   string | null
  qbItemId?:          string | null
}

export interface PurchaseParams {
  amount:            number
  category:          string
  description:       string
  date:              string
  paymentMethod:     'cash' | 'card'
  sucursalName?:     string | null
  sucursalCode?:     string | null
  docNumber?:        string
  paymentAccountId?: string | null
  expenseAccountId?: string | null
  vendor?:           string | null
  receiptNumber?:    string | null
}

// ── Vendor lookup / create ────────────────────────────────────────────────────

export async function findOrCreateVendor(name: string, tokens: { access_token: string; realm_id: string }): Promise<string | null> {
  try {
    const safe  = name.replace(/'/g, "\\'").slice(0, 100)
    const query = encodeURIComponent(`SELECT Id, DisplayName FROM Vendor WHERE DisplayName = '${safe}' MAXRESULTS 1`)
    const res   = await fetch(`${QB_API_BASE}/${tokens.realm_id}/query?query=${query}&minorversion=65`, {
      headers: { Authorization: `Bearer ${tokens.access_token}`, Accept: 'application/json' },
    })
    if (res.ok) {
      const d = await res.json()
      const existing = d?.QueryResponse?.Vendor?.[0]
      if (existing?.Id) return existing.Id
    }

    // Not found — create it
    const createRes = await fetch(`${QB_API_BASE}/${tokens.realm_id}/vendor?minorversion=65`, {
      method:  'POST',
      headers: { Authorization: `Bearer ${tokens.access_token}`, 'Content-Type': 'application/json', Accept: 'application/json' },
      body:    JSON.stringify({ DisplayName: name.slice(0, 100) }),
    })
    if (!createRes.ok) return null
    const created = await createRes.json()
    return created?.Vendor?.Id ?? null
  } catch {
    return null
  }
}

// ── Fetch expense accounts from QB ────────────────────────────────────────────

export async function fetchExpenseAccounts(): Promise<{ id: string; name: string; subType: string }[]> {
  const tokens = await getValidTokens()
  if (!tokens) return []
  const query = encodeURIComponent(`SELECT Id, Name, AccountSubType FROM Account WHERE AccountType = 'Expense' AND Active = true MAXRESULTS 200`)
  const res   = await fetch(`${QB_API_BASE}/${tokens.realm_id}/query?query=${query}&minorversion=65`, {
    headers: { Authorization: `Bearer ${tokens.access_token}`, Accept: 'application/json' },
  })
  if (!res.ok) return []
  const d = await res.json()
  return (d?.QueryResponse?.Account ?? []).map((a: any) => ({ id: a.Id, name: a.Name, subType: a.AccountSubType ?? '' }))
}

export async function createPurchase(params: PurchaseParams) {
  const tokens = await getValidTokens()
  if (!tokens) throw new Error('QuickBooks no está conectado')

  const paymentAccountId = params.paymentAccountId || process.env.QB_DEFAULT_CASH_ACCOUNT_ID
  const expenseAccountId = params.expenseAccountId || process.env.QB_DEFAULT_EXPENSE_ACCOUNT_ID

  if (!paymentAccountId || !expenseAccountId) {
    throw new Error('Configura QB_DEFAULT_CASH_ACCOUNT_ID y QB_DEFAULT_EXPENSE_ACCOUNT_ID en las variables de entorno')
  }

  const branchTag  = params.sucursalCode ? `[${params.sucursalCode}]` : ''
  const lineDesc   = [branchTag, params.category, params.description].filter(Boolean).join(' — ')

  const body: Record<string, unknown> = {
    PaymentType:  params.paymentMethod === 'card' ? 'CreditCard' : 'Cash',
    AccountRef:   { value: paymentAccountId },
    TxnDate:      params.date,
    DocNumber:    params.docNumber ?? undefined,
    PrivateNote:  [
      `Sucursal: ${params.sucursalName ?? 'Sin sucursal'}`,
      `Categoría: ${params.category}`,
      `Proveedor: ${params.vendor || '—'}`,
      `Descripción: ${params.description || '—'}`,
      `No. Recibo: ${params.receiptNumber || '—'}`,
      `Pago: ${params.paymentMethod === 'card' ? 'Tarjeta' : 'Efectivo'}`,
    ].join('\n'),
    Line: [{
      Amount:      params.amount,
      DetailType:  'AccountBasedExpenseLineDetail',
      Description: lineDesc,
      AccountBasedExpenseLineDetail: {
        AccountRef:    { value: expenseAccountId },
        BillableStatus: 'NotBillable',
      },
    }],
  }

  // Link to vendor in QB if provided
  if (params.vendor) {
    const vendorId = await findOrCreateVendor(params.vendor, tokens)
    if (vendorId) body.EntityRef = { value: vendorId, type: 'Vendor' }
  }

  const res = await fetch(`${QB_API_BASE}/${tokens.realm_id}/purchase`, {
    method:  'POST',
    headers: {
      Authorization:  `Bearer ${tokens.access_token}`,
      'Content-Type': 'application/json',
      Accept:         'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(JSON.stringify(err?.Fault?.Error ?? err))
  }

  return (await res.json()) as { Purchase: { Id: string; DocNumber: string } }
}

export async function logQBTransaction(params: {
  type:           'sales_receipt' | 'purchase'
  docNumber?:     string
  qbId?:          string
  amount:         number
  description?:   string
  referenceType?: 'cierre' | 'gasto' | 'booking_online'
  referenceId?:   string
  payload?:       Record<string, unknown>
}) {
  const db = service()
  await (db as any).from('qb_transactions').insert({
    type:           params.type,
    doc_number:     params.docNumber   ?? null,
    qb_id:          params.qbId        ?? null,
    amount:         params.amount,
    description:    params.description ?? null,
    reference_type: params.referenceType ?? null,
    reference_id:   params.referenceId   ?? null,
    payload:        params.payload       ?? {},
  })
}

export async function createSalesReceipt(params: SalesReceiptParams) {
  const tokens = await getValidTokens()
  if (!tokens) throw new Error('QuickBooks no está conectado')

  const branchTag  = params.sucursalCode ? `[${params.sucursalCode}]` : ''
  const branchName = params.sucursalName ?? 'Sin sucursal'

  const description = [
    branchTag,
    `${params.originName} → ${params.destinationName}`,
    params.passengerNames.join(', '),
    params.date,
  ].filter(Boolean).join(' — ')

  const itemRef = params.qbItemId
    ? { value: params.qbItemId }
    : { value: '1', name: 'Services' }

  const body: Record<string, unknown> = {
    DocNumber:   params.bookingNumber,
    TxnDate:     params.date,
    Line: [{
      Amount:      params.totalAmount,
      DetailType:  'SalesItemLineDetail',
      Description: description,
      SalesItemLineDetail: {
        ItemRef:   itemRef,
        Qty:       1,
        UnitPrice: params.totalAmount,
      },
    }],
    PrivateNote: [
      `Sucursal: ${branchName}`,
      `Boleto: ${params.bookingNumber}`,
      `Pago: ${params.paymentMethod === 'card' ? 'Tarjeta' : 'Efectivo'}`,
    ].join('\n'),
  }

  // Cash payments deposit to the branch cash account; card goes to Undeposited Funds
  if (params.paymentMethod === 'cash' && params.qbCashAccountId) {
    body.DepositToAccountRef = { value: params.qbCashAccountId }
  }

  const res = await fetch(`${QB_API_BASE}/${tokens.realm_id}/salesreceipt`, {
    method:  'POST',
    headers: {
      Authorization:  `Bearer ${tokens.access_token}`,
      'Content-Type': 'application/json',
      Accept:         'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(JSON.stringify(err?.Fault?.Error ?? err))
  }

  return (await res.json()) as { SalesReceipt: { Id: string; DocNumber: string } }
}
