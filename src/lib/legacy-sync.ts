import mysql from 'mysql2/promise'
import { createClient } from '@supabase/supabase-js'

const BATCH_SIZE = 100

function toDateStr(val: unknown): string | null {
  if (!val) return null
  try {
    if (val instanceof Date) {
      if (isNaN(val.getTime())) return null
      return val.toISOString().split('T')[0]
    }
    const s = String(val)
    if (s.startsWith('1901') || s.startsWith('0000') || s === '') return null
    const d = new Date(s)
    if (isNaN(d.getTime())) return null
    return d.toISOString().split('T')[0]
  } catch { return null }
}

function toTimeStr(val: unknown): string | null {
  if (!val) return null
  try {
    if (val instanceof Date) {
      if (isNaN(val.getTime())) return null
      const h = val.getUTCHours().toString().padStart(2, '0')
      const m = val.getUTCMinutes().toString().padStart(2, '0')
      return `${h}:${m}`
    }
    const s = String(val)
    return s.length >= 5 ? s.substring(0, 5) : null
  } catch { return null }
}

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
  lastId:      number
  totalSynced: number
  done:        boolean
  error?:      string
}

export async function runLegacySync(): Promise<SyncResult> {
  const db = svc()
  const { data: state } = await db
    .from('legacy_sync_state')
    .select('last_bol_id, total_synced')
    .eq('id', 'boletos')
    .single() as { data: { last_bol_id: number; total_synced: number } | null }

  const lastId    = state?.last_bol_id  ?? 0
  const prevTotal = state?.total_synced ?? 0
  const pool = getPool()

  try {
    // Query 1: get boletoventas batch (simple, no JOINs — fast even on 700k rows)
    const [ventas] = await pool.execute<mysql.RowDataPacket[]>(
      `SELECT bolId, bolVenta, nombreCliente, contacto, bolCosto,
              tipoCliente, bolUsuario, terminalVenta,
              fechaVenta, horaVenta, esCancelado
       FROM boletoventas
       WHERE bolId > ?
       ORDER BY bolId ASC
       LIMIT ?`,
      [lastId, BATCH_SIZE]
    )

    if (!ventas.length) {
      await db.from('legacy_sync_state').update({ last_synced_at: new Date().toISOString(), last_error: null }).eq('id', 'boletos')
      return { synced: 0, lastId, totalSynced: prevTotal, done: true }
    }

    // Query 2: get first detail row for each venta (by bolVenta ID list)
    const ventaIds = ventas.map(v => Number(v.bolVenta)).filter(Boolean)
    const detMap = new Map<number, mysql.RowDataPacket>()
    if (ventaIds.length) {
      const placeholders = ventaIds.map(() => '?').join(',')
      const [dets] = await pool.execute<mysql.RowDataPacket[]>(
        `SELECT bd.bolVenta, bd.bolDetFecha, bd.bolDetHora,
                bd.bolDetOrigen, bd.bolDetDestino, bd.bolDetAsiento, bd.tipoViaje,
                o.orinombre AS origen_nombre, o.clave AS origen_clave,
                d.orinombre AS destino_nombre, d.clave AS destino_clave
         FROM boletodetalles bd
         LEFT JOIN origen o ON o.oriid = bd.bolDetOrigen
         LEFT JOIN origen d ON d.oriid = bd.bolDetDestino
         WHERE bd.bolVenta IN (${placeholders})
         GROUP BY bd.bolVenta`,
        ventaIds
      )
      for (const det of dets) detMap.set(Number(det.bolVenta), det)
    }

    const records = ventas.map(r => {
      const det = detMap.get(Number(r.bolVenta))
      return {
        bol_id:         Number(r.bolId),
        bol_venta:      r.bolVenta      ? Number(r.bolVenta)                  : null,
        nombre_cliente: String(r.nombreCliente ?? '').trim(),
        contacto:       r.contacto      ? String(r.contacto)                  : null,
        bol_costo:      r.bolCosto      ? Number(r.bolCosto)                  : null,
        tipo_cliente:   r.tipoCliente   ? Number(r.tipoCliente)               : 1,
        bol_usuario:    r.bolUsuario    ? String(r.bolUsuario)                : null,
        terminal_venta: r.terminalVenta ? Number(r.terminalVenta)             : null,
        fecha_venta:    toDateStr(r.fechaVenta),
        hora_venta:     toTimeStr(r.horaVenta),
        es_cancelado:   Number(r.esCancelado ?? 0) !== 0,
        det_fecha:      toDateStr(det?.bolDetFecha),
        det_hora:       toTimeStr(det?.bolDetHora),
        det_origen:     det?.bolDetOrigen  ? Number(det.bolDetOrigen)              : null,
        det_destino:    det?.bolDetDestino ? Number(det.bolDetDestino)             : null,
        det_asiento:    det?.bolDetAsiento ? Number(det.bolDetAsiento)             : null,
        tipo_viaje:     det?.tipoViaje     ? Number(det.tipoViaje)                 : 1,
        origen_nombre:  det?.origen_nombre ? String(det.origen_nombre)             : null,
        origen_clave:   det?.origen_clave  ? String(det.origen_clave)              : null,
        destino_nombre: det?.destino_nombre ? String(det.destino_nombre)           : null,
        destino_clave:  det?.destino_clave  ? String(det.destino_clave)            : null,
        synced_at:      new Date().toISOString(),
      }
    })

    const { error: upsertErr } = await db.from('legacy_boletos_mirror').upsert(records, { onConflict: 'bol_id' })
    if (upsertErr) throw new Error(upsertErr.message)

    const newLastId  = records[records.length - 1].bol_id
    const newTotal   = prevTotal + records.length
    const done       = records.length < BATCH_SIZE

    await db.from('legacy_sync_state').update({
      last_bol_id: newLastId, total_synced: newTotal,
      last_synced_at: new Date().toISOString(), last_error: null,
    }).eq('id', 'boletos')

    return { synced: records.length, lastId: newLastId, totalSynced: newTotal, done }
  } catch (err: any) {
    await db.from('legacy_sync_state').update({ last_error: err.message }).eq('id', 'boletos')
    return { synced: 0, lastId, totalSynced: prevTotal, done: false, error: err.message }
  } finally {
    await pool.end()
  }
}

