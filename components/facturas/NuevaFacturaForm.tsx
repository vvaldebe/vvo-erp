'use client'

import { useState, useTransition, useEffect } from 'react'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { crearFactura } from '@/app/actions/facturas'

interface Cliente { id: string; nombre: string }
interface OT      { id: string; numero: string; total: number; cliente_id: string | null }
interface Cot     { id: string; numero: string; total: number; cliente_id: string | null }

interface Props {
  clientes:     Cliente[]
  ots:          OT[]
  cotizaciones: Cot[]
  defaultOtId?: string
  defaultCotId?: string
}

const INPUT = 'w-full px-3 py-2 text-sm border border-[var(--border-default)] rounded-[6px] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[#e91e8c]/30 focus:border-[var(--text-accent)] transition-colors bg-[var(--bg-card)]'

export default function NuevaFacturaForm({ clientes, ots, cotizaciones, defaultOtId, defaultCotId }: Props) {
  const [isPending, startTransition] = useTransition()

  const todayStr = new Date().toISOString().split('T')[0]
  const in30days  = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]

  const [clienteId,      setClienteId]      = useState('')
  const [otId,           setOtId]           = useState(defaultOtId ?? '')
  const [cotId,          setCotId]          = useState(defaultCotId ?? '')
  const [numeroSii,      setNumeroSii]      = useState('')
  const [montoNeto,      setMontoNeto]      = useState('')
  const [fechaEmision,   setFechaEmision]   = useState(todayStr)
  const [fechaVenc,      setFechaVenc]      = useState(in30days)
  const [notas,          setNotas]          = useState('')

  const neto = Number(montoNeto) || 0
  const iva  = Math.round(neto * 0.19)
  const total = neto + iva

  const otsFiltradas = clienteId
    ? ots.filter((o) => o.cliente_id === clienteId)
    : ots

  const cotsFiltradas = clienteId
    ? cotizaciones.filter((c) => c.cliente_id === clienteId)
    : cotizaciones

  // When the client is changed manually, clear OT/cot if they no longer belong to the new client
  useEffect(() => {
    if (clienteId) {
      if (otId && !ots.find((o) => o.id === otId && o.cliente_id === clienteId)) {
        setOtId('')
      }
      if (cotId && !cotizaciones.find((c) => c.id === cotId && c.cliente_id === clienteId)) {
        setCotId('')
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clienteId])

  function handleOtChange(val: string) {
    setOtId(val)
    if (val) {
      const ot = ots.find((o) => o.id === val)
      if (ot) {
        if (ot.cliente_id) setClienteId(ot.cliente_id)
        setMontoNeto(String(ot.total))
        setCotId('')
      }
    }
  }

  function handleCotChange(val: string) {
    setCotId(val)
    if (val) {
      const cot = cotizaciones.find((c) => c.id === val)
      if (cot) {
        if (cot.cliente_id) setClienteId(cot.cliente_id)
        setMontoNeto(String(cot.total))
        setOtId('')
      }
    }
  }

  function handleSubmit() {
    if (!montoNeto || neto <= 0) {
      toast.error('Ingresa el monto neto')
      return
    }
    if (!fechaEmision) {
      toast.error('Fecha de emisión requerida')
      return
    }

    startTransition(async () => {
      const result = await crearFactura({
        numero_sii:        numeroSii || null,
        cliente_id:        clienteId || null,
        ot_id:             otId || null,
        cotizacion_id:     cotId || null,
        monto_neto:        neto,
        fecha_emision:     fechaEmision,
        fecha_vencimiento: fechaVenc || null,
        notas:             notas || null,
      })
      if ('error' in result) {
        toast.error(result.error)
      }
      // on success, redirect happens server-side
    })
  }

  return (
    <div className="space-y-5">

      {/* Datos principales */}
      <div className="border border-[var(--border-default)] rounded-[8px] p-5 space-y-4">
        <p className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-[0.1em]">Datos de la factura</p>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-[12px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">N° SII (folio)</label>
            <input
              type="text"
              placeholder="Ej: 1234"
              value={numeroSii}
              onChange={(e) => setNumeroSii(e.target.value)}
              className={INPUT}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[12px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Cliente</label>
            <select value={clienteId} onChange={(e) => setClienteId(e.target.value)} className={INPUT}>
              <option value="">Sin cliente</option>
              {clientes.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-[12px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">OT de origen</label>
            <select value={otId} onChange={(e) => handleOtChange(e.target.value)} className={INPUT}>
              <option value="">Sin OT</option>
              {otsFiltradas.map((o) => <option key={o.id} value={o.id}>{o.numero}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-[12px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Cotización de origen</label>
            <select value={cotId} onChange={(e) => handleCotChange(e.target.value)} className={INPUT}>
              <option value="">Sin cotización</option>
              {cotsFiltradas.map((c) => <option key={c.id} value={c.id}>{c.numero}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-[12px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Fecha de emisión</label>
            <input type="date" value={fechaEmision} onChange={(e) => setFechaEmision(e.target.value)} className={INPUT} />
          </div>
          <div className="space-y-1.5">
            <label className="text-[12px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Fecha de vencimiento</label>
            <input type="date" value={fechaVenc} onChange={(e) => setFechaVenc(e.target.value)} className={INPUT} />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[12px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Notas</label>
          <textarea
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            rows={2}
            placeholder="Observaciones, referencia interna..."
            className={`${INPUT} resize-none`}
          />
        </div>
      </div>

      {/* Montos */}
      <div className="border border-[var(--border-default)] rounded-[8px] p-5 space-y-4">
        <p className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-[0.1em]">Montos</p>

        <div className="space-y-1.5">
          <label className="text-[12px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Monto neto (CLP)</label>
          <input
            type="number"
            min={0}
            step={1}
            placeholder="0"
            value={montoNeto}
            onChange={(e) => setMontoNeto(e.target.value)}
            className={INPUT}
          />
        </div>

        <div className="bg-[var(--bg-muted)] rounded-[6px] p-4 space-y-2">
          <div className="flex justify-between text-[13px]">
            <span className="text-[var(--text-secondary)]">Neto</span>
            <span className="text-[var(--text-primary)] tabular-nums">
              {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 }).format(neto)}
            </span>
          </div>
          <div className="flex justify-between text-[13px]">
            <span className="text-[var(--text-secondary)]">IVA 19%</span>
            <span className="text-[var(--text-primary)] tabular-nums">
              {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 }).format(iva)}
            </span>
          </div>
          <div className="flex justify-between text-[14px] font-semibold border-t border-[var(--border-default)] pt-2 mt-2">
            <span className="text-[var(--text-primary)]">Total</span>
            <span className="text-[var(--text-primary)] tabular-nums">
              {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 }).format(total)}
            </span>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isPending}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#7c3aed] hover:bg-[#6d28d9] text-white text-sm font-semibold rounded-[6px] transition-colors disabled:opacity-50"
        >
          {isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Guardando...</> : 'Registrar factura'}
        </button>
      </div>

    </div>
  )
}
