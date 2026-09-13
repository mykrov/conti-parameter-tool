# Conti Parameter Tool — Contexto y reglas de negocio

> Documento de referencia para futuras sesiones. Resume stack, esquema,
> relaciones y reglas implementadas en la app.

## 1. Proyecto

- App web Node.js + Express (`server.js`) + frontend vanilla JS (`public/`).
- Base: MySQL `pos_contifico` (verificado: MySQL 5.7.44, 79 tablas).
- Arranque: `npm install` → `npm start` → `http://localhost:3000`.
- Config por `.env` (gitignored, **nunca hardcodear credenciales**):
  `PORT, DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME=pos_contifico`.
- Solo **una instancia** en el puerto 3000 (si hay `EADDRINUSE`, liberar con
  `taskkill /F /FI "IMAGENAME eq node.exe"` y verificar con
  `netstat -ano | Select-String ":3000"`).
- Cambios en `server.js` requieren reiniciar; cambios en `public/` solo `Ctrl+F5`.

## 2. Tablas y relaciones

| Tabla | Rol | Clave / FK |
|---|---|---|
| `factura_cabecera` | Cabecera de factura | PK `idfactura_cabecera` |
| `factura_detalle` | Líneas de la factura | `idfactura_cabecera` → cabecera; `id_producto` → `inventario_producto.id` (columna `nombre` como `producto_nombre`) |
| `forma_pagos` (**plural**, no `forma_pago`) | Pagos de la factura (0..N) | `id_cabecera` → `factura_cabecera.idfactura_cabecera`; PK `idforma_pagos` |
| `impuestosdocumento` (sin `id` propia) | IVAs usados por factura (0..N) | `idFacturaCabecera` → cabecera; columnas `porcentajeIVA, subtotalIVA, valorIVA` |
| `pos_configuracion` | Parámetros POS | `terminal_id` → `pos_terminal.id` |
| `pos_terminal` | Terminales | `nombre_comercial / razon_social / nombre_maquina` |
| `parametro` / `parametro_grupo` | Parámetros por terminal | `parametro.grupo_id` → grupo; `terminal_id` → terminal |
| `inventario_producto` | Catálogo productos | `id`, `nombre` |

- `GET /api/facturas`: últimas **20** por `fecha_creacion DESC` + detalles
  (`factura_detalle`) + pagos (`forma_pagos`) en **2 consultas IN + agrupado
  en memoria**. Cada factura trae `detalles[]`, `total_items`, `pagos[]`, `total_pagos`.

## 3. Regla: `factura_cabecera.tipo` (letra → significado)

| Letra | Etiqueta UI | `id_tipoDocumento` |
|---|---|---|
| `F` | Factura | 1 |
| `N` | Nota de Venta | 2 |
| `D` | DNA (Documento No Autorizado) | 3 |
| `P` | Prefactura | 5 |
| `C` | Nota de Crédito | 4 |

- UI muestra la **etiqueta** (`TIPO_LABELS` en `facturas.js`); letra desconocida → fallback a la letra.
- Tooltip del badge: letra original + `id_tipoDocumento`.
- Buscador incluye la etiqueta (ej. "prefactura").

## 4. Regla: estado de sincronización a la nube (por factura)

Campos: `subio` (tinyint), `id_integracion` (char), `imprimio` (tinyint),
`cod_error` y `msg_error` (varchar). Función `getSyncEstado()` en `facturas.js`:

| Estado | Condición | Color | Tooltip |
|---|---|---|---|
| **Subido** | `subio=1` **y** `id_integracion` poblado | verde | código de integración |
| **Error** | `msg_error` o `cod_error` con texto (y no subido) | rojo, `cursor: help` | `Código X • mensaje` |
| **Guardado** | resto (sin integración) | ámbar | `imprimio=0` → "aún no se ha intentado sincronizar"; `imprimio=1` → "imprimido pero sin sincronizar" |

## 5. Regla: total pagado por registro de `forma_pagos`

- `PAGO_MONTO_COLS` suma: efectivo, tarjeta, transferencia, cheque, retención,
  giftcard, nota, domicilioya, glovo, super_easy, uber, rappi, picker,
  otros_domicilios, fidelización, propina.
- **Excluido**: `monto_recibido_efectivo` (es el efectivo *entregado*, no cargo extra).
- UI: chips solo con montos > 0 + total de la fila + total pagado de la factura.
- Cabecera: `💳 N pagos` (verde) o `Sin pago` (gris).

## 6. Regla: comparación de integridad entre 2 facturas

- UI: check por tarjeta + botón **Comparar** (se activa con exactamente 2).
- Compara **todos los campos** de cabecera (`c.*`) salvo `CAB_EXCLUIR`:
  identidad/documentos (`idfactura_cabecera, id_integracion, secuencia,
  idCliente, numero_documento, documento, descripcion, autorizacion, token,
  codigo_unico`), fechas (`fecha_emision/creacion, ultimo_cambio,
  fecha_vencimiento, ultima_sincronizacion`), ruido sync
  (`subio, subioTemp, subio_documento, tipo_sincro, msg/cod_error`) y
  enriquecidos (`terminal_nombre, detalles, pagos, total_items, total_pagos`).
- Detalle: empareja líneas por `id_producto` (en orden si se repite);
  excluye `DET_EXCLUIR` (PKs/FKs, `producto_nombre`,
  `promocion_integracionId`, fechas).
- Pagos: empareja por código `forma_pago`; excluye `PAGO_EXCLUIR`
  (PK/FK, `id_integracion`, `token`, `id_transaccion_giftcard`, fechas).
- Impuestos: empareja por `porcentajeIVA`; excluye `IMP_EXCLUIR`
  (`idFacturaCabecera`). Compara `subtotalIVA` y `valorIVA` con tolerancia.
- Montos con tolerancia `0.005`: diferencias de **0.01 se detectan**,
  ruido ≤0.001 se ignora; `null ≈ ''`; numéricos comparan por valor (`5 ≈ '5.00'`).
- Lógica pura en `public/js/sections/compare.js` (testeable en Node);
  render en `facturas.js` + modal `compareModal`.

## 7. Endpoints (`server.js`)

- `GET /api/status` → `{ status, host, port, database, version, serverTime, latencyMs, totalTables }`.
- `GET /api/configuraciones` y `GET /api/configuraciones/:id` (join `pos_terminal`).
- `GET /api/parametros`, `GET /api/parametro-grupos`, `PUT /api/parametros/:id`
  y `POST /api/parametros/guardar-lote` (transacción; `terminal_id` obligatorio).
- `GET /api/facturas` → `{ success, total, data[] }` con detalle + pagos.

## 8. Decisiones UI aplicadas

- Pill `MySQL Conectado (N ms)`: `white-space: nowrap; flex-shrink: 0` (evita salto de línea).
- `select` de filtros (Facturas/Parámetro/pos_configuracion): estilo moderno
  compartido en `.filter-group select` (chevron cyan propio, degradado, focus-ring).
- Modal genérico JSON (`openJsonModal`) para cabecera/pagos; modal tabla
  (`recordModal`) para columnas de `factura_detalle`.

## 9. Gotchas verificados

- `forma_pagos` es **plural**; `factura` sin pagos recientes es normal (últimas 20
  pueden traer `total_pagos: 0`).
- `id_cabecera` (pagos) ≡ `idfactura_cabecera` (cabecera).
- No matar PIDs a ciegas: identificar el que escucha `:3000` vía `netstat -ano`.
