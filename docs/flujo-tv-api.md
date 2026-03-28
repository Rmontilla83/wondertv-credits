# Flujo TV API - Documentación

## Base URL
`https://vip.flujotv.net/api/v1/magis/`

## Autenticación
- Login: `POST /signin` (password RSA-encrypted)
- RSA Public Key embebida en el frontend

## Endpoints

### GET /info
Información del revendedor.
```json
{
  "account_num": 312,
  "login_name": "Wonderclass",
  "name": "Rafael Montilla",
  "is_revendedor": true,
  "mobile": "+58 424-8672759"
}
```

### GET /dashboard
Resumen de cuentas.
```json
{
  "accountNum": 312,   // Créditos disponibles
  "activeNum": 390,    // Cuentas activas
  "expNum": 217,       // Cuentas expiradas
  "delNum": 0,         // Cuentas eliminadas
  "sumNum": 9561       // Total histórico
}
```

### GET /cust/list?page=1&pageSize=30
Lista de clientes/cuentas (paginado, 30/página).
Endpoint real descubierto: `/api/v1/magis/cust/list`

**Headers requeridos:**
- `x-token`: Token de sesión (mismo que cookie `msgistv-token`)
- `x-sign`: `key={uuid}&secret={base64}&signature={base64}`
- `x-lang`: `xby`

**Parámetros opcionales de filtro:** `status`, `login_name`, `tipo`, `ip`, `country`, `smartCode`, `start`, `end`, `up`, `user_id`

**Respuesta paginada:**
```json
{
  "code": 200,
  "data": {
    "data": [ /* array de cuentas */ ],
    "count": 390,
    "page": 1,
    "total_pages": 13
  }
}
```
```json
{
  "login_name": "sum1954",        // Usuario IPTV
  "password": "clavew1607",       // Clave IPTV
  "status": "1",                  // 1=activo, 0=expirado
  "remark": "nombre tel email",   // Info del cliente (texto libre)
  "credit": 1,                    // Meses asignados
  "start_date": "2026-03-27T...", // Inicio de servicio
  "end_date": "2026-04-27T...",   // Fin de servicio
  "cust_id": "uuid",             // ID único
  "country": "VE",               // País
  "revendedor": "Wonderclass"    // Revendedor
}
```

## Mapeo Flujo TV → Wonder TV Credits

| Flujo TV | Wonder TV | Notas |
|---|---|---|
| `remark` (nombre) | `clients.name` | Parsear nombre del campo remark |
| `remark` (teléfono) | `clients.phone` | Parsear teléfono del remark |
| `remark` (email) | `clients.email` | Parsear email del remark |
| `login_name` | `clients.device_info` | Usuario IPTV del cliente |
| `status` "1"/"0" | `clients.status` | 1→active, 0→inactive |
| `country` | `clients.notes` | País del cliente |
| `credit` | `credit_assignments.quantity` | Meses asignados |
| `start_date` | `credit_assignments.period_start` | Inicio período |
| `end_date` | `credit_assignments.period_end` | Fin período |
| `cust_id` | referencia externa | Para sincronización |
| `accountNum` (dashboard) | `credit_balance.available_credits` | Créditos disponibles |
