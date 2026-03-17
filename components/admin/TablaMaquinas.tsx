'use client'

import { useState, useTransition } from 'react'
import { Plus, Check, X, Pencil, Printer } from 'lucide-react'
import { crearMaquina, actualizarMaquina, toggleActivaMaquina } from '@/app/actions/maquinas'

interface Maquina {
  id: string
  nombre: string
  descripcion: string | null
  activo: boolean
}

interface EditState {
  id: string | null
  nombre: string
  descripcion: string
}

const EMPTY_EDIT: EditState = { id: null, nombre: '', descripcion: '' }

interface Props {
  maquinas: Maquina[]
}

export default function TablaMaquinas({ maquinas }: Props) {
  const [editando, setEditando] = useState<EditState | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function startNew() {
    setEditando({ ...EMPTY_EDIT })
    setError(null)
  }

  function startEdit(m: Maquina) {
    setEditando({ id: m.id, nombre: m.nombre, descripcion: m.descripcion ?? '' })
    setError(null)
  }

  function cancel() {
    setEditando(null)
    setError(null)
  }

  function save() {
    if (!editando) return
    if (!editando.nombre.trim()) { setError('El nombre es requerido'); return }

    startTransition(async () => {
      const data = { nombre: editando.nombre.trim(), descripcion: editando.descripcion || null }
      const result = editando.id
        ? await actualizarMaquina(editando.id, data)
        : await crearMaquina(data)

      if ('error' in result) { setError(result.error); return }
      setEditando(null)
      setError(null)
    })
  }

  function handleToggle(id: string, activo: boolean) {
    startTransition(async () => { await toggleActivaMaquina(id, activo) })
  }

  const inputCls = 'px-2 h-8 text-[13px] bg-[var(--bg-card)] border border-[var(--border-default)] rounded-[5px] text-[var(--text-primary)] focus:outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/10 transition-colors w-full'

  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-[8px] overflow-hidden">

      <div className="px-4 h-11 border-b border-[var(--border-default)] flex items-center justify-between">
        <p className="text-[13px] text-[var(--text-secondary)]">
          {maquinas.length} máquina{maquinas.length !== 1 ? 's' : ''}
        </p>
        {!editando && (
          <button
            type="button"
            onClick={startNew}
            className="inline-flex items-center gap-1.5 px-3 h-7 bg-[#7c3aed] hover:bg-[#6d28d9] text-white text-[12px] font-medium rounded-[5px] transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Nueva máquina
          </button>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-[var(--bg-muted)] border-b border-[var(--border-default)]">
              <th className="text-left px-4 h-9 text-[11px] font-medium text-[var(--text-secondary)] uppercase tracking-wide">Nombre</th>
              <th className="text-left px-4 h-9 text-[11px] font-medium text-[var(--text-secondary)] uppercase tracking-wide">Descripción</th>
              <th className="text-center px-4 h-9 text-[11px] font-medium text-[var(--text-secondary)] uppercase tracking-wide">Activo</th>
              <th className="text-right px-4 h-9"></th>
            </tr>
          </thead>
          <tbody>
            {/* Fila nueva */}
            {editando?.id === null && (
              <tr className="border-b border-[#7c3aed]/20 bg-[#ede9fe]/20">
                <td className="px-4 py-2 w-48">
                  <input
                    type="text"
                    placeholder="Ej: Plotter Roland"
                    value={editando.nombre}
                    onChange={(e) => setEditando({ ...editando, nombre: e.target.value })}
                    className={inputCls}
                    autoFocus
                  />
                </td>
                <td className="px-4 py-2">
                  <input
                    type="text"
                    placeholder="Descripción opcional"
                    value={editando.descripcion}
                    onChange={(e) => setEditando({ ...editando, descripcion: e.target.value })}
                    className={inputCls}
                  />
                </td>
                <td className="px-4 py-2 text-center text-[var(--text-muted)] text-[11px]">—</td>
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
              </tr>
            )}

            {maquinas.length === 0 && editando?.id !== null ? (
              <tr>
                <td colSpan={4} className="px-4 py-14 text-center">
                  <div className="flex flex-col items-center gap-2 text-[var(--text-muted)]">
                    <Printer className="w-8 h-8 opacity-25" />
                    <p className="text-[13px]">No hay máquinas aún</p>
                    <p className="text-[12px] text-[var(--text-muted)]">Crea la primera con el botón de arriba</p>
                  </div>
                </td>
              </tr>
            ) : (
              maquinas.map((m) => {
                const isEditing = editando?.id === m.id
                return (
                  <tr key={m.id} className={[
                    'border-b border-[var(--border-subtle)] last:border-0 transition-colors',
                    isEditing ? 'bg-[#ede9fe]/20 border-[#7c3aed]/20' : 'hover:bg-[var(--bg-muted)] bg-[var(--bg-card)]',
                  ].join(' ')}>
                    <td className="px-4 h-11 w-48">
                      {isEditing ? (
                        <input type="text" value={editando.nombre}
                          onChange={(e) => setEditando({ ...editando, nombre: e.target.value })}
                          className={inputCls} autoFocus />
                      ) : (
                        <span className="text-[13px] font-medium text-[var(--text-primary)]">{m.nombre}</span>
                      )}
                    </td>
                    <td className="px-4 h-11">
                      {isEditing ? (
                        <input type="text" value={editando.descripcion}
                          onChange={(e) => setEditando({ ...editando, descripcion: e.target.value })}
                          className={inputCls} placeholder="Descripción opcional" />
                      ) : (
                        <span className="text-[13px] text-[var(--text-secondary)]">{m.descripcion ?? '—'}</span>
                      )}
                    </td>
                    <td className="px-4 h-11 text-center">
                      {isEditing ? (
                        <span className="text-[var(--text-muted)] text-[11px]">—</span>
                      ) : (
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" checked={m.activo}
                            onChange={(e) => handleToggle(m.id, e.target.checked)}
                            disabled={isPending} className="sr-only peer" />
                          <div className="w-8 h-4 rounded-full transition-colors peer-checked:bg-[#7c3aed] bg-[#d4d4d8] peer-disabled:opacity-60" />
                          <div className="absolute left-0.5 top-0.5 w-3 h-3 bg-[var(--bg-card)] rounded-full shadow transition-transform peer-checked:translate-x-4" />
                        </label>
                      )}
                    </td>
                    <td className="px-4 h-11 text-right">
                      {isEditing ? (
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
                      ) : (
                        <button type="button" onClick={() => startEdit(m)} disabled={!!editando}
                          className="inline-flex items-center gap-1.5 px-3 h-7 text-[12px] font-medium text-[var(--text-secondary)] border border-[var(--border-default)] rounded-[5px] hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer">
                          <Pencil className="w-3 h-3" /> Editar
                        </button>
                      )}
                    </td>
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
