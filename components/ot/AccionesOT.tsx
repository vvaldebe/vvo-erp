'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2, Save } from 'lucide-react'
import { cambiarEstadoOT, actualizarOT } from '@/app/actions/ot'

type EstadoOT = 'pendiente' | 'en_produccion' | 'terminado' | 'entregado'

interface Maquina {
  id: string
  nombre: string
}

interface AccionesOTProps {
  id: string
  estado: EstadoOT
  maquinaId:       string | null
  fechaEntrega:    string | null
  notasProduccion: string | null
  archivoDiseno:   string | null
  maquinas:        Maquina[]
}

const FLUJO: Record<EstadoOT, { next: EstadoOT | null; label: string; style: string }> = {
  pendiente:     { next: 'en_produccion', label: 'Iniciar producción', style: 'bg-blue-600 hover:bg-blue-700 text-white' },
  en_produccion: { next: 'terminado',     label: 'Marcar terminado',   style: 'bg-green-600 hover:bg-green-700 text-white' },
  terminado:     { next: 'entregado',     label: 'Marcar entregado',   style: 'bg-[#27272a] hover:bg-[#3f3f46] text-white' },
  entregado:     { next: null,            label: '',                   style: '' },
}

export default function AccionesOT({
  id,
  estado,
  maquinaId,
  fechaEntrega,
  notasProduccion,
  archivoDiseno,
  maquinas,
}: AccionesOTProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isSaving, startSaving]      = useTransition()
  const [saved, setSaved]            = useState(false)

  const [maquina,  setMaquina]  = useState(maquinaId ?? '')
  const [fecha,    setFecha]    = useState(fechaEntrega ?? '')
  const [notas,    setNotas]    = useState(notasProduccion ?? '')
  const [archivo,  setArchivo]  = useState(archivoDiseno ?? '')

  const flujo = FLUJO[estado]

  function handleAvanzarEstado() {
    if (!flujo.next) return
    startTransition(async () => {
      const result = await cambiarEstadoOT(id, flujo.next!)
      if ('error' in result) {
        toast.error(result.error)
      } else {
        toast.success(`OT → ${flujo.next}`)
        router.refresh()
      }
    })
  }

  function handleGuardar() {
    startSaving(async () => {
      const result = await actualizarOT(id, {
        maquina_id:       maquina || null,
        fecha_entrega:    fecha   || null,
        notas_produccion: notas   || null,
        archivo_diseno:   archivo || null,
      })
      if ('error' in result) {
        toast.error(result.error)
      } else {
        toast.success('OT actualizada')
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
        router.refresh()
      }
    })
  }

  const INPUT = 'w-full px-3 py-2 text-sm border border-[var(--border-default)] rounded-[6px] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/10 focus:border-[#7c3aed] transition-colors bg-[var(--bg-card)]'

  return (
    <div className="space-y-6">

      {/* Avanzar estado */}
      {flujo.next && (
        <button
          onClick={handleAvanzarEstado}
          disabled={isPending}
          className={`w-full py-2.5 rounded-[6px] text-sm font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50 ${flujo.style}`}
        >
          {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : flujo.label}
        </button>
      )}

      {/* Campos operativos */}
      <div className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Máquina</label>
          <select
            value={maquina}
            onChange={(e) => setMaquina(e.target.value)}
            className={INPUT}
          >
            <option value="">Sin asignar</option>
            {maquinas.map((m) => (
              <option key={m.id} value={m.id}>{m.nombre}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Fecha de entrega</label>
          <input
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className={INPUT}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Archivo de diseño (URL)</label>
          <input
            type="url"
            value={archivo}
            onChange={(e) => setArchivo(e.target.value)}
            placeholder="https://drive.google.com/..."
            className={INPUT}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Notas de producción</label>
          <textarea
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            rows={4}
            placeholder="Instrucciones internas, observaciones..."
            className={`${INPUT} resize-none`}
          />
        </div>

        <button
          onClick={handleGuardar}
          disabled={isSaving}
          className={`w-full py-2 border rounded-[6px] text-sm font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50 ${
            saved
              ? 'border-green-500 text-green-600 bg-green-50'
              : 'border-[var(--border-default)] text-[var(--text-primary)] hover:bg-[var(--bg-muted)]'
          }`}
        >
          {isSaving
            ? <Loader2 className="w-4 h-4 animate-spin" />
            : saved
              ? '✓ Guardado'
              : <><Save className="w-4 h-4" /> Guardar cambios</>
          }
        </button>
      </div>
    </div>
  )
}
