'use client'

import { useState } from 'react'
import Link from 'next/link'
import GenerarOTModal from './GenerarOTModal'

interface Props {
  cotizacionId: string
  maquinas: { id: string; nombre: string }[]
  otExistente: { id: string; numero: string } | null
}

export default function GenerarOTBtn({ cotizacionId, maquinas, otExistente }: Props) {
  const [modalOpen, setModalOpen] = useState(false)

  if (otExistente) {
    return (
      <Link
        href={`/ot/${otExistente.id}`}
        className="inline-flex items-center gap-1.5 rounded-md bg-green-600/20 border border-green-600/40 px-3 py-1.5 text-sm font-medium text-green-400 hover:bg-green-600/30 transition-colors"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
        Ver OT: {otExistente.numero} →
      </Link>
    )
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setModalOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-md bg-green-600 hover:bg-green-700 px-3 py-1.5 text-sm font-medium text-white transition-colors"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
        Generar OT
      </button>

      {modalOpen && (
        <GenerarOTModal
          cotizacionId={cotizacionId}
          maquinas={maquinas}
          onClose={() => setModalOpen(false)}
        />
      )}
    </>
  )
}
