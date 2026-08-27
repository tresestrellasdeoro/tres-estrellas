import mysql from 'mysql2/promise'
import { createClient } from '@supabase/supabase-js'

const BATCH_SIZE = 200

function svc() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function getPool(): mysql.Pool {
  return mysql.createPool({
    host:               process.env.AWS_MYSQL_HOST,
    port:               Number(process.env.AWS_MYSQL_PORT ?? 3306),
    user:               process.env.AWS_MYSQL_USER,
    password:           process.env.AWS_MYSQL_PASSWORD,
    database:           process.env.AWS_MYSQL_DATABASE,
    waitForConnections: true,
    connectionLimit:    3,
    connectTimeout:     8000,
  })
}

export interface SyncResult {
  synced:      number
  lastBolId:   number
  totalSynced: number
  done:        boolean  // true = no more records to pull
  error?:      string
}

export async function runLegacySync(): Promise<SyncResult> {
  const db  = svc()

  // Get current sync state
  const { data: state } = await db
    .from('legacy_sync_state')
    .select('last_bol_id, total_synced')
    .eq('id', 'boletos')
    .single() as { data: { last_bol_id: number; total_synced: number } | null }

  const lastBolId    = state?.last_bol_id    ?? 0
  const prevTotal    = state?.total_synced   ?? 0

  const pool = getPool()
  try {
    // Fetch batch from MySQL — one row per ticket (first detail row via MIN)
    const [rows] = await pool.execute<mysql.RowDataPacket[]>(
      `SELECT bv.bolId, bv.bolVenta, bv.nombreCliente, bv.contacto, bv.bolCosto,
              bv.tipoCliente, bv.bolUsuario, bv.terminalVenta,
              bv.fechaVenta, bv.horaVenta, bv.esCancelado,
              bd.bolDetFecha, bd.bolDetHora, bd.bolDetOrigen, bd.bolDetDestino,
              bd.bolDetAsiento, bd.tipoViaje,
              o.orinombre AS origen_nombre, o.clave AS origen_clave,
              d.orinombre AS destino_nombre, d.clave AS destino_clave
       FROM boletoventas bv
       LEFT JOIN boletodetalles bd
         ON bd.bolDetID = (SELECT MIN(x.bolDetID) FROM boletodetalles x WHERE x.bolVenta = bv.bolVenta)
       LEFT JOIN origen o ON o.oriid = bd.bolDetOrigen
       LEFT JOIN origen d ON d.oriid = bd.bolDetDestino
       WHERE bv.bolId > ?
       ORDER BY bv.bolId ASC
       LIMIT ?`,
      [lastBolId, BATCH_SIZE]
    )

    if (!rows.length) {
      await db.from('legacy_sync_state').update({ last_synced_at: new Date().toISOString(), last_error: null }).eq('id', 'boletos')
      return { synced: 0, lastBolId, totalSynced: prevTotal, done: true }
    }

    const records = rows.map(r => ({
      bol_id:         Number(r.bolId),
      bol_venta:      r.bolVenta   ? Number(r.bolVenta)   : null,
      nombre_cliente: String(r.nombreCliente ?? '').trim(),
      contacto:       r.contacto   ? String(r.contacto)   : null,
      bol_costo:      r.bolCosto   ? Number(r.bolCosto)   : null,
      tipo_cliente:   r.tipoCliente ? Number(r.tipoCliente) : 1,
      bol_usuario:    r.bolUsuario  ? String(r.bolUsuario)  : null,
      terminal_venta: r.terminalVenta ? Number(r.terminalVenta) : null,
      fecha_venta:    r.fechaVenta  ? String(r.fechaVenta).split('T')[0]  : null,
      hora_venta:     r.horaVenta   ? String(r.horaVenta)   : null,
      es_cancelado:   Number(r.esCancelado ?? 0) !== 0,
      det_fecha:      r.bolDetFecha ? String(r.bolDetFecha).split('T')[0] : null,
      det_hora:       r.bolDetHora  ? String(r.bolDetHora)  : null,
      det_origen:     r.bolDetOrigen  ? Number(r.bolDetOrigen)  : null,
      det_destino:    r.bolDetDestino ? Number(r.bolDetDestino) : null,
      det_asiento:    r.bolDetAsiento ? Number(r.bolDetAsiento) : null,
      tipo_viaje:     r.tipoViaje    ? Number(r.tipoViaje)    : 1,
      origen_nombre:  r.origen_nombre ? String(r.origen_nombre) : null,
      origen_clave:   r.origen_clave  ? String(r.origen_clave)  : null,
      destino_nombre: r.destino_nombre ? String(r.destino_nombre) : null,
      destino_clave:  r.destino_clave  ? String(r.destino_clave)  : null,
      synced_at:      new Date().toISOString(),
    }))

    const { error: upsertErr } = await db
      .from('legacy_boletos_mirror')
      .upsert(records, { onConflict: 'bol_id' })

    if (upsertErr) throw new Error(upsertErr.message)

    const newLastId    = records[records.length - 1].bol_id
    const newTotal     = prevTotal + records.length
    const done         = records.length < BATCH_SIZE

    await db.from('legacy_sync_state').update({
      last_bol_id:    newLastId,
      total_synced:   newTotal,
      last_synced_at: new Date().toISOString(),
      last_error:     null,
    }).eq('id', 'boletos')

    return { synced: records.length, lastBolId: newLastId, totalSynced: newTotal, done }

  } catch (err: any) {
    await db.from('legacy_sync_state').update({ last_error: err.message }).eq('id', 'boletos')
    return { synced: 0, lastBolId, totalSynced: prevTotal, done: false, error: err.message }
  } finally {
    await pool.end()
  }
}
