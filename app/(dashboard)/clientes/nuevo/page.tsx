import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import ClienteForm from '@/components/clientes/ClienteForm'

export default function NuevoClientePage() {
  return (
    <div className="max-w-2xl space-y-5">

      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/clientes"
          className="w-8 h-8 rounded-[6px] border border-[var(--border-default)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:border-[var(--border-default)] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl font-black text-[var(--text-primary)]">Nuevo cliente</h1>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">Completa los datos del cliente</p>
        </div>
      </div>

      <ClienteForm />
    </div>
  )
}
