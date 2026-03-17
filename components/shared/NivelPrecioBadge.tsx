import { cn } from '@/lib/utils'
import type { NivelPrecio } from '@/types/database.types'

const CONFIG: Record<NivelPrecio, { label: string; style: string }> = {
  normal:   { label: 'Normal',   style: 'bg-[#f4f4f5] text-[var(--text-secondary)]' },
  empresa:  { label: 'Empresa',  style: 'bg-[#dbeafe] text-[#1e40af]' },
  agencia:  { label: 'Agencia',  style: 'bg-[#ede9fe] text-[#5b21b6]' },
  especial: { label: 'Especial', style: 'bg-[#fef3c7] text-[#92400e]' },
}

interface NivelPrecioBadgeProps {
  nivel: NivelPrecio
  descuento?: number
  className?: string
}

export default function NivelPrecioBadge({ nivel, descuento, className }: NivelPrecioBadgeProps) {
  const cfg = CONFIG[nivel] ?? CONFIG['normal']
  const label = nivel === 'especial' && descuento
    ? `Especial −${descuento}%`
    : cfg.label

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-[4px] text-[11px] font-medium',
        cfg.style,
        className
      )}
    >
      {label}
    </span>
  )
}
