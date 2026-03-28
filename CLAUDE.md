@AGENTS.md

# Wonder TV Credits - Guía del Proyecto

## Qué es
App de control de créditos IPTV para el revendedor **Wonderclass** (Rafael Montilla). Gestiona clientes, ventas, finanzas y sincronización con el portal **Flujo TV** (`vip.flujotv.net`).

## Stack
- **Next.js 16** + React 19 + TypeScript
- **Supabase** (auth, Postgres, RLS)
- **Tailwind CSS 4** + shadcn/ui
- Deploy en **Vercel**

## Flujo principal de negocio

```
1. Admin compra créditos al proveedor → credit_purchases
2. Operador recarga clientes en el portal Flujo TV
3. Sync automático detecta Δ créditos → crea credit_assignment (pending)
4. Operador completa el pago (método, monto, referencia) → payment_status = completed
5. Dashboard muestra finanzas en tiempo real
```

## Sync con Flujo TV

El sync llama a la API de Flujo TV server-side con firma RSA+HMAC generada dinámicamente (reverse-engineered del frontend). Solo necesita el token de sesión (`FLUJO_TOKEN` en `.env.local`).

- **Endpoint**: `POST /api/sync/flujo`
- Descarga las 13 páginas (390 clientes) en paralelo
- Detecta diferencias en `flujo_credits`: si subió → crea venta pendiente automáticamente
- La firma (`x-sign`) se genera por request: UUID + RSA encrypt + HMAC-SHA256
- Clave pública RSA hardcoded (extraída del bundle `umi.js` de Flujo TV)

## Estructura de páginas

| Ruta | Función | Rol |
|------|---------|-----|
| `/dashboard` | KPIs, ventas pendientes, gráficas, actividad | Todos |
| `/dashboard/clients` | Tabla de clientes (orden portal Flujo TV) | Todos |
| `/dashboard/clients/[id]` | Detalle + historial + ventas pendientes | Todos |
| `/dashboard/credits` | Pool de créditos comprados | Todos |
| `/dashboard/credits/new` | Registrar compra al proveedor | Admin |
| `/dashboard/expiring` | Clientes por vencer | Todos |
| `/dashboard/financials` | Reportes P&L, márgenes, burn rate | Todos |
| `/dashboard/sync` | Sync automático/manual con Flujo TV | Admin |
| `/dashboard/settings` | Usuarios, tasas de cambio | Admin |

**Eliminadas**: `/dashboard/assignments` y `/dashboard/assignments/new` (reemplazadas por auto-detección en sync).

## Tablas principales (Supabase)

### clients
Sincronizada desde Flujo TV. Campos clave: `flujo_cust_id`, `flujo_login`, `flujo_credits`, `flujo_start_date`, `flujo_end_date`, `country`, `device_info` (login/password), `name`, `phone`, `email` (parseados del campo `remark`), `notes` (remark original).

### credit_purchases
Compras de créditos al proveedor. Campos: `quantity`, `total_cost_usd`, `cost_per_credit` (generated), `payment_method`, `payment_reference`.

### credit_assignments
Ventas/cortesías a clientes. Campo clave: `payment_status` ('pending' | 'completed').
- **pending**: auto-creado por sync cuando detecta Δ créditos
- **completed**: operador completó el pago o marcó como cortesía
- Campos de pago: `payment_method`, `payment_amount_usd`, `payment_reference`, `payment_amount_bss`, `exchange_rate`
- Campos de cortesía: `is_courtesy`, `courtesy_reason`

### Views
- `credit_balance`: total_purchased - total_assigned = available_credits
- `monthly_financial_summary`: revenue, assignments, avg ticket por mes
- `monthly_profitability`: cost vs revenue vs profit por mes

## Métodos de pago
- `banesco_bss` - Bolívares (requiere monto BSS + tasa de cambio)
- `zelle` - USD vía Bank of America
- `paypal` - USD vía PayPal

## Roles
- **admin**: todo (compras, sync, settings, usuarios)
- **operator**: clientes, completar ventas, ver reportes
- **viewer**: solo lectura

## Archivos clave

| Archivo | Función |
|---------|---------|
| `src/app/api/sync/flujo/route.ts` | Sync server-side con firma RSA dinámica |
| `src/app/api/sync/route.ts` | Sync manual (paste JSON) |
| `src/components/forms/CompleteSaleForm.tsx` | Completar venta pendiente |
| `src/components/forms/QuickRechargeForm.tsx` | Recarga manual rápida |
| `src/components/forms/CreditPurchaseForm.tsx` | Registrar compra al proveedor |
| `src/lib/types.ts` | Interfaces TypeScript |
| `src/lib/constants.ts` | Labels de métodos de pago, roles |
| `src/lib/utils.ts` | Formateo USD/BSS/fechas |

## Variables de entorno (.env.local)
- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `FLUJO_TOKEN` - Token de sesión de Flujo TV (actualizar cuando expire)

## Convenciones
- Español en la UI, inglés en código
- Supabase service role key para API routes (server-side)
- RLS con función `get_my_role()` para evitar recursión
- Migraciones en `supabase/migration*.sql` (v1 a v4)
