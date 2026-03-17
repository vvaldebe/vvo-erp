'use client'

import { useState, useTransition } from 'react'
import { Plus, Check, X, Pencil, Package } from 'lucide-react'
import { crearMaterial, actualizarMaterial, toggleActivoMaterial } from '@/app/actions/materiales'

type Tipo = 'tela' | 'rigido' | 'adhesivo' | 'papel' | 'cnc_laser' | 'otro'
type Unidad = 'm2' | 'ml' | 'unidad'

interface Material {
  id: string
  nombre: string
  tipo: Tipo | null
  costo_m2: number
  unidad: Unidad
  activo: boolean
}

interface EditState {
  id: string | null
  nombre: string
  tipo: Tipo | ''
  costo_m2: string
  unidad: Unidad
}

const EMPTY_EDIT: EditState = { id: null, nombre: '', tipo: '', costo_m2: '0', unidad: 'm2' }

const TIPO_LABELS: Record<Tipo, string> = {
  tela:      'Tela',
  rigido:    'Rígido',
  adhesivo:  'Adhesivo',
  papel:     'Papel',
  cnc_laser: 'CNC / Láser',
  otro:      'Otro',
}

const UNIDAD_LABELS: Record<Unidad, string> = {
  m2:     'm²',
  ml:     'ml',
  unidad: 'unidad',
}

const CLP = new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'CLP',
  minimumFractionDigits: 0,
})

interface Props {
  materiales: Material[]
}

