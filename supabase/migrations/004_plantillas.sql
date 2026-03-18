CREATE TABLE IF NOT EXISTS plantillas_cotizacion (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  descripcion text,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS plantilla_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plantilla_id uuid NOT NULL REFERENCES plantillas_cotizacion(id) ON DELETE CASCADE,
  producto_id uuid REFERENCES productos(id),
  descripcion text,
  ancho numeric,
  alto numeric,
  cantidad int NOT NULL DEFAULT 1,
  orden int NOT NULL DEFAULT 0
);

-- Initial templates
INSERT INTO plantillas_cotizacion (id, nombre, descripcion) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Letrero trovicel 3mm', 'Trovicel 3mm emplacado con ojetillos y sellado'),
  ('00000000-0000-0000-0000-000000000002', 'Pendón roller estándar', 'Pendón 80×200cm con estructura roller'),
  ('00000000-0000-0000-0000-000000000003', 'Lienzo PVC con terminaciones', 'Tela PVC con ojetillos y sellado perimetral')
ON CONFLICT DO NOTHING;
