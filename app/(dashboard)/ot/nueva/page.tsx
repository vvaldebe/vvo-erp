import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import NuevaOTForm from '@/components/ot/NuevaOTForm'
import { generarNumeroOT } from '@/lib/utils/numeracion'

export default async function NuevaOTPage() {
  const supabase = await createClient()

  const [{ data: clientes }, { data: maquinas }, { count }] = await Promise.all([
    supabase.from('clientes').select('id, nombre').order('nombre'),
    supabase.from('maquinas').select('id, nombre').eq('activo', true).order('nombre'),
    supabase.from('ordenes_trabajo').select('*', { count: 'exact', head: true }),
  ])

  const numero = generarNumeroOT((count ?? 0) + 1)

  return (
    <div className="space-y-5 max-w-2xl">
      <div className="flex items-center gap-3">
        <Link
          href="/ot"
          className="w-8 h-8 rounded-[6px] border border-[var(--border-default)] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[#d4d4d8] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-[20px] font-semibold text-[var(--text-primary)]">Nueva orden de trabajo</h1>
          <p className="text-[13px] text-[var(--text-secondary)] mt-0.5 font-mono">{numero}</p>
        </div>
      </div>

      <NuevaOTForm
        numero={numero}
        clientes={clientes ?? []}
        maquinas={maquinas ?? []}
      />
    </div>
  )
}
