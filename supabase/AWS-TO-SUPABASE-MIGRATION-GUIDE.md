# Guía de Migración AWS → Supabase
## Tres Estrellas de Oro Inc — Sistema de Boletos

**Fecha:** Julio 2026  
**Estado:** Nuevo sistema Supabase listo para recibir datos de AWS

---

## Orden de Ejecución de Migraciones en Supabase

Ejecutar los siguientes scripts en el SQL Editor de Supabase **en este orden**:

```
1.  schema.sql                     ← Schema base completo (tablas, enums, triggers, RLS, seed)
2.  sucursales-migration.sql       ← Tabla sucursales + seed de 9 sucursales
3.  staff-fields-migration.sql     ← Campos sucursal_id, departamento, permisos en profiles
4.  corridas-choferes-migration.sql ← Tabla drivers + sold_by_user_id en bookings
5.  descuentos-migration.sql       ← is_promo, promo_label en passengers
6.  packages-migration.sql         ← Tabla packages + package_events
7.  cierres-migration.sql          ← Tabla cierres_turno
8.  quickbooks-migration.sql       ← Tabla quickbooks_settings
9.  gastos-qb-migration.sql        ← Tabla gastos + qb_transactions + qb_expense_accounts
10. gastos-category-map.sql        ← Mapeo de cuentas QB por categoría y sucursal
11. trip-stops-migration.sql       ← Tablas route_stops + trip_stop_logs
12. rls-public-read-migration.sql  ← Políticas RLS de lectura pública
13. trips-driver-fk-migration.sql  ← Fix FK de trips.driver_id → drivers(id)
14. roles-and-stops-migration.sql  ← Fix ENUM roles + stop codes correctos (CORRER ÚLTIMO)
```

> **IMPORTANTE:** `schema.sql` ya incluye cajero/developer en el ENUM y los stops correctos (SYS/TIJ/OTY).  
> El archivo `roles-and-stops-migration.sql` es para **bases de datos ya existentes** con el schema viejo.

---

## Datos a Migrar desde AWS

### Prioridad ALTA (migrar primero)

| Tabla AWS | Tabla Supabase | Notas |
|-----------|----------------|-------|
| customers / users | `profiles` + `auth.users` | Crear usuarios en Supabase Auth + perfil |
| bookings / reservations | `bookings` | Poblar origin_name, destination_name |
| tickets / passengers | `passengers` | Mantener qr_code si hay |
| transactions / payments | `payments` | Mapear provider_payment_id |
| stops / terminals | `stops` | Usar códigos SYS/TIJ/OTY (no LTI/ATI/CAT) |

### Prioridad MEDIA

| Tabla AWS | Tabla Supabase | Notas |
|-----------|----------------|-------|
| routes | `routes` | Usar códigos LA-SYS, LA-TIJ, LA-OTY, OTY-LA |
| schedules | `schedules` | |
| trips / departures | `trips` | Generar trip_number automáticamente |
| packages | `packages` + `package_events` | |
| branches / offices | `sucursales` | |

### Prioridad BAJA (histórico)

| Tabla AWS | Tabla Supabase | Notas |
|-----------|----------------|-------|
| loyalty_points | `loyalty_transactions` + `profiles.loyalty_points` | |
| expenses | `gastos` | |
| shift_closures | `cierres_turno` | |
| staff / employees | `profiles` (cajero/admin) | Crear usuarios en Supabase Auth |

---

## Script de Migración de Clientes (AWS → Supabase Auth)

Para cada cliente en AWS:

```sql
-- 1. Crear usuario en Supabase Auth (via Admin API)
-- POST /auth/v1/admin/users
-- { "email": "...", "password": "TEO2026!", "email_confirm": true, "user_metadata": { "full_name": "..." } }

-- 2. El trigger on_auth_user_created crea el perfil automáticamente
-- 3. Actualizar loyalty_points y total_trips del perfil
UPDATE profiles SET loyalty_points = <aws_points>, total_trips = <aws_trips>
WHERE email = '<email>';
```

---

## Verificaciones Post-Migración

```sql
-- Verificar stops correctos
SELECT code, name, city FROM stops ORDER BY sort_order;
-- Esperado: LA, HP, SYS, TIJ, OTY

-- Verificar roles disponibles
SELECT DISTINCT role FROM profiles;
-- Esperado: customer, cajero, admin, developer, etc.

-- Verificar que no hay bookings sin origin_name
SELECT COUNT(*) FROM bookings WHERE origin_name IS NULL;
-- Debe ser 0 (o actualizarlos con UPDATE)

-- Verificar pagos registrados
SELECT payment_method, provider, COUNT(*), SUM(amount)
FROM payments GROUP BY payment_method, provider;

-- Verificar QB conectado
SELECT realm_id, expires_at FROM quickbooks_settings LIMIT 1;
```

---

## Variables de Entorno Pendientes (configurar antes de producción)

```env
# Stripe (si se activa)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Square (CRÍTICO — pagos con tarjeta en sucursales)
SQUARE_ACCESS_TOKEN=<token_real>
SQUARE_LOCATION_ID=<location_real>
NEXT_PUBLIC_SQUARE_APP_ID=<app_id_real>

# Email (boletos)
RESEND_API_KEY=re_<key_real>
EMAIL_FROM=boletos@tresestrellasdeorobus.com

# QuickBooks (conectar vía /admin/dashboard → Contabilidad → QuickBooks)
QUICKBOOKS_CLIENT_ID=ABrS5ygwypQi2MMAz8i3IolzyjK4rb7StOOJwA6kHvBGqnlLXp
QUICKBOOKS_CLIENT_SECRET=GPfxy3k8QzKfRxaOpL0z3ZA20S15be0JjGIU2clz

# IMPORTANTE: cambiar antes de producción
ADMIN_EMAIL=<correo_real_admin>
ADMIN_PASSWORD=<contraseña_segura>
ADMIN_SESSION_SECRET=<secreto_aleatorio_largo>
```

---

## Estado del Sistema (post-correcciones julio 2026)

### ✅ Funcionando
- Auth de admin (cookie local)
- Auth de clientes (Supabase Auth)
- Flujo de compra online (3 pasos)
- Venta en caja por cajero
- Validación de boletos QR
- Paquetería (crear, rastrear, cobrar)
- Gastos y cierre de turno
- Sincronización QuickBooks
- Dashboard admin + analíticas
- Programa de lealtad (puntos)
- Cancelación + reembolso Square

### ⚠️ Necesita configuración real
- Square (tokens reales — actualmente placeholders)
- Resend email (key real — actualmente placeholder)
- QuickBooks (conectar vía OAuth en el dashboard admin)
- Stripe (si se quiere como alternativa de pago online)

### 🔲 Por construir
- Scanner QR del conductor (página existe, falta conectar a DB)
- Envío de email de confirmación de paquetes
- Notificaciones push de estado de paquete
- Reporte de cajero individual (existe parcialmente)
- Panel público de tracking de paquetes por URL
