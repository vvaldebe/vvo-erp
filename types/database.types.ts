// Tipos del dominio VVO Publicidad
// Actualizar con: npx supabase gen types typescript --project-id YOUR_ID > types/database.types.ts

// ── Enums ──────────────────────────────────────────────────────────────────
// Orden de precio: normal (más caro) → empresa → agencia → especial (negociado)
export type NivelPrecio = 'normal' | 'empresa' | 'agencia' | 'especial'

export const NIVELES_PRECIO: Record<NivelPrecio, { label: string; descripcion: string }> = {
  normal:   { label: 'Normal',   descripcion: 'Público general, sin relación comercial' },
  empresa:  { label: 'Empresa',  descripcion: 'Clientes corporativos con relación establecida' },
  agencia:  { label: 'Agencia',  descripcion: 'Agencias, diseñadores, volumen frecuente' },
  especial: { label: 'Especial', descripcion: 'Precio negociado con % descuento sobre Normal' },
}

export type EstadoCotizacion = 'borrador' | 'enviada' | 'aprobada' | 'rechazada'
export type EstadoOT         = 'pendiente' | 'en_produccion' | 'terminado' | 'entregado'
export type EstadoFactura    = 'pendiente' | 'pagada' | 'vencida' | 'anulada'
export type UnidadMedida     = 'm2' | 'ml' | 'unidad'

// ── Interfaces ─────────────────────────────────────────────────────────────

export interface Cliente {
  id: string
  nombre: string
  rut?: string
  email?: string
  telefono?: string
  direccion?: string
  nivel_precio: NivelPrecio
  descuento_porcentaje: number   // usado cuando nivel_precio = 'especial'
  canal_origen?: string
  notas?: string
  activo: boolean
  created_at: string
  // CRM extended fields
  razon_social?: string
  nombre_fantasia?: string
  giro?: string
  direccion_fiscal?: string
  comuna?: string
  ciudad?: string
  sitio_web?: string
}

export interface Contacto {
  id: string
  cliente_id: string
  nombre: string
  cargo?: string
  email?: string
  telefono?: string
  es_principal: boolean
  created_at: string
}

export interface Producto {
  id: string
  nombre: string
  categoria_id?: string
  unidad: UnidadMedida
  precio_normal:   number  // antes: precio_publico — precio más alto
  precio_empresa:  number
  precio_agencia:  number  // antes: precio_vip — precio más bajo estándar
  // precio_especial se calcula en tiempo real: precio_normal × (1 - descuento/100)
  costo_base: number
  // Desglose de costos
  material_id?:            string | null  // FK a tabla materiales
  costo_material:          number
  costo_tinta:             number
  costo_soporte:           number
  costo_otros:             number
  costo_overhead:          number
  tiene_tinta:             boolean
  cliente_lleva_material:  boolean
  activo: boolean
  created_at: string
}

export interface Terminacion {
  id: string
  nombre: string
  unidad: UnidadMedida
  precio: number
  activo: boolean
}

export interface Maquina {
  id: string
  nombre: string
  descripcion?: string
  activo: boolean
}

export interface Cotizacion {
  id: string
  numero: string
  cliente_id: string
  nivel_precio: NivelPrecio
  estado: EstadoCotizacion
  subtotal: number
  iva: number
  total: number
  notas?: string
  asunto?: string
  token_aprobacion?: string | null
  enviada_at?: string
  valida_hasta?: string
  created_at: string
  updated_at: string
}

export interface CotizacionItem {
  id: string
  cotizacion_id: string
  producto_id?: string
  titulo_item?: string | null   // added via migration 006 — null for catalog & Zoho legacy items
  descripcion?: string
  notas_item?: string | null
  ancho?: number
  alto?: number
  cantidad: number
  precio_unitario: number
  subtotal: number
  orden: number
}

export interface CotizacionItemTerminacion {
  id: string
  cotizacion_item_id: string
  terminacion_id?: string
  nombre: string
  precio: number
  cantidad: number
}

export interface OrdenTrabajo {
  id: string
  numero: string
  cotizacion_id?: string
  cliente_id: string
  maquina_id?: string
  estado: EstadoOT
  fecha_entrega?: string
  notas_produccion?: string
  archivo_diseno?: string
  subtotal: number
  total: number
  created_at: string
  updated_at: string
}

export interface Factura {
  id: string
  numero_sii?: string
  cliente_id: string
  ot_id?: string
  cotizacion_id?: string
  monto_neto: number
  iva: number
  total: number
  estado: EstadoFactura
  fecha_emision: string
  fecha_vencimiento?: string
  notas?: string
  created_at: string
}

export interface Pago {
  id: string
  factura_id: string
  monto: number
  fecha: string
  metodo?: string
  notas?: string
  created_at: string
}
