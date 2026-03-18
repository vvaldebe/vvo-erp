-- ============================================================
-- VVO ERP — Función para marcar facturas vencidas
-- Ejecutar después de 000_schema_inicial.sql
-- Llamada en cada carga del dashboard y página de facturas
-- ============================================================

CREATE OR REPLACE FUNCTION actualizar_facturas_vencidas()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE facturas
  SET estado = 'vencida'
  WHERE estado = 'pendiente'
    AND fecha_vencimiento < CURRENT_DATE;
$$;
