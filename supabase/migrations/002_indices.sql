-- ============================================================
-- VVO ERP — Índices de rendimiento
-- Ejecutar después de 000_schema_inicial.sql y 001_crm_clientes.sql
-- Todos usan IF NOT EXISTS — idempotentes
-- ============================================================

-- ── cotizaciones ─────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_cotizaciones_cliente
  ON cotizaciones(cliente_id);

CREATE INDEX IF NOT EXISTS idx_cotizaciones_estado
  ON cotizaciones(estado);

CREATE INDEX IF NOT EXISTS idx_cotizaciones_fecha
  ON cotizaciones(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_cotizaciones_numero
  ON cotizaciones(numero);

CREATE INDEX IF NOT EXISTS idx_cotizaciones_token
  ON cotizaciones(token_aprobacion)
  WHERE token_aprobacion IS NOT NULL;

-- ── cotizacion_items ─────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_cot_items_cotizacion
  ON cotizacion_items(cotizacion_id);

CREATE INDEX IF NOT EXISTS idx_cot_item_terminaciones_item
  ON cotizacion_item_terminaciones(cotizacion_item_id);

-- ── ordenes_trabajo ───────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_ot_cliente
  ON ordenes_trabajo(cliente_id);

CREATE INDEX IF NOT EXISTS idx_ot_estado
  ON ordenes_trabajo(estado);

CREATE INDEX IF NOT EXISTS idx_ot_cotizacion
  ON ordenes_trabajo(cotizacion_id);

CREATE INDEX IF NOT EXISTS idx_ot_items_ot
  ON ot_items(ot_id);

-- ── facturas ─────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_facturas_cliente
  ON facturas(cliente_id);

CREATE INDEX IF NOT EXISTS idx_facturas_estado
  ON facturas(estado);

CREATE INDEX IF NOT EXISTS idx_facturas_vencimiento
  ON facturas(fecha_vencimiento)
  WHERE estado IN ('pendiente', 'vencida');

CREATE INDEX IF NOT EXISTS idx_pagos_factura
  ON pagos(factura_id);

-- ── clientes / contactos ─────────────────────────────────────────────────────
-- contactos_cliente_id_idx ya existe en 001_crm_clientes.sql

CREATE INDEX IF NOT EXISTS idx_clientes_nivel
  ON clientes(nivel_precio);

CREATE INDEX IF NOT EXISTS idx_clientes_activo
  ON clientes(activo)
  WHERE activo = true;

-- ── productos ────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_productos_categoria
  ON productos(categoria_id);

CREATE INDEX IF NOT EXISTS idx_productos_activo
  ON productos(activo)
  WHERE activo = true;
