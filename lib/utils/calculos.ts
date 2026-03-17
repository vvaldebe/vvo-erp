import type { NivelPrecio, Producto } from '@/types/database.types'

// ── Precios ────────────────────────────────────────────────────────────────

/**
 * Devuelve el precio unitario correcto para un producto según el nivel.
 * Para nivel 'especial': aplica descuento porcentual sobre precio_normal.
 */
export function getPrecioNivel(
  producto: Pick<Producto, 'precio_normal' | 'precio_empresa' | 'precio_agencia'>,
  nivel: NivelPrecio,
  descuento_porcentaje = 0
): number {
  switch (nivel) {
    case 'normal':
      return producto.precio_normal
    case 'empresa':
      return producto.precio_empresa
    case 'agencia':
      return producto.precio_agencia
    case 'especial':
      return calcularPrecioEspecial(producto.precio_normal, descuento_porcentaje)
  }
}

/**
 * Precio especial = precio_normal × (1 - descuento/100)
 */
export function calcularPrecioEspecial(
  precio_normal: number,
  descuento_porcentaje: number
): number {
  const descuento = Math.min(Math.max(descuento_porcentaje, 0), 100)
  return precio_normal * (1 - descuento / 100)
}

// ── Cálculo de ítems ───────────────────────────────────────────────────────

export function calcularM2(ancho: number, alto: number): number {
  return ancho * alto
}

export function calcularSubtotalItem(
  precioNivel: number,
  ancho: number,
  alto: number,
  cantidad: number
): number {
  return precioNivel * calcularM2(ancho, alto) * cantidad
}

// ── IVA y totales ──────────────────────────────────────────────────────────

export function calcularIva(subtotal: number): number {
  return subtotal * 0.19
}

export function calcularTotal(subtotal: number): number {
  return subtotal + calcularIva(subtotal)
}

// ── Formato ────────────────────────────────────────────────────────────────

export function formatCLP(amount: number): string {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
  }).format(amount)
}
