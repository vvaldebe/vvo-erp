-- Migration 001: CRM Clients Module
-- Adds new fields to clientes and creates contactos table

-- Nuevas columnas en clientes
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS razon_social text;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS nombre_fantasia text;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS giro text;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS direccion_fiscal text;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS comuna text;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS ciudad text;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS sitio_web text;

-- Tabla contactos
CREATE TABLE IF NOT EXISTS contactos (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid references clientes(id) on delete cascade,
  nombre text not null,
  cargo text,
  email text,
  telefono text,
  es_principal boolean default false,
  created_at timestamptz default now()
);

-- Index
CREATE INDEX IF NOT EXISTS contactos_cliente_id_idx ON contactos(cliente_id);
