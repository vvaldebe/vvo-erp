ALTER TABLE cotizaciones ADD COLUMN IF NOT EXISTS notas_internas text;
ALTER TABLE ordenes_trabajo ADD COLUMN IF NOT EXISTS notas_internas text;
