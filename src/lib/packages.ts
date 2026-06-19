export type PackageSize = 'sobre' | 'pequeno' | 'mediano' | 'grande' | 'extra_grande'
export type PackageStatus = 'label_created' | 'received' | 'in_transit' | 'arrived' | 'delivered' | 'returned'

export const PACKAGE_SIZES: Record<PackageSize, { label: string; desc: string; maxLbs: number; price: number; dims: string }> = {
  sobre:        { label: 'Sobre',        desc: 'Documentos, cartas, artículos ligeros', maxLbs: 1,  price: 10, dims: 'Hasta 1 lb' },
  pequeno:      { label: 'Pequeño',      desc: 'Regalos, accesorios, libros',           maxLbs: 5,  price: 15, dims: 'Hasta 5 lbs · 8×8×8"' },
  mediano:      { label: 'Mediano',      desc: 'Documentos, artículos del hogar',        maxLbs: 15, price: 25, dims: 'Hasta 15 lbs · 14×14×14"' },
  grande:       { label: 'Grande',       desc: 'Ropa, zapatos, electrónicos',            maxLbs: 30, price: 35, dims: 'Hasta 30 lbs · 20×20×20"' },
  extra_grande: { label: 'Extra grande', desc: 'Cajas grandes, artículos voluminosos',   maxLbs: 50, price: 45, dims: 'Hasta 50 lbs · 24×24×24"' },
}

export const STATUS_META: Record<PackageStatus, { label: string; color: string; bg: string; step: number }> = {
  label_created: { label: 'Etiqueta creada',      color: 'text-slate-600',   bg: 'bg-slate-100',   step: 0 },
  received:      { label: 'Recibido en terminal', color: 'text-blue-700',    bg: 'bg-blue-100',    step: 1 },
  in_transit:    { label: 'En tránsito',           color: 'text-amber-700',   bg: 'bg-amber-100',   step: 2 },
  arrived:       { label: 'Llegó a destino',       color: 'text-purple-700',  bg: 'bg-purple-100',  step: 3 },
  delivered:     { label: 'Entregado',             color: 'text-emerald-700', bg: 'bg-emerald-100', step: 4 },
  returned:      { label: 'Devuelto',              color: 'text-red-700',     bg: 'bg-red-100',     step: 5 },
}

export function generateTrackingNumber(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let result = 'TEO'
  for (let i = 0; i < 8; i++) result += chars[Math.floor(Math.random() * chars.length)]
  return result
}
