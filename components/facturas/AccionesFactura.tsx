'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { cambiarEstadoFactura } from '@/app/actions/facturas'

type EstadoFactura = 'pendiente' | 'pagada' | 'vencida' | 'anulada'

interface Props {
  facturaId: string
  estadoActual: EstadoFactura
}

export default function AccionesFactura({ facturaId, estadoActual }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleCambiarEstado(nuevoEstado: EstadoFactura) {
    startTransition(async () => {
      const result = await cambiarEstadoFactura(facturaId, nuevoEstado)
      if ('error' in result) {
        toast.error(result.error)
      } else {
        toast.success(`Estado cambiado a "${nuevoEstado}"`)
        router.refresh()
      }
    })
  }

  return (
    <div className="space-y-2">
      {estadoActual !== 'vencida' && estadoActual !== 'anulada' && estadoActual !== 'pagada' && (
        <button
          onClick={() => handleCambiarEstado('vencida')}
          disabled={isPending}
          className="w-full px-3 py-2 text-[13px] font-medium border border-red-200 text-red-600 rounded-[6px] hover:bg-red-50 transition-colors disabled:opacity-50"
        >
          Marcar como vencida
        </button>
      )}
      {estadoActual !== 'anulada' && (
        <button
          onClick={() => handleCambiarEstado('anulada')}
          disabled={isPending}
          className="w-full px-3 py-2 text-[13px] font-medium border border-[var(--border-default)] text-[var(--text-secondary)] rounded-[6px] hover:bg-[var(--bg-muted)] transition-colors disabled:opacity-50"
        >
          Anular factura
        </button>
      )}
      {estadoActual === 'anulada' && (
        <button
          onClick={() => handleCambiarEstado('pendiente')}
          disabled={isPending}
          className="w-full px-3 py-2 text-[13px] font-medium border border-[var(--border-default)] text-[var(--text-secondary)] rounded-[6px] hover:bg-[var(--bg-muted)] transition-colors disabled:opacity-50"
        >
          Reactivar factura
        </button>
      )}
    </div>
  )
}
