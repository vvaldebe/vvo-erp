-- ============================================================
-- VVO ERP — Schema inicial completo
-- Reconstruido desde código fuente (server actions + tipos TS)
-- Todas las sentencias usan IF NOT EXISTS para ser idempotentes
-- Ejecutar ANTES de 001_crm_clientes.sql
-- ============================================================

-- Extensión UUID (Supabase la incluye por defecto)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── 1. categorias ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS categorias (
  id     uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text        NOT NULL,
  orden  int         NOT NULL DEFAULT 0
);

-- ── 2. materiales ────────────────────────────────────────────────────────────
-- Tipos de material usados en productos

CREATE TABLE IF NOT EXISTS materiales (
  id        uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre    text        NOT NULL,
  tipo      text        CHECK (tipo IN ('tela','rigido','adhesivo','papel','cnc_laser','otro')),
  costo_m2  numeric     NOT NULL DEFAULT 0,
  unidad    text        NOT NULL DEFAULT 'm2' CHECK (unidad IN ('m2','ml','unidad')),
  activo    boolean     NOT NULL DEFAULT true
);

-- ── 3. maquinas ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS maquinas (
  id          uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre      text    NOT NULL,
  descripcion text,
  activo      boolean NOT NULL DEFAULT true
);

-- ── 4. servicios_maquina ─────────────────────────────────────────────────────
-- Tarifas por minuto de uso de cada máquina

CREATE TABLE IF NOT EXISTS servicios_maquina (
  id                    uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre                text    NOT NULL,
  tipo                  text    NOT NULL CHECK (tipo IN ('laser','cnc','plotter_corte','plotter_impresion','laminadora','otro')),
  precio_minuto_normal  numeric NOT NULL DEFAULT 0,
  precio_minuto_empresa numeric NOT NULL DEFAULT 0,
  precio_minuto_agencia numeric NOT NULL DEFAULT 0,
  minimo_minutos        int     NOT NULL DEFAULT 1,
  descripcion           text,
  activo                boolean NOT NULL DEFAULT true
);

-- ── 5. clientes ──────────────────────────────────────────────────────────────
-- Incluye campos base + campos CRM extendidos (también en 001_crm_clientes.sql
-- con ALTER TABLE IF NOT EXISTS — idempotente)

CREATE TABLE IF NOT EXISTS clientes (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre               text        NOT NULL,
  rut                  text,
  email                text,
  telefono             text,
  direccion            text,
  nivel_precio         text        NOT NULL DEFAULT 'normal'
                                   CHECK (nivel_precio IN ('normal','empresa','agencia','especial')),
  descuento_porcentaje numeric     NOT NULL DEFAULT 0
                                   CHECK (descuento_porcentaje >= 0 AND descuento_porcentaje <= 100),
  canal_origen         text,
  notas                text,
  activo               boolean     NOT NULL DEFAULT true,
  created_at           timestamptz NOT NULL DEFAULT now(),
  -- Campos CRM extendidos (ver también 001_crm_clientes.sql)
  razon_social         text,
  nombre_fantasia      text,
  giro                 text,
  direccion_fiscal     text,
  comuna               text,
  ciudad               text,
  sitio_web            text
);

-- ── 6. contactos ─────────────────────────────────────────────────────────────
-- Contactos secundarios por cliente

