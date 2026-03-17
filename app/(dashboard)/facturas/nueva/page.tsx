import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import NuevaFacturaForm from '@/components/facturas/NuevaFacturaForm'

export default async function NuevaFacturaPage({
  searchParams,
}: {
  searchParams: Promise<{ ot_id?: string; cotizacion_id?: string }>
}) {
  const { ot_id, cotizacion_id } = await searchParams

  const supabase = await createClient()

  const [{ data: clientes }, { data: ots }, { data: cotizaciones }] = await Promise.all([
    supabase.from('clientes').select('id, nombre').order('nombre'),
    supabase
      .from('ordenes_trabajo')
      .select('id, numero, total, cliente_id')
      .in('estado', ['terminado', 'entregado'])
      .order('created_at', { ascending: false }),
    supabase
      .from('cotizaciones')
      .select('id, numero, total, cliente_id')
      .eq('estado', 'aprobada')
      .order('created_at', { ascending: false }),
  ])

  return (
    <div className="space-y-5 max-w-2xl">
      <div className="flex items-center gap-3">
        <Link
          href="/facturas"
          className="w-8 h-8 rounded-[6px] border border-[var(--border-default)] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[#d4d4d8] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-[20px] font-semibold text-[var(--text-primary)]">Nueva factura</h1>
          <p className="text-[13px] text-[var(--text-secondary)] mt-0.5">Registra una factura emitida</p>
        </div>
      </div>

      <NuevaFacturaForm
        clientes={clientes ?? []}
        ots={ots ?? []}
        cotizaciones={cotizaciones ?? []}
        defaultOtId={ot_id}
        defaultCotId={cotizacion_id}
      />
    </div>
  )
}
