'use client'

import { useState, useRef, useTransition } from 'react'
import { CheckCircle2, Loader2, Lock } from 'lucide-react'
import { actualizarNotasInternas } from '@/app/actions/notas-internas'

interface Props {
  id:     string
  tipo:   'cotizacion' | 'ot'
  valor:  string | null
}

export default function NotasInternasEditor({ id, tipo, valor }: Props) {
  const [notas, setNotas]           = useState(valor ?? '')
  const [saved, setSaved]           = useState(false)
  const [error, setError]           = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const timeoutRef                  = useRef<ReturnType<typeof setTimeout> | null>(null)

  function handleBlur() {
    if (notas === (valor ?? '')) return
    setError(null)
    setSaved(false)

    startTransition(async () => {
      const result = await actualizarNotasInternas(id, tipo, notas)
      if ('error' in result) {
        setError(result.error)
      } else {
        setSaved(true)
        if (timeoutRef.current) clearTimeout(timeoutRef.current)
        timeoutRef.current = setTimeout(() => setSaved(false), 2500)
      }
    })
  }

  return (
    <div className="border border-amber-500/30 rounded-[8px] bg-[var(--bg-muted)] overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-amber-500/20 bg-amber-500/5">
        <Lock className="w-3 h-3 text-amber-500 shrink-0" />
        <p className="text-[11px] font-semibold text-amber-500 uppercase tracking-[0.08em]">
          Notas internas del equipo
        </p>
        <span className="text-[10px] text-[var(--text-muted)] ml-auto">
          Solo equipo interno — no aparece en PDF ni email
        </span>
      </div>

      {/* Textarea */}
      <div className="px-4 py-3">
        <textarea
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
          onBlur={handleBlur}
          rows={3}
          placeholder="Notas internas: instrucciones especiales, observaciones de producción, comentarios del cliente, etc."
          className="w-full bg-transparent text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none resize-none leading-relaxed"
        />
      </div>

      {/* Status */}
      <div className="px-4 py-2 border-t border-amber-500/10 flex items-center gap-2 min-h-[30px]">
        {isPending && (
          <span className="flex items-center gap-1.5 text-[11px] text-[var(--text-muted)]">
            <Loader2 className="w-3 h-3 animate-spin" />
            Guardando...
          </span>
        )}
        {saved && !isPending && (
          <span className="flex items-center gap-1.5 text-[11px] text-[#16a34a]">
            <CheckCircle2 className="w-3 h-3" />
            Guardado
          </span>
        )}
        {error && !isPending && (
          <span className="text-[11px] text-red-400">{error}</span>
        )}
      </div>
    </div>
  )
}