export default function TablaMateriales({ materiales }: Props) {
  const [editando, setEditando] = useState<EditState | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function startNew() {
    setEditando({ ...EMPTY_EDIT })
    setError(null)
  }

  function startEdit(m: Material) {
    setEditando({
      id:       m.id,
      nombre:   m.nombre,
      tipo:     m.tipo ?? '',
      costo_m2: String(m.costo_m2),
      unidad:   m.unidad,
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

    const costo = parseFloat(editando.costo_m2)
    if (isNaN(costo) || costo < 0) { setError('El costo debe ser un número mayor o igual a 0'); return }

    startTransition(async () => {
      const data = {
        nombre:   editando.nombre.trim(),
        tipo:     (editando.tipo || null) as Tipo | null,
        costo_m2: costo,
        unidad:   editando.unidad,
      }
      const result = editando.id
        ? await actualizarMaterial(editando.id, data)
        : await crearMaterial(data)

      if ('error' in result) { setError(result.error); return }
      setEditando(null)
      setError(null)
    })
  }

  function handleToggle(id: string, activo: boolean) {
    startTransition(async () => { await toggleActivoMaterial(id, activo) })
  }

  const inputCls = 'px-2 h-8 text-[13px] bg-[var(--bg-card)] border border-[var(--border-default)] rounded-[5px] text-[var(--text-primary)] focus:outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/10 transition-colors w-full'
  const selectCls = inputCls + ' cursor-pointer'

  function EditRow({ row }: { row: EditState }) {
    return (
      <>
        {/* Nombre */}
        <td className="px-4 py-2 min-w-[180px]">
          <input
            type="text"
            placeholder="Ej: Trovicel 5mm"
            value={row.nombre}
            onChange={(e) => setEditando({ ...row, nombre: e.target.value })}
            className={inputCls}
            autoFocus={row.id === null}
          />
        </td>
        {/* Tipo */}
        <td className="px-4 py-2 w-36">
          <select
            value={row.tipo}
            onChange={(e) => setEditando({ ...row, tipo: e.target.value as Tipo | '' })}
            className={selectCls}
          >
            <option value="">— Sin tipo —</option>
            <option value="tela">Tela</option>
            <option value="rigido">Rígido</option>
            <option value="adhesivo">Adhesivo</option>
            <option value="papel">Papel</option>
            <option value="cnc_laser">CNC / Láser</option>
            <option value="otro">Otro</option>
          </select>
        </td>
        {/* Costo/m² */}
        <td className="px-4 py-2 w-36">
          <input
            type="number"
            min={0}
            step={1}
            value={row.costo_m2}
            onChange={(e) => setEditando({ ...row, costo_m2: e.target.value })}
            className={inputCls + ' text-right'}
            placeholder="0"
          />
        </td>
        {/* Unidad */}
        <td className="px-4 py-2 w-28">
          <select
            value={row.unidad}
            onChange={(e) => setEditando({ ...row, unidad: e.target.value as Unidad })}
            className={selectCls}
          >
            <option value="m2">m²</option>
            <option value="ml">ml</option>
            <option value="unidad">unidad</option>
          </select>
        </td>
        {/* Activo (placeholder) */}
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
          {materiales.length} material{materiales.length !== 1 ? 'es' : ''}
        </p>
        {!editando && (
          <button
            type="button"
            onClick={startNew}
            className="inline-flex items-center gap-1.5 px-3 h-7 bg-[#7c3aed] hover:bg-[#6d28d9] text-white text-[12px] font-medium rounded-[5px] transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Nuevo material
          </button>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-[var(--bg-muted)] border-b border-[var(--border-default)]">
              <th className="text-left px-4 h-9 text-[11px] font-medium text-[var(--text-secondary)] uppercase tracking-wide">Nombre</th>
              <th className="text-left px-4 h-9 text-[11px] font-medium text-[var(--text-secondary)] uppercase tracking-wide">Tipo</th>
              <th className="text-right px-4 h-9 text-[11px] font-medium text-[var(--text-secondary)] uppercase tracking-wide">Costo/m²</th>
              <th className="text-left px-4 h-9 text-[11px] font-medium text-[var(--text-secondary)] uppercase tracking-wide">Unidad</th>
              <th className="text-center px-4 h-9 text-[11px] font-medium text-[var(--text-secondary)] uppercase tracking-wide">Activo</th>
              <th className="text-right px-4 h-9"></th>
            </tr>
          </thead>
          <tbody>
            {/* Fila nueva */}
            {editando?.id === null && (
              <tr className="border-b border-[#7c3aed]/20 bg-[#ede9fe]/20">
                <EditRow row={editando} />
              </tr>
            )}

            {materiales.length === 0 && editando?.id !== null ? (
              <tr>
                <td colSpan={6} className="px-4 py-14 text-center">
                  <div className="flex flex-col items-center gap-2 text-[var(--text-muted)]">
                    <Package className="w-8 h-8 opacity-25" />
                    <p className="text-[13px]">No hay materiales aún</p>
                    <p className="text-[12px] text-[var(--text-muted)]">Crea el primero con el botón de arriba</p>
                  </div>
                </td>
              </tr>
            ) : (
              materiales.map((m) => {
                const isEditing = editando?.id === m.id
                return (
                  <tr key={m.id} className={[
                    'border-b border-[var(--border-subtle)] last:border-0 transition-colors',
                    isEditing ? 'bg-[#ede9fe]/20 border-[#7c3aed]/20' : 'hover:bg-[var(--bg-muted)] bg-[var(--bg-card)]',
                  ].join(' ')}>
                    {isEditing && editando ? (
                      <EditRow row={editando} />
                    ) : (
                      <>
                        <td className="px-4 h-11">
                          <span className="text-[13px] font-medium text-[var(--text-primary)]">{m.nombre}</span>
                        </td>
                        <td className="px-4 h-11">
                          <span className="text-[13px] text-[var(--text-secondary)]">
                            {m.tipo ? TIPO_LABELS[m.tipo] : '—'}
                          </span>
                        </td>
                        <td className="px-4 h-11 text-right">
                          <span className="text-[13px] text-[var(--text-primary)] font-mono">
                            {CLP.format(m.costo_m2)}
                          </span>
                        </td>
                        <td className="px-4 h-11">
                          <span className="text-[13px] text-[var(--text-secondary)]">{UNIDAD_LABELS[m.unidad]}</span>
                        </td>
                        <td className="px-4 h-11 text-center">
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" checked={m.activo}
                              onChange={(e) => handleToggle(m.id, e.target.checked)}
                              disabled={isPending} className="sr-only peer" />
                            <div className="w-8 h-4 rounded-full transition-colors peer-checked:bg-[#7c3aed] bg-[#d4d4d8] peer-disabled:opacity-60" />
                            <div className="absolute left-0.5 top-0.5 w-3 h-3 bg-[var(--bg-card)] rounded-full shadow transition-transform peer-checked:translate-x-4" />
                          </label>
                        </td>
                        <td className="px-4 h-11 text-right">
                          <button type="button" onClick={() => startEdit(m)} disabled={!!editando}
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
