'use client'

import { useState, useTransition } from 'react'
import { Plus, Check, X, Pencil, Timer } from 'lucide-react'
import { crearServicio, actualizarServicio, toggleActivoServicio } from '@/app/actions/serviciosMaquina'

type Tipo = 'laser' | 'cnc' | 'plotter_corte' | 'plotter_impresion' | 'laminadora' | 'otro'

interface ServicioMaquina {
  id: string
  nombre: string
  tipo: Tipo
  precio_minuto_normal: number
  precio_minuto_empresa: number
  precio_minuto_agencia: number
  minimo_minutos: number
  descripcion: string | null
  activo: boolean
}

interface EditState {
  id: string | null
  nombre: string
  tipo: Tipo | ''
  precio_minuto_normal: string
  precio_minuto_empresa: string
  precio_minuto_agencia: string
  minimo_minutos: string
  descripcion: string
}

const EMPTY_EDIT: EditState = {
  id: null,
  nombre: '',
  tipo: '',
  precio_minuto_normal: '0',
  precio_minuto_empresa: '0',
  precio_minuto_agencia: '0',
  minimo_minutos: '1',
  descripcion: '',
}

const TIPO_LABELS: Record<Tipo, string> = {
  laser:              'Láser',
  cnc:                'CNC',
  plotter_corte:      'Plotter corte',
  plotter_impresion:  'Plotter impresión',
  laminadora:         'Laminadora',
  otro:               'Otro',
}

const CLP = new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'CLP',
  minimumFractionDigits: 0,
})

interface Props {
  servicios: ServicioMaquina[]
}

