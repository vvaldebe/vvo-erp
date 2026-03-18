'use client'

import { useState, useTransition } from 'react'
import { Plus, Pencil, Trash2, X, Loader2, ChevronDown, ChevronUp } from 'lucide-react'
import {
  crearPlantilla,
  actualizarPlantilla,
  eliminarPlantilla,
  type Plantilla,
  type PlantillaFormData,
} from '@/app/actions/plantillas'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface ProductoOption {
  id:     string
  nombre: string
}

interface PlantillaItemForm {
  producto_id: string | null
  descripcion: string
  ancho:       number | null
  alto:        number | null
  cantidad:    number
  orden:       number
}

interface Props {
  plantillas: Plantilla[]
  productos:  ProductoOption[]
}

function emptyItem(orden: number): PlantillaItemForm {
  return { producto_id: null, descripcion: '', ancho: null, alto: null, cantidad: 1, orden }
}

function PlantillaForm({
  initial,
  productos,
  onSave,
  onCancel,
}: {
  initial?: Plantilla
  productos: ProductoOption[]
  onSave: (data: PlantillaFormData) => Promise<void>
  onCancel: () => void
}) {
  const [nombre, setNombre]         = useState(initial?.nombre ?? '')
  const [descripcion, setDesc]      = useState(initial?.descripcion ?? '')
  const [items, setItems]           = useState<PlantillaItemForm[]>(
    initial?.items.map((i) => ({
      producto_id: i.producto_id,
      descripcion: i.descripcion ?? '',
      ancho:       i.ancho,
      alto:        i.alto,
      cantidad:    i.cantidad,
      orden:       i.orden,
    })) ?? [emptyItem(0)]
  )
  const [error, setError]           = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function addItem() {
    setItems((prev) => [...prev, emptyItem(prev.length)])
  }

  function removeItem(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx).map((item, i) => ({ ...item, orden: i })))
  }

  function updateItem(idx: number, field: keyof PlantillaItemForm, value: string | number | null) {
    setItems((prev) => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!nombre.trim()) { setError('El nombre es requerido'); return }

    startTransition(async () => {
      await onSave({
        nombre:      nombre.trim(),
        descripcion: descripcion.trim() || null,
        items:       items.map((item, idx) => ({
          producto_id: item.producto_id || null,
          descripcion: item.descripcion.trim() || null,
          ancho:       item.ancho,
          alto:        item.alto,
          cantidad:    item.cantidad,
          orden:       idx,
        })),
      })
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-[12px] font-medium text-[var(--text-secondary)]">Nombre *</Label>
          <Input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej: Letrero trovicel"
            className="h-8 text-[13px] border-[var(--border-input)] bg-[var(--bg-input)] text-[var(--text-primary)] rounded-[6px]"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-[12px] font-medium text-[var(--text-secondary)]">Descripción</Label>
          <Input
            value={descripcion}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="Descripción breve..."
            className="h-8 text-[13px] border-[var(--border-input)] bg-[var(--bg-input)] text-[var(--text-primary)] rounded-[6px]"
          />
        </div>
      </div>

      {/* Items */}
      <div className="space-y-2">
        <p className="text-[12px] font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Ítems</p>
        {items.map((item, idx) => (
          <div key={idx} className="border border-[var(--border-default)] rounded-[6px] p-3 space-y-2 bg-[var(--bg-muted)]">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-medium text-[var(--text-muted)]">Ítem {idx + 1}</p>
              <button
                type="button"
                onClick={() => removeItem(idx)}
                className="text-[var(--text-muted)] hover:text-red-400 transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <Label className="text-[11px] text-[var(--text-muted)]">Producto</Label>
                <select
                  value={item.producto_id ?? ''}
                  onChange={(e) => updateItem(idx, 'producto_id', e.target.value || null)}
                  className="w-full h-7 text-[12px] rounded-[5px] border border-[var(--border-input)] bg-[var(--bg-input)] text-[var(--text-primary)] px-2 mt-0.5"
                >
                  <option value="">— Sin producto —</option>
                  {productos.map((p) => (
                    <option key={p.id} value={p.id}>{p.nombre}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="text-[11px] text-[var(--text-muted)]">Descripción libre</Label>
                <Input
                  value={item.descripcion}
                  onChange={(e) => updateItem(idx, 'descripcion', e.target.value)}
                  placeholder="Descripción..."
                  className="h-7 text-[12px] border-[var(--border-input)] bg-[var(--bg-input)] text-[var(--text-primary)] rounded-[5px] mt-0.5"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label className="text-[11px] text-[var(--text-muted)]">Ancho (m)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min={0}
                  value={item.ancho ?? ''}
                  onChange={(e) => updateItem(idx, 'ancho', e.target.value ? parseFloat(e.target.value) : null)}
                  placeholder="0.00"
                  className="h-7 text-[12px] border-[var(--border-input)] bg-[var(--bg-input)] text-[var(--text-primary)] rounded-[5px] mt-0.5"
                />
              </div>
              <div>
                <Label className="text-[11px] text-[var(--text-muted)]">Alto (m)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min={0}
                  value={item.alto ?? ''}
                  onChange={(e) => updateItem(idx, 'alto', e.target.value ? parseFloat(e.target.value) : null)}
                  placeholder="0.00"
                  className="h-7 text-[12px] border-[var(--border-input)] bg-[var(--bg-input)] text-[var(--text-primary)] rounded-[5px] mt-0.5"
                />
              </div>
              <div>
                <Label className="text-[11px] text-[var(--text-muted)]">Cantidad</Label>
                <Input
                  type="number"
                  min={1}
                  value={item.cantidad}
                  onChange={(e) => updateItem(idx, 'cantidad', parseInt(e.target.value, 10) || 1)}
                  className="h-7 text-[12px] border-[var(--border-input)] bg-[var(--bg-input)] text-[var(--text-primary)] rounded-[5px] mt-0.5"
                />
              </div>
            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={addItem}
          className="w-full py-2 border border-dashed border-[var(--border-default)] rounded-[6px] text-[12px] text-[var(--text-muted)] hover:border-[#7c3aed]/40 hover:text-[#7c3aed] transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          Agregar ítem
        </button>
      </div>

      {error && (
        <p className="text-[12px] text-red-400">{error}</p>
      )}

      <div className="flex items-center gap-2 pt-1">
        <Button
          type="submit"
          disabled={isPending}
          className="h-8 px-4 bg-[#7c3aed] hover:bg-[#6d28d9] text-white text-[13px] font-medium rounded-[6px] transition-colors cursor-pointer"
        >
          {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : (initial ? 'Guardar cambios' : 'Crear plantilla')}
        </Button>
        <button
          type="button"
          onClick={onCancel}
          className="h-8 px-3 text-[13px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-default)] rounded-[6px] transition-colors cursor-pointer"
        >
          Cancelar
        </button>
      </div>
    </form>
  )
}

export default function PlantillasAdmin({ plantillas: initialPlantillas, productos }: Props) {
  const [plantillas, setPlantillas] = useState<Plantilla[]>(initialPlantillas)
  const [creating, setCreating]     = useState(false)
  const [editingId, setEditingId]   = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  async function handleCreate(data: PlantillaFormData) {
    const result = await crearPlantilla(data)
    if ('error' in result) return
    // Re-fetch via server — for simplicity, reload page
    window.location.reload()
  }

  async function handleUpdate(id: string, data: PlantillaFormData) {
    const result = await actualizarPlantilla(id, data)
    if ('error' in result) return
    window.location.reload()
  }

  function handleDelete(id: string) {
    if (!confirm('¿Eliminar esta plantilla?')) return
    startTransition(async () => {
      await eliminarPlantilla(id)
      setPlantillas((prev) => prev.filter((p) => p.id !== id))
    })
  }

  return (
    <div className="space-y-4">
      {/* Create form */}
      {creating ? (
        <div className="border border-[var(--border-default)] rounded-[8px] p-5 bg-[var(--bg-card)] space-y-3">
          <p className="text-[13px] font-semibold text-[var(--text-primary)]">Nueva plantilla</p>
          <PlantillaForm
            productos={productos}
            onSave={handleCreate}
            onCancel={() => setCreating(false)}
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="inline-flex items-center gap-1.5 px-3.5 h-9 bg-[#7c3aed] hover:bg-[#6d28d9] text-white text-[13px] font-medium rounded-[6px] transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Nueva plantilla
        </button>
      )}

      {/* List */}
      {plantillas.length === 0 && !creating && (
        <div className="border border-[var(--border-default)] rounded-[8px] p-10 text-center">
          <p className="text-[13px] text-[var(--text-muted)]">No hay plantillas. Crea la primera.</p>
        </div>
      )}

      <div className="space-y-2">
        {plantillas.map((p) => (
          <div
            key={p.id}
            className="border border-[var(--border-default)] rounded-[8px] bg-[var(--bg-card)] overflow-hidden"
          >
            {editingId === p.id ? (
              <div className="p-5 space-y-3">
                <p className="text-[13px] font-semibold text-[var(--text-primary)]">Editar plantilla</p>
                <PlantillaForm
                  initial={p}
                  productos={productos}
                  onSave={(data) => handleUpdate(p.id, data)}
                  onCancel={() => setEditingId(null)}
                />
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="text-[13px] font-semibold text-[var(--text-primary)]">{p.nombre}</p>
                    {p.descripcion && (
                      <p className="text-[11px] text-[var(--text-muted)] mt-0.5">{p.descripcion}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}
                      className="p-1.5 rounded-[5px] text-[var(--text-muted)] hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                      title="Ver ítems"
                    >
                      {expandedId === p.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(p.id)}
                      className="p-1.5 rounded-[5px] text-[var(--text-muted)] hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                      title="Editar"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(p.id)}
                      disabled={isPending}
                      className="p-1.5 rounded-[5px] text-[var(--text-muted)] hover:bg-red-500/10 hover:text-red-400 transition-colors cursor-pointer"
                      title="Eliminar"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {expandedId === p.id && p.items.length > 0 && (
                  <div className="border-t border-[var(--border-default)] bg-[var(--bg-muted)] px-4 py-3">
                    <p className="text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-wide mb-2">Ítems ({p.items.length})</p>
                    <div className="space-y-1">
                      {p.items.map((item, i) => {
                        const prod = productos.find((pr) => pr.id === item.producto_id)
                        return (
                          <div key={item.id} className="text-[12px] text-[var(--text-secondary)]">
                            {i + 1}. {prod?.nombre ?? item.descripcion ?? 'Ítem sin nombre'}
                            {(item.ancho || item.alto) && (
                              <span className="text-[var(--text-muted)] ml-1.5">
                                {item.ancho ?? 0}×{item.alto ?? 0}m — {item.cantidad}u
                              </span>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