export async function runLegacyPackageSync(): Promise<SyncResult> {
  const db = svc()
  const { data: state } = await db
    .from('legacy_sync_state')
    .select('last_bol_id, total_synced')
    .eq('id', 'paquetes')
    .single() as { data: { last_bol_id: number; total_synced: number } | null }

  const lastId    = state?.last_bol_id  ?? 0
  const prevTotal = state?.total_synced ?? 0
  const pool = getPool()

  try {
    const [rows] = await pool.execute<mysql.RowDataPacket[]>(
      `SELECT p.id_paquete, p.codigo, p.id_tipopaquete, p.precio, p.peso, p.calculo, p.status,
              u.usrnombre AS vendedor,
              r.ras_remitente, r.ras_receptor, r.ras_receptor_2,
              r.ras_fechaenvio, r.ras_horaenvio, r.ras_destino, r.ras_envio,
              r.numeroContacto, r.ras_numrastreo, r.direccion,
              r.status AS descripcion, r.nombre_recibe, r.fecha_recepcion
       FROM paquetes p
       LEFT JOIN usuarios u ON u.usrid = p.usuario
       LEFT JOIN rastreo r ON r.ras_id = (SELECT MAX(x.ras_id) FROM rastreo x WHERE x.ras_numrastreo = p.codigo)
       WHERE p.id_paquete > ?
       ORDER BY p.id_paquete ASC
       LIMIT ?`,
      [lastId, BATCH_SIZE]
    )

    if (!rows.length) {
      await db.from('legacy_sync_state').update({ last_synced_at: new Date().toISOString(), last_error: null }).eq('id', 'paquetes')
      return { synced: 0, lastId, totalSynced: prevTotal, done: true }
    }

    const records = rows.map(r => ({
      id_paquete:      Number(r.id_paquete),
      codigo:          r.codigo          ? String(r.codigo)                          : null,
      tipo:            r.id_tipopaquete  ? Number(r.id_tipopaquete)                  : null,
      precio:          Number(r.calculo ?? r.precio ?? 0),
      peso:            r.peso            ? Number(r.peso)                            : null,
      status:          r.status          ? Number(r.status)                          : 0,
      vendedor:        r.vendedor        ? String(r.vendedor)                        : null,
      ras_remitente:   r.ras_remitente   ? String(r.ras_remitente)                  : null,
      ras_receptor:    r.ras_receptor    ? String(r.ras_receptor)                   : null,
      ras_receptor_2:  r.ras_receptor_2  ? String(r.ras_receptor_2)                 : null,
      numero_contacto: r.numeroContacto  ? String(r.numeroContacto)                 : null,
      ras_fechaenvio:  toDateStr(r.ras_fechaenvio),
      ras_horaenvio:   toTimeStr(r.ras_horaenvio),
      ras_destino:     r.ras_destino     ? String(r.ras_destino)                    : null,
      ras_envio:       r.ras_envio       ? String(r.ras_envio)                      : null,
      ras_numrastreo:  r.ras_numrastreo  ? String(r.ras_numrastreo)                 : null,
      descripcion:     r.descripcion     ? String(r.descripcion)                    : null,
      direccion:       r.direccion       ? String(r.direccion)                      : null,
      nombre_recibe:   r.nombre_recibe   ? String(r.nombre_recibe)                  : null,
      fecha_recepcion: toDateStr(r.fecha_recepcion),
      synced_at: new Date().toISOString(),
    }))

    const { error: upsertErr } = await db.from('legacy_paquetes_mirror').upsert(records, { onConflict: 'id_paquete' })
    if (upsertErr) throw new Error(upsertErr.message)

    const newLastId = records[records.length - 1].id_paquete
    const newTotal  = prevTotal + records.length
    const done      = records.length < BATCH_SIZE

    await db.from('legacy_sync_state').update({
      last_bol_id: newLastId, total_synced: newTotal,
      last_synced_at: new Date().toISOString(), last_error: null,
    }).eq('id', 'paquetes')

    return { synced: records.length, lastId: newLastId, totalSynced: newTotal, done }
  } catch (err: any) {
    await db.from('legacy_sync_state').update({ last_error: err.message }).eq('id', 'paquetes')
    return { synced: 0, lastId, totalSynced: prevTotal, done: false, error: err.message }
  } finally {
    await pool.end()
  }
}
