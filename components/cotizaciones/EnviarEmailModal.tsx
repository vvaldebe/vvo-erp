'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { X, Send, Loader2, Plus } from 'lucide-react'

interface Contacto {
  id: string
  nombre: string
  email: string | null
  cargo?: string | null
}

interface EnviarEmailModalProps {
  id: string
  numero: string
  clienteNombre: string
  clienteEmail: string
  contactos?: Contacto[]
  total: string
  validaHasta: string
  asuntoCotizacion?: string
  onClose: () => void
}

export default function EnviarEmailModal({
  id,
  numero,
  clienteNombre,
  clienteEmail,
  contactos = [],
  total,
  validaHasta,
  asuntoCotizacion,
  onClose,
}: EnviarEmailModalProps) {
  const router = useRouter()
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado]   = useState(false)
  const [destinatario, setDestinatario] = useState(clienteEmail)

  const defaultAsunto = asuntoCotizacion
    ? `Cotización ${numero} — ${asuntoCotizacion} — VVO Publicidad`
    : `Cotización ${numero} — VVO Publicidad`
  const defaultCuerpo = `Estimado/a ${clienteNombre},

Junto con saludar, adjuntamos la cotización ${numero} por un total de ${total}.

Esta cotización tiene validez hasta el ${validaHasta}.

Quedamos a su disposición para cualquier consulta o para coordinar los detalles del trabajo.

Saludos cordiales,
Victor Valdebenito
VVO Publicidad`

  const [asunto, setAsunto] = useState(defaultAsunto)
  const [cuerpo, setCuerpo] = useState(defaultCuerpo)
  const [ccInput, setCcInput] = useState('')
  const [ccList, setCcList] = useState<string[]>([])

  function addCc() {
    const email = ccInput.trim().toLowerCase()
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return
    if (!ccList.includes(email)) setCcList((prev) => [...prev, email])
    setCcInput('')
  }

  function removeCc(email: string) {
    setCcList((prev) => prev.filter((e) => e !== email))
  }

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
        body: JSON.stringify({ asunto, cuerpo, cc: ccList, to: destinatario }),
      })
      const json = await res.json()
      if (!res.ok) {
        toast.error(json.error ?? 'Error al enviar')
      } else {
        const extras = ccList.length ? ` y ${ccList.length} más` : ''
        toast.success(`Email enviado a ${destinatario}${extras}`)
        setEnviado(true)
        setTimeout(() => {
          onClose()
          router.refresh()
        }, 1500)
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
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-semibold text-[var(--text-primary)]">Enviar cotización</h2>
            {contactos.length > 1 ? (
              <select
                value={destinatario}
                onChange={(e) => setDestinatario(e.target.value)}
                className="mt-1 w-full text-xs border border-[var(--border-default)] rounded-[5px] px-2 py-1 bg-[var(--bg-card)] text-[var(--text-primary)] focus:outline-none focus:border-[#7c3aed]"
              >
                {contactos.filter((c) => c.email).map((c) => (
                  <option key={c.id} value={c.email!}>
                    {c.nombre}{c.cargo ? ` — ${c.cargo}` : ''} ({c.email})
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-xs text-[#6b7280] mt-0.5">Para: {destinatario}</p>
            )}
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

          {/* CC */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#6b7280] uppercase tracking-wider">
              Con copia (CC)
            </label>
            <div className="flex gap-2">
              <input
                type="email"
                value={ccInput}
                onChange={(e) => setCcInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCc() } }}
                placeholder="correo@ejemplo.com"
                className="flex-1 px-3 py-2 text-sm border border-[var(--border-default)] rounded-[6px] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/10 focus:border-[#7c3aed] transition-colors"
              />
              <button
                type="button"
                onClick={addCc}
                className="px-3 py-2 text-sm font-medium border border-[var(--border-default)] rounded-[6px] text-[var(--text-secondary)] hover:bg-[var(--bg-muted)] transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            {ccList.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-1">
                {ccList.map((email) => (
                  <span key={email} className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#ede9fe] text-[#7c3aed] text-xs rounded-full">
                    {email}
                    <button type="button" onClick={() => removeCc(email)} className="hover:text-[#6d28d9]">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

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
            disabled={enviando || enviado || !asunto.trim()}
            className={`inline-flex items-center gap-2 px-4 py-2 text-white text-sm font-semibold rounded-[6px] transition-colors disabled:opacity-50 ${
              enviado
                ? 'bg-green-600 hover:bg-green-600 cursor-default'
                : 'bg-[#7c3aed] hover:bg-[#6d28d9]'
            }`}
          >
            {enviado ? (
              <>&#10003; Enviado</>
            ) : enviando ? (
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
