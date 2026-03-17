'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { cambiarEstadoCotizacion, clonarCotizacion } from '@/app/actions/cotizaciones'
import EnviarEmailModal from './EnviarEmailModal'

interface AccionesCotizacionProps {
  id: string
  numero: string
  estado: string
  clienteNombre: string
  clienteEmail: string | null | undefined
  total: string
  validaHasta: string
  asunto?: string | null
}

export default function AccionesCotizacion({
  id,
  numero,
  estado,
  clienteNombre,
  clienteEmail,
  total,
  validaHasta,
  asunto,
}: AccionesCotizacionProps) {
  const router = useRouter()
  const [isPending,  startTransition]  = useTransition()
  const [isClonar,   startClonar]      = useTransition()
  const [modalEmail, setModalEmail]    = useState(false)

  function handleEditar() {
    router.push(`/cotizaciones/${id}/editar`)
  }

  function handleClonar() {
    startClonar(async () => {
      const result = await clonarCotizacion(id)
      if (result && 'error' in result) toast.error(result.error)
      // Si éxito, redirect lo maneja el server action
    })
  }

  function handleDescargarPDF() {
    window.open(`/api/pdf/${id}`, '_blank')
  }

  function handleAbrirEmail() {
    if (!clienteEmail) {
      toast.error('El cliente no tiene email registrado')
      return
    }
    setModalEmail(true)
  }

  function handleCambiarEstado(nuevoEstado: 'aprobada' | 'rechazada') {
    startTransition(async () => {
      const result = await cambiarEstadoCotizacion(id, nuevoEstado)
      if ('error' in result) {
        toast.error(result.error)
      } else if (nuevoEstado === 'aprobada' && 'otId' in result && result.otId) {
        toast.success('Cotización aprobada — OT creada')
        router.push(`/ot/${result.otId}`)
      } else {
        toast.success('Cotización rechazada')
        router.refresh()
      }
    })
  }

  const estadoStr     = estado as string
  const puedeEnviar   = estadoStr === 'borrador' || estadoStr === 'enviada'
  const puedeAprobar  = estadoStr === 'enviada'  || estadoStr === 'borrador'
  const puedeRechazar = estadoStr === 'enviada'  || estadoStr === 'aprobada' || estadoStr === 'borrador'
  const noAprobada    = estadoStr !== 'aprobada'
  const noRechazada   = estadoStr !== 'rechazada'

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {/* Editar */}
        {estadoStr === 'borrador' && (
          <button
            onClick={handleEditar}
            className="inline-flex items-center gap-1.5 rounded-md border border-[var(--border-default)] bg-[var(--bg-card)] px-3 py-1.5 text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--bg-muted)] transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
            </svg>
            Editar
          </button>
        )}

        {/* Clonar */}
        <button
          onClick={handleClonar}
          disabled={isClonar}
          className="inline-flex items-center gap-1.5 rounded-md border border-[var(--border-default)] bg-[var(--bg-card)] px-3 py-1.5 text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--bg-muted)] transition-colors disabled:opacity-50"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75" />
          </svg>
          {isClonar ? 'Clonando…' : 'Clonar'}
        </button>

        {/* PDF */}
        <button
          onClick={handleDescargarPDF}
          className="inline-flex items-center gap-1.5 rounded-md border border-[var(--border-default)] bg-[var(--bg-card)] px-3 py-1.5 text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--bg-muted)] transition-colors"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 16v-8m0 8-3-3m3 3 3-3M4 20h16" />
          </svg>
          PDF
        </button>

        {/* Enviar email */}
        {puedeEnviar && (
          <button
            onClick={handleAbrirEmail}
            className="inline-flex items-center gap-1.5 rounded-md border border-[var(--border-default)] bg-[var(--bg-card)] px-3 py-1.5 text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--bg-muted)] transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25H4.5a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5H4.5a2.25 2.25 0 00-2.25 2.25m19.5 0-9.75 6.75L2.25 6.75" />
            </svg>
            Enviar email
          </button>
        )}

        {/* Aprobar */}
        {puedeAprobar && noAprobada && (
          <button
            onClick={() => handleCambiarEstado('aprobada')}
            disabled={isPending}
            className="inline-flex items-center gap-1.5 rounded-md bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
            Aprobar
          </button>
        )}

        {/* Rechazar */}
        {puedeRechazar && noRechazada && (
          <button
            onClick={() => handleCambiarEstado('rechazada')}
            disabled={isPending}
            className="inline-flex items-center gap-1.5 rounded-md bg-red-50 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-100 transition-colors disabled:opacity-50"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
            Rechazar
          </button>
        )}
      </div>

      {/* Modal de email */}
      {modalEmail && clienteEmail && (
        <EnviarEmailModal
          id={id}
          numero={numero}
          clienteNombre={clienteNombre}
          clienteEmail={clienteEmail}
          total={total}
          validaHasta={validaHasta}
          asuntoCotizacion={asunto ?? undefined}
          onClose={() => setModalEmail(false)}
        />
      )}
    </>
  )
}
