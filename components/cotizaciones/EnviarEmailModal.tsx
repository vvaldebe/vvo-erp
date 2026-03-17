'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { X, Send, Loader2 } from 'lucide-react'

interface EnviarEmailModalProps {
  id: string
  numero: string
  clienteNombre: string
  clienteEmail: string
  total: string
  validaHasta: string
  onClose: () => void
}

export default function EnviarEmailModal({
  id,
  numero,
  clienteNombre,
  clienteEmail,
  total,
  validaHasta,
  onClose,
}: EnviarEmailModalProps) {
  const router = useRouter()
  const [enviando, setEnviando] = useState(false)

  const defaultAsunto = `Cotización ${numero} — VVO Publicidad`
  const defaultCuerpo = `Estimado/a ${clienteNombre},

Junto con saludar, adjuntamos la cotización ${numero} por un total de ${total}.

Esta cotización tiene validez hasta el ${validaHasta}.

Quedamos a su disposición para cualquier consulta o para coordinar los detalles del trabajo.

Saludos cordiales,
Victor Valdebenito
VVO Publicidad`

  const [asunto, setAsunto] = useState(defaultAsunto)
  const [cuerpo, setCuerpo] = useState(defaultCuerpo)

  // Cerrar con Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  async function handleEnviar() {
    setEnviando(true)
    try {
      const res = await fetch(`/api/cotizaciones/${id}/enviar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ asunto, cuerpo }),
      })
      const json = await res.json()
      if (!res.ok) {
        toast.error(json.error ?? 'Error al enviar')
      } else {
        toast.success(`Email enviado a ${clienteEmail}`)
        onClose()
        router.refresh()
      }
    } catch {
      toast.error('Error de conexión')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-lg mx-4 bg-[var(--bg-card)] rounded-[8px] shadow-xl border border-[var(--border-default)] flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-default)]">
          <div>
            <h2 className="text-base font-semibold text-[var(--text-primary)]">Enviar cotización</h2>
            <p className="text-xs text-[#6b7280] mt-0.5">Para: {clienteEmail}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-[#6b7280] hover:bg-[var(--bg-muted)] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#6b7280] uppercase tracking-wider">
              Asunto
            </label>
            <input
              type="text"
              value={asunto}
              onChange={(e) => setAsunto(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-[var(--border-default)] rounded-[6px] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/10 focus:border-[#7c3aed] transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#6b7280] uppercase tracking-wider">
              Mensaje
            </label>
            <textarea
              value={cuerpo}
              onChange={(e) => setCuerpo(e.target.value)}
              rows={10}
              className="w-full px-3 py-2 text-sm border border-[var(--border-default)] rounded-[6px] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/10 focus:border-[#7c3aed] transition-colors resize-none leading-relaxed"
            />
          </div>

          <p className="text-xs text-[#9ca3af]">
            El PDF de la cotización se adjuntará automáticamente.
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-[var(--border-default)]">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-[#6b7280] hover:text-[var(--text-primary)] transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleEnviar}
            disabled={enviando || !asunto.trim()}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#7c3aed] hover:bg-[#6d28d9] text-white text-sm font-semibold rounded-[6px] transition-colors disabled:opacity-50"
          >
            {enviando ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Enviando...</>
            ) : (
              <><Send className="w-4 h-4" /> Enviar</>
            )}
          </button>
        </div>

      </div>
    </div>
  )
}
