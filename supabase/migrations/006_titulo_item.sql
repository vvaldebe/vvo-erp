-- Agrega campo titulo_item a cotizacion_items
-- Para ítems libres: titulo_item = título del ítem, descripcion = descripción del ítem
-- Para ítems de catálogo: titulo_item = null (el título viene de productos.nombre), descripcion = descripción adicional
-- Para ítems Zoho legacy: titulo_item = null, descripcion = su título original (se muestra como título por fallback)

ALTER TABLE cotizacion_items ADD COLUMN IF NOT EXISTS titulo_item text;
