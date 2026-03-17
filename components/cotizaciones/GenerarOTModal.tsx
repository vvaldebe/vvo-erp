'use client'

import { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { crearOTdesdeCotizacion } from '@/app/actions/cotizaciones'

interface Props {
  cotizacionId: string
  maquinas: { id: string; nombre: string }[]
  onClose: () => void
}

export default function GenerarOTModal({ cotizacionId, maquinas, onClose }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [maquinaId, setMaquinaId] = useState<string>('')

  // Cerrar con Escape
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  function handleCrear() {
    startTransition(async () => {
      const result = await crearOTdesdeCotizacion(cotizacionId, maquinaId || null)
      if ('error' in result) {
        toast.error(result.error)
      } else {
        toast.success('Orden de trabajo creada')
        router.push(`/ot/${result.otId}`)
      }
    })
  }

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-sm mx-4 rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-card)] shadow-xl">

        {/* Header */}
        <div className="px-5 pt-5 pb-4 border-b border-[var(--border-default)]">
          <h2 className="text-[16px] font-semibold text-[var(--text-primary)]">Generar orden de trabajo</h2>
          <p className="text-[13px] text-[var(--text-secondary)] mt-1">
            Los ítems y datos del cliente se heredan de la cotización
          </p>
        </div>

        {/* Body */}
        <div className="px-5 py-4">
          <label className="block text-[12px] font-medium text-[var(--text-secondary)] uppercase tracking-[0.08em] mb-1.5">
            Máquina asignada
          </label>
          <select
            value={maquinaId}
            onChange={(e) => setMaquinaId(e.target.value)}
            disabled={isPending}
            className="w-full rounded-[6px] border border-[var(--border-default)] bg-[var(--bg-surface)] px-3 py-2 text-[14px] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--vvo-purple-light)] disabled:opacity-50"
          >
            <option value="">Sin asignar</option>
            {maquinas.map((m) => (
              <option key={m.id} value={m.id}>{m.nombre}</option>
            ))}
          </select>
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="px-4 py-2 rounded-[6px] border border-[var(--border-default)] bg-[var(--bg-card)] text-[14px] font-medium text-[var(--text-primary)] hover:bg-[var(--bg-muted)] transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleCrear}
            disabled={isPending}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-[6px] bg-[var(--vvo-purple)] hover:bg-[var(--vvo-purple-light)] text-[14px] font-medium text-white transition-colors disabled:opacity-50"
          >
            {isPending && (
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
            )}
            {isPending ? 'Creando…' : 'Crear OT'}
          </button>
        </div>

      </div>
    </div>
  )
}
