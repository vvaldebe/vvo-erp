'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2, Plus, X } from 'lucide-react'
import { generarNumeroOT } from '@/lib/utils/numeracion'

interface Cliente  { id: string; nombre: string }
interface Maquina  { id: string; nombre: string }

interface Props {
  numero:   string
  clientes: Cliente[]
  maquinas: Maquina[]
}

interface ItemLocal {
  descripcion: string
  cantidad:    number
  ancho:       number | null
  alto:        number | null
  precio:      number
}

const INPUT = 'w-full px-3 py-2 text-sm border border-[var(--border-default)] rounded-[6px] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[#e91e8c]/30 focus:border-[var(--text-accent)] transition-colors bg-[var(--bg-card)]'

export default function NuevaOTForm({ numero, clientes, maquinas }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [clienteId,    setClienteId]    = useState('')
  const [clienteQ,     setClienteQ]     = useState('')
  const [clienteDrop,  setClienteDrop]  = useState(false)
  const [maquinaId,    setMaquinaId]    = useState('')
  const [fechaEntrega, setFechaEntrega] = useState('')
  const [notas,        setNotas]        = useState('')
  const [items,        setItems]        = useState<ItemLocal[]>([
    { descripcion: '', cantidad: 1, ancho: null, alto: null, precio: 0 },
  ])

  const clientesFiltrados = clientes
    .filter((c) => c.nombre.toLowerCase().includes(clienteQ.toLowerCase()))
    .slice(0, 30)

  const clienteNombre = clientes.find((c) => c.id === clienteId)?.nombre ?? ''

  const total = items.reduce((acc, item) => {
    const sub = item.ancho != null && item.alto != null
      ? item.precio * item.ancho * item.alto * item.cantidad
      : item.precio * item.cantidad
    return acc + sub
  }, 0)

  function updateItem(i: number, field: keyof ItemLocal, value: string | number | null) {
    setItems((prev) => prev.map((it, idx) => idx === i ? { ...it, [field]: value } : it))
  }

  function addItem() {
    setItems((prev) => [...prev, { descripcion: '', cantidad: 1, ancho: null, alto: null, precio: 0 }])
  }

  function removeItem(i: number) {
    setItems((prev) => prev.filter((_, idx) => idx !== i))
  }

  function handleSubmit() {
    if (!items.some((i) => i.descripcion.trim())) {
      toast.error('Agrega al menos un ítem con descripción')
      return
    }

    startTransition(async () => {
      const res = await fetch('/api/ot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          numero,
          cliente_id:    clienteId || null,
          maquina_id:    maquinaId || null,
          fecha_entrega: fechaEntrega || null,
          notas_produccion: notas || null,
          total:         Math.round(total),
          subtotal:      Math.round(total),
          items:         items.filter((i) => i.descripcion.trim()),
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        toast.error(json.error ?? 'Error al crear OT')
      } else {
        toast.success('OT creada')
        router.push(`/ot/${json.id}`)
      }
    })
  }

  return (
    <div className="space-y-5">

      {/* Datos generales */}
      <div className="border border-[var(--border-default)] rounded-[8px] p-5 space-y-4">
        <p className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-[0.1em]">Datos generales</p>

        {/* Cliente */}
        <div className="space-y-1.5">
          <label className="text-[12px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Cliente</label>
          {clienteId ? (
            <div className="flex items-center gap-2 px-3 py-2 rounded-[6px] border border-[var(--text-accent)]/30 bg-pink-50 h-10">
              <span className="text-sm font-medium text-[var(--text-primary)] flex-1 truncate">{clienteNombre}</span>
              <button type="button" onClick={() => { setClienteId(''); setClienteQ('') }} className="text-[var(--text-muted)] hover:text-[var(--text-secondary)]">
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="relative">
              <input
                type="text"
                placeholder="Buscar cliente..."
                value={clienteQ}
                onChange={(e) => { setClienteQ(e.target.value); setClienteDrop(true) }}
                onFocus={() => setClienteDrop(true)}
                onBlur={() => setTimeout(() => setClienteDrop(false), 150)}
                className={INPUT}
              />
              {clienteDrop && (
                <div className="absolute z-20 left-0 right-0 top-11 bg-[var(--bg-card)] border border-[var(--border-default)] rounded-[6px] shadow-lg max-h-48 overflow-y-auto">
                  {clientesFiltrados.length > 0 ? clientesFiltrados.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onMouseDown={() => { setClienteId(c.id); setClienteQ(''); setClienteDrop(false) }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-[#fdf4f9] hover:text-[var(--text-accent)] transition-colors"
                    >
                      {c.nombre}
                    </button>
                  )) : (
                    <p className="px-3 py-2 text-sm text-[var(--text-muted)]">Sin resultados</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Máquina */}
          <div className="space-y-1.5">
            <label className="text-[12px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Máquina</label>
            <select value={maquinaId} onChange={(e) => setMaquinaId(e.target.value)} className={INPUT}>
              <option value="">Sin asignar</option>
              {maquinas.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
            </select>
          </div>

          {/* Fecha entrega */}
          <div className="space-y-1.5">
            <label className="text-[12px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Fecha de entrega</label>
            <input type="date" value={fechaEntrega} onChange={(e) => setFechaEntrega(e.target.value)} className={INPUT} />
          </div>
        </div>

        {/* Notas */}
        <div className="space-y-1.5">
          <label className="text-[12px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Notas de producción</label>
          <textarea
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            rows={3}
            placeholder="Instrucciones, materiales especiales..."
            className={`${INPUT} resize-none`}
          />
        </div>
      </div>

      {/* Ítems */}
      <div className="border border-[var(--border-default)] rounded-[8px] overflow-hidden">
        <div className="px-5 py-3 border-b border-[var(--border-default)] bg-[var(--bg-muted)]">
          <p className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-[0.1em]">Trabajos</p>
        </div>

        <div className="divide-y divide-[var(--border-subtle)]">
          {items.map((item, i) => (
            <div key={i} className="p-4 space-y-3">
              <div className="flex items-start gap-3">
                <input
                  type="text"
                  placeholder="Descripción del trabajo"
                  value={item.descripcion}
                  onChange={(e) => updateItem(i, 'descripcion', e.target.value)}
                  className={`${INPUT} flex-1`}
                />
                <button
                  type="button"
                  onClick={() => removeItem(i)}
                  className="mt-0.5 p-1.5 text-[var(--text-faint)] hover:text-red-400 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-4 gap-2">
                <div className="space-y-1">
                  <label className="text-[11px] text-[var(--text-muted)] font-medium uppercase tracking-wide">Ancho (m)</label>
                  <input
                    type="number" step="0.01" min={0}
                    value={item.ancho ?? ''}
                    onChange={(e) => updateItem(i, 'ancho', e.target.value ? Number(e.target.value) : null)}
                    placeholder="0.00"
                    className={INPUT}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] text-[var(--text-muted)] font-medium uppercase tracking-wide">Alto (m)</label>
                  <input
                    type="number" step="0.01" min={0}
                    value={item.alto ?? ''}
                    onChange={(e) => updateItem(i, 'alto', e.target.value ? Number(e.target.value) : null)}
                    placeholder="0.00"
                    className={INPUT}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] text-[var(--text-muted)] font-medium uppercase tracking-wide">Cant.</label>
                  <input
                    type="number" min={1} step={1}
                    value={item.cantidad}
                    onChange={(e) => updateItem(i, 'cantidad', Number(e.target.value) || 1)}
                    className={INPUT}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] text-[var(--text-muted)] font-medium uppercase tracking-wide">Precio/u</label>
                  <input
                    type="number" min={0} step={1}
                    value={item.precio}
                    onChange={(e) => updateItem(i, 'precio', Number(e.target.value) || 0)}
                    className={INPUT}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="px-4 py-3 border-t border-[var(--border-subtle)]">
          <button
            type="button"
            onClick={addItem}
            className="flex items-center gap-1.5 text-sm text-[var(--text-muted)] hover:text-[var(--text-accent)] transition-colors"
          >
            <Plus className="w-4 h-4" />
            Agregar ítem
          </button>
        </div>
      </div>

      {/* Total + botón */}
      <div className="flex items-center justify-between">
        <div className="text-[14px] text-[var(--text-secondary)]">
          Total estimado:{' '}
          <span className="font-semibold text-[var(--text-primary)] tabular-nums">
            {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 }).format(Math.round(total))}
          </span>
        </div>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isPending}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#7c3aed] hover:bg-[#6d28d9] text-white text-sm font-semibold rounded-[6px] transition-colors disabled:opacity-50"
        >
          {isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Creando...</> : 'Crear OT'}
        </button>
      </div>

    </div>
  )
}
