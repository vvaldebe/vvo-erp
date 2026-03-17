'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { registrarPago } from '@/app/actions/facturas'
import { useRouter } from 'next/navigation'

interface Props {
  facturaId: string
  pendiente: number
}

const INPUT = 'w-full px-3 py-2 text-sm border border-[var(--border-default)] rounded-[6px] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[#e91e8c]/30 focus:border-[var(--text-accent)] transition-colors bg-[var(--bg-card)]'

export default function RegistrarPagoForm({ facturaId, pendiente }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const todayStr = new Date().toISOString().split('T')[0]

  const [monto,  setMonto]  = useState(String(pendiente))
  const [fecha,  setFecha]  = useState(todayStr)
  const [metodo, setMetodo] = useState<'transferencia' | 'efectivo' | 'cheque' | 'tarjeta'>('transferencia')
  const [notas,  setNotas]  = useState('')

  function handleSubmit() {
    const montoNum = Number(monto)
    if (!montoNum || montoNum <= 0) {
      toast.error('El monto debe ser mayor a 0')
      return
    }

    startTransition(async () => {
      const result = await registrarPago(facturaId, {
        monto:  montoNum,
        fecha,
        metodo,
        notas: notas || null,
      })
      if ('error' in result) {
        toast.error(result.error)
      } else {
        toast.success('Pago registrado')
        setMonto(String(pendiente))
        setNotas('')
        router.refresh()
      }
    })
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-[12px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Monto (CLP)</label>
          <input
            type="number"
            min={1}
            step={1}
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
            className={INPUT}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-[12px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Fecha</label>
          <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className={INPUT} />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-[12px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Método</label>
        <select value={metodo} onChange={(e) => setMetodo(e.target.value as typeof metodo)} className={INPUT}>
          <option value="transferencia">Transferencia</option>
          <option value="efectivo">Efectivo</option>
          <option value="cheque">Cheque</option>
          <option value="tarjeta">Tarjeta</option>
        </select>
      </div>

      <div className="space-y-1.5">
        <label className="text-[12px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Notas (opcional)</label>
        <input
          type="text"
          placeholder="Referencia, comprobante..."
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
          className={INPUT}
        />
      </div>

      <button
        type="button"
        onClick={handleSubmit}
        disabled={isPending}
        className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#7c3aed] hover:bg-[#6d28d9] text-white text-sm font-semibold rounded-[6px] transition-colors disabled:opacity-50"
      >
        {isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Registrando...</> : 'Registrar pago'}
      </button>
    </div>
  )
}
