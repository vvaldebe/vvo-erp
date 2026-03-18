'use client'

import { useState, useEffect, useTransition } from 'react'
import { X, FileText, Loader2 } from 'lucide-react'
import { getPlantillas, type Plantilla } from '@/app/actions/plantillas'

interface Props {
  onSelect: (plantilla: Plantilla) => void
  onClose:  () => void
}

export default function PlantillaModal({ onSelect, onClose }: Props) {
  const [plantillas, setPlantillas] = useState<Plantilla[] | null>(null)
  const [isPending, startTransition] = useTransition()

  // Fetch on mount
  useEffect(() => {
    startTransition(async () => {
      const data = await getPlantillas()
      setPlantillas(data)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div className="relative z-10 w-full max-w-md bg-[var(--bg-card)] border border-[var(--border-default)] rounded-[10px] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-default)]">
          <p className="text-[14px] font-semibold text-[var(--text-primary)]">Usar plantilla</p>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-[5px] text-[var(--text-muted)] hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
            aria-label="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="max-h-[60vh] overflow-y-auto">
          {isPending || plantillas === null ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-5 h-5 animate-spin text-[var(--text-muted)]" />
            </div>
          ) : plantillas.length === 0 ? (
            <div className="py-12 text-center">
              <FileText className="w-8 h-8 mx-auto mb-2 text-[var(--text-muted)] opacity-40" />
              <p className="text-[13px] text-[var(--text-muted)]">No hay plantillas disponibles</p>
            </div>
          ) : (
            <ul className="divide-y divide-[var(--border-subtle)]">
              {plantillas.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => { onSelect(p); onClose() }}
                    className="w-full text-left px-4 py-3.5 hover:bg-[var(--bg-muted)] transition-colors cursor-pointer group"
                  >
                    <p className="text-[13px] font-semibold text-[var(--text-primary)] group-hover:text-[#7c3aed] transition-colors">
                      {p.nombre}
                    </p>
                    {p.descripcion && (
                      <p className="text-[12px] text-[var(--text-muted)] mt-0.5">{p.descripcion}</p>
                    )}
                    <p className="text-[11px] text-[var(--text-muted)] mt-1">
                      {p.items.length} ítem{p.items.length !== 1 ? 's' : ''}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-[var(--border-default)] bg-[var(--bg-muted)]">
          <p className="text-[11px] text-[var(--text-muted)]">
            Los ítems se agregarán a la cotización actual.{' '}
            <a href="/admin/plantillas" target="_blank" className="text-[#7c3aed] hover:underline">
              Gestionar plantillas
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
