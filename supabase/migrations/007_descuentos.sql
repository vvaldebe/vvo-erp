-- Descuentos por ítem y global en cotizaciones
ALTER TABLE cotizacion_items ADD COLUMN IF NOT EXISTS descuento integer NOT NULL DEFAULT 0;
ALTER TABLE cotizaciones ADD COLUMN IF NOT EXISTS descuento_global integer NOT NULL DEFAULT 0;
