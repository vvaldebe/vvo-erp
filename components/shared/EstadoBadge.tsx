import { cn } from '@/lib/utils'

type EstadoCotizacion = 'borrador' | 'enviada' | 'aprobada' | 'rechazada'
type EstadoOT         = 'pendiente' | 'en_produccion' | 'terminado' | 'entregado'
type EstadoFactura    = 'pendiente' | 'pagada' | 'vencida' | 'anulada'

type Estado = EstadoCotizacion | EstadoOT | EstadoFactura

const CONFIG: Record<Estado, { label: string; style: string }> = {
  // Cotizaciones
  borrador:       { label: 'Borrador',      style: 'bg-[var(--border-default)] text-[var(--text-secondary)]' },
  enviada:        { label: 'Enviada',       style: 'bg-[#1d4ed8] text-white' },
  aprobada:       { label: 'Aprobada',      style: 'bg-[#15803d] text-white' },
  rechazada:      { label: 'Rechazada',     style: 'bg-[#dc2626] text-white' },
  // OT
  pendiente:      { label: 'Pendiente',     style: 'bg-[#d97706] text-white' },
  en_produccion:  { label: 'En producción', style: 'bg-[#7c3aed] text-white' },
  terminado:      { label: 'Terminado',     style: 'bg-[#15803d] text-white' },
  entregado:      { label: 'Entregado',     style: 'bg-[var(--border-default)] text-[var(--text-secondary)]' },
  // Factura
  pagada:         { label: 'Pagada',        style: 'bg-[#15803d] text-white' },
  vencida:        { label: 'Vencida',       style: 'bg-[#dc2626] text-white' },
  anulada:        { label: 'Anulada',       style: 'bg-[var(--border-default)] text-[var(--text-secondary)]' },
}

interface EstadoBadgeProps {
  estado: Estado
  className?: string
}

export default function EstadoBadge({ estado, className }: EstadoBadgeProps) {
  const cfg = CONFIG[estado] ?? { label: estado, style: 'bg-[var(--border-subtle)] text-[var(--text-secondary)]' }
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-[4px] text-[11px] font-medium',
        cfg.style,
        className
      )}
    >
      {cfg.label}
    </span>
  )
}