CREATE TABLE IF NOT EXISTS contactos (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id  uuid        REFERENCES clientes(id) ON DELETE CASCADE,
  nombre      text        NOT NULL,
  cargo       text,
  email       text,
  telefono    text,
  es_principal boolean    NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ── 7. productos ─────────────────────────────────────────────────────────────
-- Tabla maestra de productos con precios por nivel y desglose de costos

CREATE TABLE IF NOT EXISTS productos (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre                text        NOT NULL,
  categoria_id          uuid        REFERENCES categorias(id),
  unidad                text        NOT NULL DEFAULT 'm2'
                                    CHECK (unidad IN ('m2','ml','unidad')),
  -- Precios de venta por nivel (netos, sin IVA)
  precio_normal         numeric     NOT NULL DEFAULT 0,  -- precio más alto (público general)
  precio_empresa        numeric     NOT NULL DEFAULT 0,  -- precio intermedio
  precio_agencia        numeric     NOT NULL DEFAULT 0,  -- precio más bajo estándar
  -- precio_especial se calcula: precio_normal × (1 - descuento_porcentaje/100)
  -- Costos
  costo_base            numeric     NOT NULL DEFAULT 0,
  material_id           uuid        REFERENCES materiales(id),
  costo_material        numeric     NOT NULL DEFAULT 0,
  costo_tinta           numeric     NOT NULL DEFAULT 0,
  costo_soporte         numeric     NOT NULL DEFAULT 0,
  costo_otros           numeric     NOT NULL DEFAULT 0,
  costo_overhead        numeric     NOT NULL DEFAULT 0,
  tiene_tinta           boolean     NOT NULL DEFAULT true,
  cliente_lleva_material boolean    NOT NULL DEFAULT false,
  activo                boolean     NOT NULL DEFAULT true,
  created_at            timestamptz NOT NULL DEFAULT now()
);

-- ── 8. terminaciones ─────────────────────────────────────────────────────────
-- Terminaciones opcionales que se suman a los ítems (ojetillos, laminado, etc.)

CREATE TABLE IF NOT EXISTS terminaciones (
  id      uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre  text    NOT NULL,
  unidad  text    NOT NULL DEFAULT 'm2' CHECK (unidad IN ('m2','ml','unidad')),
  precio  numeric NOT NULL DEFAULT 0,
  activo  boolean NOT NULL DEFAULT true
);

-- ── 9. cotizaciones ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS cotizaciones (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  numero           text        UNIQUE NOT NULL,          -- COT-2026-001
  cliente_id       uuid        REFERENCES clientes(id),
  nivel_precio     text        CHECK (nivel_precio IN ('normal','empresa','agencia','especial')),
  estado           text        NOT NULL DEFAULT 'borrador'
                               CHECK (estado IN ('borrador','enviada','aprobada','rechazada')),
  subtotal         numeric     NOT NULL DEFAULT 0,       -- neto sin IVA
  iva              numeric     NOT NULL DEFAULT 0,       -- 19%
  total            numeric     NOT NULL DEFAULT 0,       -- subtotal + iva
  notas            text,
  asunto           text,                                 -- línea de asunto para el email
  token_aprobacion text        UNIQUE,                   -- UUID para link de aprobación pública
  enviada_at       timestamptz,
  valida_hasta     date,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

-- ── 10. cotizacion_items ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS cotizacion_items (
  id              uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  cotizacion_id   uuid    NOT NULL REFERENCES cotizaciones(id) ON DELETE CASCADE,
  producto_id     uuid    REFERENCES productos(id),
  descripcion     text,
  ancho           numeric,                               -- metros
  alto            numeric,                               -- metros
  cantidad        int     NOT NULL DEFAULT 1,
  precio_unitario numeric NOT NULL,                      -- precio/m² al momento de cotizar
  subtotal        numeric NOT NULL,
  orden           int     NOT NULL DEFAULT 0,
  notas_item      text
);

-- ── 11. cotizacion_item_terminaciones ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS cotizacion_item_terminaciones (
  id                  uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  cotizacion_item_id  uuid    NOT NULL REFERENCES cotizacion_items(id) ON DELETE CASCADE,
  terminacion_id      uuid    REFERENCES terminaciones(id),
  nombre              text    NOT NULL,                  -- snapshot del nombre al cotizar
  precio              numeric NOT NULL,                  -- snapshot del precio al cotizar
  cantidad            numeric NOT NULL DEFAULT 1
);

-- ── 12. ordenes_trabajo ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ordenes_trabajo (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  numero           text        UNIQUE NOT NULL,          -- OT-0001
  cotizacion_id    uuid        REFERENCES cotizaciones(id),
  cliente_id       uuid        REFERENCES clientes(id),
  maquina_id       uuid        REFERENCES maquinas(id),
  estado           text        NOT NULL DEFAULT 'pendiente'
                               CHECK (estado IN ('pendiente','en_produccion','terminado','entregado')),
  fecha_entrega    date,
  notas_produccion text,
  archivo_diseno   text,                                 -- URL a archivo de diseño
  subtotal         numeric     NOT NULL DEFAULT 0,
  total            numeric     NOT NULL DEFAULT 0,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

-- ── 13. ot_items ─────────────────────────────────────────────────────────────
-- Sólo para OTs directas (sin cotización origen).
-- OTs desde cotización usan los cotizacion_items de la cotización origen.

CREATE TABLE IF NOT EXISTS ot_items (
  id              uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  ot_id           uuid    NOT NULL REFERENCES ordenes_trabajo(id) ON DELETE CASCADE,
  producto_id     uuid    REFERENCES productos(id),
  descripcion     text,
  ancho           numeric,
  alto            numeric,
  cantidad        int     NOT NULL DEFAULT 1,
  precio_unitario numeric NOT NULL,
  subtotal        numeric NOT NULL,
  orden           int     NOT NULL DEFAULT 0
);

-- ── 14. facturas ─────────────────────────────────────────────────────────────
-- Registro interno de facturas emitidas (el SII se opera externamente)

CREATE TABLE IF NOT EXISTS facturas (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_sii        text,                                -- número real emitido en el SII
  cliente_id        uuid        REFERENCES clientes(id),
  ot_id             uuid        REFERENCES ordenes_trabajo(id),
  cotizacion_id     uuid        REFERENCES cotizaciones(id),
  monto_neto        numeric     NOT NULL,
  iva               numeric     NOT NULL,
  total             numeric     NOT NULL,
  estado            text        NOT NULL DEFAULT 'pendiente'
                                CHECK (estado IN ('pendiente','pagada','vencida','anulada')),
  fecha_emision     date        NOT NULL,
  fecha_vencimiento date,
  notas             text,
  created_at        timestamptz NOT NULL DEFAULT now()
);

-- ── 15. pagos ────────────────────────────────────────────────────────────────
-- Abonos parciales o totales aplicados a una factura

CREATE TABLE IF NOT EXISTS pagos (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  factura_id  uuid        NOT NULL REFERENCES facturas(id) ON DELETE CASCADE,
  monto       numeric     NOT NULL,
  fecha       date        NOT NULL,
  metodo      text        CHECK (metodo IN ('transferencia','efectivo','cheque','tarjeta')),
  notas       text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ── 16. configuracion ────────────────────────────────────────────────────────
-- Key-value store para parámetros del sistema (empresa, banco, costos, etc.)
-- Claves conocidas:
--   empresa_nombre, empresa_rut, empresa_giro, empresa_direccion,
--   empresa_telefono, empresa_email, empresa_web
--   banco_nombre, banco_tipo_cuenta, banco_numero_cuenta,
--   banco_titular, banco_rut_titular, banco_email_transferencia
--   costo_tinta_m2, overhead_m2
--   condiciones_pago

CREATE TABLE IF NOT EXISTS configuracion (
  clave text PRIMARY KEY,
  valor text NOT NULL DEFAULT ''
);

-- ── Datos iniciales ──────────────────────────────────────────────────────────
-- Configuración por defecto de la empresa

INSERT INTO configuracion (clave, valor) VALUES
  ('empresa_nombre',    'VVO Publicidad'),
  ('empresa_rut',       ''),
  ('empresa_giro',      'Impresión digital, publicidad exterior'),
  ('empresa_direccion', 'Calle Tres 703, Belloto, Quilpué'),
  ('empresa_telefono',  '+56 9 86193102'),
  ('empresa_email',     'victor@vvo.cl'),
  ('empresa_web',       'vvo.cl'),
  ('costo_tinta_m2',    '2500'),
  ('overhead_m2',       '1800'),
  ('condiciones_pago',  'Pago al contado vía transferencia bancaria. Factura emitida una vez confirmado el pago.')
ON CONFLICT (clave) DO NOTHING;

-- ── Categorías iniciales ─────────────────────────────────────────────────────

INSERT INTO categorias (nombre, orden) VALUES
  ('Emplacados',               1),
  ('Telas PVC y Backlight',    2),
  ('Adhesivos',                3),
  ('Cajas de luz',             4),
  ('CNC / Laser',              5),
  ('Otro',                     99)
ON CONFLICT DO NOTHING;