export default function TablaServiciosMaquina({ servicios }: Props) {
  const [editando, setEditando] = useState<EditState | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function startNew() {
    setEditando({ ...EMPTY_EDIT })
    setError(null)
  }

  function startEdit(s: ServicioMaquina) {
    setEditando({
      id:                    s.id,
      nombre:                s.nombre,
      tipo:                  s.tipo,
      precio_minuto_normal:  String(s.precio_minuto_normal),
      precio_minuto_empresa: String(s.precio_minuto_empresa),
      precio_minuto_agencia: String(s.precio_minuto_agencia),
      minimo_minutos:        String(s.minimo_minutos),
      descripcion:           s.descripcion ?? '',
    })
    setError(null)
  }

  function cancel() {
    setEditando(null)
    setError(null)
  }

  function save() {
    if (!editando) return
    if (!editando.nombre.trim()) { setError('El nombre es requerido'); return }
    if (!editando.tipo)           { setError('El tipo es requerido'); return }

    const precioNormal  = parseFloat(editando.precio_minuto_normal)
    const precioEmpresa = parseFloat(editando.precio_minuto_empresa)
    const precioAgencia = parseFloat(editando.precio_minuto_agencia)
    const minMinutos    = parseInt(editando.minimo_minutos, 10)

    if (isNaN(precioNormal)  || precioNormal  < 0) { setError('$/min Normal debe ser mayor o igual a 0');   return }
    if (isNaN(precioEmpresa) || precioEmpresa < 0) { setError('$/min Empresa debe ser mayor o igual a 0');  return }
    if (isNaN(precioAgencia) || precioAgencia < 0) { setError('$/min Agencia debe ser mayor o igual a 0');  return }
    if (isNaN(minMinutos)    || minMinutos    < 1) { setError('El mínimo de minutos debe ser al menos 1');  return }

    startTransition(async () => {
      const data = {
        nombre:                editando.nombre.trim(),
        tipo:                  editando.tipo as Tipo,
        precio_minuto_normal:  precioNormal,
        precio_minuto_empresa: precioEmpresa,
        precio_minuto_agencia: precioAgencia,
        minimo_minutos:        minMinutos,
        descripcion:           editando.descripcion || null,
      }
      const result = editando.id
        ? await actualizarServicio(editando.id, data)
        : await crearServicio(data)

      if ('error' in result) { setError(result.error); return }
      setEditando(null)
      setError(null)
    })
  }

  function handleToggle(id: string, activo: boolean) {
    startTransition(async () => { await toggleActivoServicio(id, activo) })
  }

  const inputCls   = 'px-2 h-8 text-[13px] bg-[var(--bg-card)] border border-[var(--border-default)] rounded-[5px] text-[var(--text-primary)] focus:outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/10 transition-colors w-full'
  const selectCls  = inputCls + ' cursor-pointer'
  const numberCls  = inputCls + ' text-right'

  function EditRows({ row }: { row: EditState }) {
    return (
      <>
        {/* Fila 1: nombre, tipo, precios, mínimo, activo placeholder, acciones */}
        <td className="px-4 py-2 min-w-[180px]">
          <input
            type="text"
            placeholder="Ej: Corte láser acrílico"
            value={row.nombre}
            onChange={(e) => setEditando({ ...row, nombre: e.target.value })}
            className={inputCls}
            autoFocus={row.id === null}
          />
        </td>
        <td className="px-4 py-2 w-36">
          <select
            value={row.tipo}
            onChange={(e) => setEditando({ ...row, tipo: e.target.value as Tipo | '' })}
            className={selectCls}
          >
            <option value="">— Tipo —</option>
            <option value="laser">Láser</option>
            <option value="cnc">CNC</option>
            <option value="plotter_corte">Plotter corte</option>
            <option value="plotter_impresion">Plotter impresión</option>
            <option value="laminadora">Laminadora</option>
            <option value="otro">Otro</option>
          </select>
        </td>
        <td className="px-4 py-2 w-28">
          <input
            type="number"
            min={0}
            step={1}
            value={row.precio_minuto_normal}
            onChange={(e) => setEditando({ ...row, precio_minuto_normal: e.target.value })}
            className={numberCls}
            placeholder="0"
          />
        </td>
        <td className="px-4 py-2 w-28">
          <input
            type="number"
            min={0}
            step={1}
            value={row.precio_minuto_empresa}
            onChange={(e) => setEditando({ ...row, precio_minuto_empresa: e.target.value })}
            className={numberCls}
            placeholder="0"
          />
        </td>
        <td className="px-4 py-2 w-28">
          <input
            type="number"
            min={0}
            step={1}
            value={row.precio_minuto_agencia}
            onChange={(e) => setEditando({ ...row, precio_minuto_agencia: e.target.value })}
            className={numberCls}
            placeholder="0"
          />
        </td>
        <td className="px-4 py-2 w-20">
          <input
            type="number"
            min={1}
            step={1}
            value={row.minimo_minutos}
            onChange={(e) => setEditando({ ...row, minimo_minutos: e.target.value })}
            className={numberCls}
            placeholder="1"
          />
        </td>
        {/* Activo placeholder during edit */}
        <td className="px-4 py-2 text-center text-[var(--text-muted)] text-[11px]">—</td>
        {/* Acciones */}
        <td className="px-4 py-2 text-right">
          <div className="flex items-center justify-end gap-2">
            {error && <span className="text-[11px] text-[#dc2626] mr-1">{error}</span>}
            <button type="button" onClick={save} disabled={isPending}
              className="inline-flex items-center gap-1 px-3 h-7 text-[12px] font-medium text-white bg-[#7c3aed] rounded-[5px] hover:bg-[#6d28d9] transition-colors disabled:opacity-60 cursor-pointer">
              <Check className="w-3 h-3" /> Guardar
            </button>
            <button type="button" onClick={cancel}
              className="inline-flex items-center gap-1 px-3 h-7 text-[12px] font-medium text-[var(--text-secondary)] border border-[var(--border-default)] rounded-[5px] hover:bg-[var(--bg-muted)] transition-colors cursor-pointer">
              <X className="w-3 h-3" /> Cancelar
            </button>
          </div>
        </td>
      </>
    )
  }

  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-[8px] overflow-hidden">

      <div className="px-4 h-11 border-b border-[var(--border-default)] flex items-center justify-between">
        <p className="text-[13px] text-[var(--text-secondary)]">
          {servicios.length} servicio{servicios.length !== 1 ? 's' : ''}
        </p>
        {!editando && (
          <button
            type="button"
            onClick={startNew}
            className="inline-flex items-center gap-1.5 px-3 h-7 bg-[#7c3aed] hover:bg-[#6d28d9] text-white text-[12px] font-medium rounded-[5px] transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Nuevo servicio
          </button>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-[var(--bg-muted)] border-b border-[var(--border-default)]">
              <th className="text-left px-4 h-9 text-[11px] font-medium text-[var(--text-secondary)] uppercase tracking-wide">Nombre</th>
              <th className="text-left px-4 h-9 text-[11px] font-medium text-[var(--text-secondary)] uppercase tracking-wide">Tipo</th>
              <th className="text-right px-4 h-9 text-[11px] font-medium text-[var(--text-secondary)] uppercase tracking-wide">$/min Normal</th>
              <th className="text-right px-4 h-9 text-[11px] font-medium text-[var(--text-secondary)] uppercase tracking-wide">$/min Empresa</th>
              <th className="text-right px-4 h-9 text-[11px] font-medium text-[var(--text-secondary)] uppercase tracking-wide">$/min Agencia</th>
              <th className="text-right px-4 h-9 text-[11px] font-medium text-[var(--text-secondary)] uppercase tracking-wide w-20">Mín. min.</th>
              <th className="text-center px-4 h-9 text-[11px] font-medium text-[var(--text-secondary)] uppercase tracking-wide">Activo</th>
              <th className="text-right px-4 h-9"></th>
            </tr>
          </thead>
          <tbody>
            {/* Fila nueva */}
            {editando?.id === null && (
              <tr className="border-b border-[#7c3aed]/20 bg-[#ede9fe]/20">
                <EditRows row={editando} />
              </tr>
            )}

            {servicios.length === 0 && editando?.id !== null ? (
              <tr>
                <td colSpan={8} className="px-4 py-14 text-center">
                  <div className="flex flex-col items-center gap-2 text-[var(--text-muted)]">
                    <Timer className="w-8 h-8 opacity-25" />
                    <p className="text-[13px]">No hay servicios aún</p>
                    <p className="text-[12px] text-[var(--text-muted)]">Crea el primero con el botón de arriba</p>
                  </div>
                </td>
              </tr>
            ) : (
              servicios.map((s) => {
                const isEditing = editando?.id === s.id
                return (
                  <tr key={s.id} className={[
                    'border-b border-[var(--border-subtle)] last:border-0 transition-colors',
                    isEditing ? 'bg-[#ede9fe]/20 border-[#7c3aed]/20' : 'hover:bg-[var(--bg-muted)] bg-[var(--bg-card)]',
                  ].join(' ')}>
                    {isEditing && editando ? (
                      <EditRows row={editando} />
                    ) : (
                      <>
                        <td className="px-4 h-11">
                          <span className="text-[13px] font-medium text-[var(--text-primary)]">{s.nombre}</span>
                        </td>
                        <td className="px-4 h-11">
                          <span className="text-[13px] text-[var(--text-secondary)]">
                            {TIPO_LABELS[s.tipo] ?? s.tipo}
                          </span>
                        </td>
                        <td className="px-4 h-11 text-right">
                          <span className="text-[13px] text-[var(--text-primary)] font-mono">
                            {CLP.format(s.precio_minuto_normal)}
                          </span>
                        </td>
                        <td className="px-4 h-11 text-right">
                          <span className="text-[13px] text-[var(--text-primary)] font-mono">
                            {CLP.format(s.precio_minuto_empresa)}
                          </span>
                        </td>
                        <td className="px-4 h-11 text-right">
                          <span className="text-[13px] text-[var(--text-primary)] font-mono">
                            {CLP.format(s.precio_minuto_agencia)}
                          </span>
                        </td>
                        <td className="px-4 h-11 text-right">
                          <span className="text-[13px] text-[var(--text-secondary)] font-mono">
                            {s.minimo_minutos}
                          </span>
                        </td>
                        <td className="px-4 h-11 text-center">
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" checked={s.activo}
                              onChange={(e) => handleToggle(s.id, e.target.checked)}
                              disabled={isPending} className="sr-only peer" />
                            <div className="w-8 h-4 rounded-full transition-colors peer-checked:bg-[#7c3aed] bg-[#d4d4d8] peer-disabled:opacity-60" />
                            <div className="absolute left-0.5 top-0.5 w-3 h-3 bg-[var(--bg-card)] rounded-full shadow transition-transform peer-checked:translate-x-4" />
                          </label>
                        </td>
                        <td className="px-4 h-11 text-right">
                          <button type="button" onClick={() => startEdit(s)} disabled={!!editando}
                            className="inline-flex items-center gap-1.5 px-3 h-7 text-[12px] font-medium text-[var(--text-secondary)] border border-[var(--border-default)] rounded-[5px] hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer">
                            <Pencil className="w-3 h-3" /> Editar
                          </button>
                        </td>
                      </>
                    )}
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
