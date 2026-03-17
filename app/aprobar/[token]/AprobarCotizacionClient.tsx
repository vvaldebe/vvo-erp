'use client'

import { useState, useTransition } from 'react'
import { Loader2 } from 'lucide-react'
import { aprobarCotizacionPorToken } from '@/app/actions/cotizaciones'

interface AprobarCotizacionClientProps {
  token: string
}

export default function AprobarCotizacionClient({ token }: AprobarCotizacionClientProps) {
  const [isPending, startTransition] = useTransition()
  const [result, setResult] = useState<'idle' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  function handleAprobar() {
    startTransition(async () => {
      const res = await aprobarCotizacionPorToken(token)
      if ('error' in res) {
        setResult('error')
        setErrorMsg(res.error)
      } else {
        setResult('success')
      }
    })
  }

  if (result === 'success') {
    return (
      <div className="text-center py-4">
        <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
          <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        </div>
        <h2 className="text-lg font-bold text-gray-900 mb-1">¡Cotización aprobada!</h2>
        <p className="text-sm text-gray-500">
          Hemos recibido su aprobación. Nos pondremos en contacto a la brevedad para coordinar el trabajo.
        </p>
      </div>
    )
  }

  if (result === 'error') {
    return (
      <div className="text-center py-4">
        <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
          <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </div>
        <h2 className="text-lg font-bold text-gray-900 mb-1">Error</h2>
        <p className="text-sm text-gray-500">{errorMsg}</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <button
        onClick={handleAprobar}
        disabled={isPending}
        className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-bold text-base rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
      >
        {isPending ? (
          <><Loader2 className="w-5 h-5 animate-spin" /> Aprobando...</>
        ) : (
          '✓ Aprobar cotización'
        )}
      </button>
      <p className="text-xs text-gray-400 text-center">
        Al aprobar, confirma su aceptación de los términos y montos indicados en la cotización.
      </p>
    </div>
  )
}
