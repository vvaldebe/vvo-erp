import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AprobarCotizacionClient from './AprobarCotizacionClient'

function clp(n: number) {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
  }).format(n)
}

function fecha(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso + 'T12:00:00').toLocaleDateString('es-CL', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })
}

export default async function AprobarCotizacionPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params

  // Usar cliente sin RLS (búsqueda por token público)
  const supabase = await createClient()

  const { data: cot } = await supabase
    .from('cotizaciones')
    .select(`
      id, numero, estado, total, valida_hasta,
      clientes ( nombre )
    `)
    .eq('token_aprobacion', token)
    .single()

  if (!cot) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Link no válido</h1>
          <p className="text-gray-500 text-sm">
            Este enlace de aprobación no existe o ya fue utilizado.
          </p>
        </div>
      </div>
    )
  }

  if (cot.estado === 'aprobada') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Cotización ya aprobada</h1>
          <p className="text-gray-500 text-sm">Esta cotización ya fue aprobada anteriormente.</p>
        </div>
      </div>
    )
  }

  if (cot.estado === 'rechazada') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Cotización rechazada</h1>
          <p className="text-gray-500 text-sm">Esta cotización figura como rechazada.</p>
        </div>
      </div>
    )
  }

  const clienteNombre = Array.isArray(cot.clientes)
    ? (cot.clientes[0] as { nombre: string } | undefined)?.nombre ?? 'Cliente'
    : (cot.clientes as { nombre: string } | null)?.nombre ?? 'Cliente'

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">

        {/* Header */}
        <div className="bg-[#1a1a2e] px-8 py-6">
          <p className="text-white text-xl font-bold">VVO Publicidad</p>
          <p className="text-gray-400 text-xs mt-0.5">vvo.cl · Quilpué, Chile</p>
        </div>

        {/* Content */}
        <div className="p-8">
          <p className="text-sm text-gray-500 mb-1">Cotización para</p>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">{clienteNombre}</h1>
          <p className="text-[#3d1450] font-semibold text-sm mb-6">{cot.numero}</p>

          <div className="bg-gray-50 rounded-lg p-4 space-y-2 mb-6">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Total</span>
              <span className="font-bold text-gray-900 text-base">{clp(cot.total)}</span>
            </div>
            {cot.valida_hasta && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Válida hasta</span>
                <span className="text-gray-700">{fecha(cot.valida_hasta)}</span>
              </div>
            )}
          </div>

          <AprobarCotizacionClient token={token} />
        </div>
      </div>
    </div>
  )
}
