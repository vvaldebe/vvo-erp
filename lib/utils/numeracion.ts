export function generarNumeroCotizacion(correlativo: number): string {
  const year = new Date().getFullYear()
  const numero = correlativo.toString().padStart(3, '0')
  return `COT-${year}-${numero}`
}

export function generarNumeroOT(correlativo: number): string {
  const numero = correlativo.toString().padStart(4, '0')
  return `OT-${numero}`
}
