'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { useTransition, useState, useEffect } from 'react'
import { Loader2, AlertCircle, ChevronRight, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { crearProducto, actualizarProducto } from '@/app/actions/productos'
import type { Producto } from '@/types/database.types'

const TIPO_LABEL: Record<string, string> = {
  tela:      'Telas',
  rigido:    'Rígidos',
  adhesivo:  'Adhesivos',
  papel:     'Papel',
  cnc_laser: 'CNC / Láser',
  otro:      'Otros',
}

const TIPOS_ORDEN = ['tela', 'rigido', 'adhesivo', 'papel', 'cnc_laser', 'otro']

const schema = z.object({
  nombre:                  z.string().min(1, 'El nombre es requerido'),
  categoria_id:            z.string().optional().nullable(),
  unidad:                  z.enum(['m2', 'ml', 'unidad']),
  precio_normal:           z.number().min(0, 'Precio inválido'),
  precio_empresa:          z.number().min(0, 'Precio inválido'),
  precio_agencia:          z.number().min(0, 'Precio inválido'),
  costo_base:              z.number().min(0, 'Costo inválido'),
  // Desglose de costos
  material_id:             z.string().uuid().optional().nullable(),
  costo_material:          z.number().min(0),
  costo_tinta:             z.number().min(0),
  costo_soporte:           z.number().min(0),
  costo_otros:             z.number().min(0),
  costo_overhead:          z.number().min(0),
  tiene_tinta:             z.boolean(),
  cliente_lleva_material:  z.boolean(),
})

type FormValues = z.infer<typeof schema>

interface Categoria {
  id: string
  nombre: string
}

interface Material {
  id: string
  nombre: string
  tipo: string | null
  costo_m2: number
}

interface ProductoFormProps {
  producto?: Producto
  categorias: Categoria[]
  materiales: Material[]
  costoTintaGlobal: number
  overheadGlobal: number
  materialId?: string | null
}

function formatCLP(amount: number): string {
  if (isNaN(amount)) return '—'
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
  }).format(amount)
}

export default function ProductoForm({
  producto,
  categorias,
  materiales,
  costoTintaGlobal,
  overheadGlobal,
  materialId,
}: ProductoFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [serverError, setServerError] = useState<string | null>(null)
  const [costoExpanded, setCostoExpanded] = useState(false)
  const [materialSeleccionado, setMaterialSeleccionado] = useState<string>(materialId ?? '')

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      nombre:                  producto?.nombre ?? '',
      categoria_id:            producto?.categoria_id ?? null,
      unidad:                  producto?.unidad ?? 'm2',
      precio_normal:           producto?.precio_normal ?? 0,
      precio_empresa:          producto?.precio_empresa ?? 0,
      precio_agencia:          producto?.precio_agencia ?? 0,
      costo_base:              producto?.costo_base ?? 0,
      material_id:             materialId ?? null,
      costo_material:          producto?.costo_material ?? 0,
      costo_tinta:             producto?.costo_tinta ?? 0,
      costo_soporte:           producto?.costo_soporte ?? 0,
      costo_otros:             producto?.costo_otros ?? 0,
      costo_overhead:          producto?.costo_overhead ?? 0,
      tiene_tinta:             producto?.tiene_tinta ?? true,
      cliente_lleva_material:  producto?.cliente_lleva_material ?? false,
    },
  })

  const precioNormal          = watch('precio_normal')
  const costoMaterial         = watch('costo_material')
  const costoSoporte          = watch('costo_soporte')
  const costoOtros            = watch('costo_otros')
  const tieneTinta            = watch('tiene_tinta')
  const clienteLlevaMaterial  = watch('cliente_lleva_material')

  // When a material is chosen from the dropdown, propagate its costo_m2
  function handleMaterialChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const selectedId = e.target.value
    setMaterialSeleccionado(selectedId)

    if (!selectedId) {
      setValue('material_id', null)
      if (!clienteLlevaMaterial) {
        setValue('costo_material', 0)
      }
      return
    }

    const mat = materiales.find(m => m.id === selectedId)
    if (mat) {
      setValue('material_id', mat.id)
      if (!clienteLlevaMaterial) {
        setValue('costo_material', mat.costo_m2)
      }
    }
  }

  // When the "cliente lleva material" toggle changes, zero out costo_material
  useEffect(() => {
    if (clienteLlevaMaterial) {
      setValue('costo_material', 0)
    } else if (materialSeleccionado) {
      const mat = materiales.find(m => m.id === materialSeleccionado)
      if (mat) setValue('costo_material', mat.costo_m2)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clienteLlevaMaterial])

  // Recalculate costo_base whenever any cost component changes.
  // Uses costoTintaGlobal and overheadGlobal from props (not manual inputs).
  useEffect(() => {
    const total =
      (clienteLlevaMaterial ? 0 : (Number(costoMaterial) || 0)) +
      (tieneTinta ? costoTintaGlobal : 0) +
      (Number(costoSoporte) || 0) +
      (Number(costoOtros) || 0) +
      overheadGlobal

    setValue('costo_base', Math.round(total), { shouldValidate: false })
  }, [costoMaterial, costoSoporte, costoOtros, tieneTinta, clienteLlevaMaterial, costoTintaGlobal, overheadGlobal, setValue])

  const costoBase = watch('costo_base')

  // Displayed total matches costo_base
  const costoTotalCalculado = Number(costoBase) || 0

  // Margin calculated against precio_normal (highest price)
  const margenImporte = (Number(precioNormal) || 0) - costoTotalCalculado
  const margenPct = (Number(precioNormal) || 0) > 0
    ? (margenImporte / (Number(precioNormal) || 1)) * 100
    : 0

  function margenColor(pct: number) {
    if (pct >= 40) return 'text-green-600'
    if (pct >= 20) return 'text-amber-600'
    return 'text-red-600'
  }

  function onSubmit(values: FormValues) {
    setServerError(null)
    startTransition(async () => {
      const result = producto
        ? await actualizarProducto(producto.id, values)
        : await crearProducto(values)

      if ('error' in result) {
        setServerError(result.error)
        return
      }
      router.push('/admin/productos')
    })
  }

  // Selected material label for the summary
  const matSeleccionadoObj = materiales.find(m => m.id === materialSeleccionado)

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

      {serverError && (
        <div className="flex items-center gap-2 rounded-[6px] border border-[#fca5a5] bg-[#fee2e2] px-3 py-2.5 text-[13px] text-[#dc2626]">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          {serverError}
        </div>
      )}

      {/* Datos generales */}
      <section className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-[8px] p-5 space-y-4">
        <h2 className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-[0.1em]">
          Datos del producto
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Nombre *" error={errors.nombre?.message} className="sm:col-span-2">
            <Input {...register('nombre')} placeholder="Ej: Lona impresa full color" className="h-8 text-[13px] border-[var(--border-default)] focus-visible:ring-[#7c3aed]/10 focus-visible:border-[#7c3aed] rounded-[6px]" />
          </Field>

          <Field label="Categoría" error={errors.categoria_id?.message}>
            <select
              {...register('categoria_id')}
              className="flex h-8 w-full rounded-[6px] border border-[var(--border-default)] bg-[var(--bg-card)] px-3 text-[13px] text-[var(--text-primary)] focus:outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/10 transition-colors"
            >
              <option value="">Sin categoría</option>
              {categorias.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.nombre}</option>
              ))}
            </select>
          </Field>

          <Field label="Unidad de medida *" error={errors.unidad?.message}>
            <select
              {...register('unidad')}
              className="flex h-8 w-full rounded-[6px] border border-[var(--border-default)] bg-[var(--bg-card)] px-3 text-[13px] text-[var(--text-primary)] focus:outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/10 transition-colors"
            >
              <option value="m2">m² (metro cuadrado)</option>
              <option value="ml">ml (metro lineal)</option>
              <option value="unidad">Unidad</option>
            </select>
          </Field>
        </div>
      </section>

      {/* Precios */}
      <section className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-[8px] p-5 space-y-4">
        <h2 className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-[0.1em]">
          Precios por nivel
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Precio Normal (público general)" error={errors.precio_normal?.message}>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] text-[13px] pointer-events-none">$</span>
              <Input
                {...register('precio_normal', { valueAsNumber: true })}
                type="number" min={0} step={1} placeholder="0"
                className="h-8 text-[13px] border-[var(--border-default)] focus-visible:ring-[#7c3aed]/10 focus-visible:border-[#7c3aed] rounded-[6px] pl-7"
              />
            </div>
          </Field>

          <Field label="Precio Empresa" error={errors.precio_empresa?.message}>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] text-[13px] pointer-events-none">$</span>
              <Input
                {...register('precio_empresa', { valueAsNumber: true })}
                type="number" min={0} step={1} placeholder="0"
                className="h-8 text-[13px] border-[var(--border-default)] focus-visible:ring-[#7c3aed]/10 focus-visible:border-[#7c3aed] rounded-[6px] pl-7"
              />
            </div>
          </Field>

          <Field label="Precio Agencia" error={errors.precio_agencia?.message}>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] text-[13px] pointer-events-none">$</span>
              <Input
                {...register('precio_agencia', { valueAsNumber: true })}
                type="number" min={0} step={1} placeholder="0"
                className="h-8 text-[13px] border-[var(--border-default)] focus-visible:ring-[#7c3aed]/10 focus-visible:border-[#7c3aed] rounded-[6px] pl-7"
              />
            </div>
          </Field>

          {/* costo_base is driven by the breakdown — hidden field for form submission */}
          <input type="hidden" {...register('costo_base', { valueAsNumber: true })} />
          {/* material_id hidden — managed via state + setValue */}
          <input type="hidden" {...register('material_id')} />
        </div>
      </section>

      {/* Desglose de costos — collapsible */}
      <section className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-[8px] overflow-hidden">

        {/* Header */}
        <button
          type="button"
          onClick={() => setCostoExpanded((v) => !v)}
          className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-[var(--bg-muted)] transition-colors"
        >
          <div className="flex items-center gap-2">
            {costoExpanded
              ? <ChevronDown className="w-3.5 h-3.5 text-[var(--text-muted)]" />
              : <ChevronRight className="w-3.5 h-3.5 text-[var(--text-muted)]" />
            }
            <span className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-[0.1em]">
              Desglose de costos
            </span>
          </div>
          <span className="text-[12px] text-[var(--text-muted)]">
            {costoTotalCalculado > 0 ? formatCLP(costoTotalCalculado) : 'Sin desglose'}
          </span>
        </button>

        {costoExpanded && (
          <div className="px-5 pb-5 pt-1 space-y-5 border-t border-[var(--border-default)]">

            {/* Toggles */}
            <div className="flex flex-wrap gap-x-6 gap-y-3 pt-2">
              <ToggleField
                id="tiene_tinta"
                label="Tiene tinta / impresión"
                checked={tieneTinta}
                onChange={(v) => setValue('tiene_tinta', v)}
              />
              <ToggleField
                id="cliente_lleva_material"
                label="Cliente lleva el material"
                checked={clienteLlevaMaterial}
                onChange={(v) => setValue('cliente_lleva_material', v)}
              />
            </div>

            {/* Cost inputs grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

              {/* Material selector */}
              {!clienteLlevaMaterial && (
                <Field label="Material" className="sm:col-span-2">
                  <select
                    value={materialSeleccionado}
                    onChange={handleMaterialChange}
                    className="flex h-8 w-full rounded-[6px] border border-[var(--border-default)] bg-[var(--bg-card)] px-3 text-[13px] text-[var(--text-primary)] focus:outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/10 transition-colors"
                  >
                    <option value="">Sin material</option>
                    {TIPOS_ORDEN.map(tipo => {
                      const items = materiales.filter(m => m.tipo === tipo)
                      if (!items.length) return null
                      return (
                        <optgroup key={tipo} label={TIPO_LABEL[tipo] ?? tipo}>
                          {items.map(m => (
                            <option key={m.id} value={m.id}>
                              {m.nombre} — {formatCLP(m.costo_m2)}/m²
                            </option>
                          ))}
                        </optgroup>
                      )
                    })}
                  </select>
                </Field>
              )}

              {/* Tinta — read-only from global config */}
              {tieneTinta && (
                <Field label="Costo tinta ($/m²)" hint="Valor global desde configuración">
                  <div className="flex h-8 items-center rounded-[6px] border border-[var(--border-default)] bg-[var(--bg-muted)] px-3">
                    <span className="text-[13px] text-[var(--text-primary)] tabular-nums">
                      {formatCLP(costoTintaGlobal)}/m²
                    </span>
                  </div>
                </Field>
              )}

              <Field label="Costo soporte / estructura ($/u)">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] text-[13px] pointer-events-none">$</span>
                  <Input
                    {...register('costo_soporte', { valueAsNumber: true })}
                    type="number" min={0} step={1} placeholder="0"
                    className="h-8 text-[13px] border-[var(--border-default)] focus-visible:ring-[#7c3aed]/10 focus-visible:border-[#7c3aed] rounded-[6px] pl-7"
                  />
                </div>
              </Field>

              <Field label="Otros costos directos">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] text-[13px] pointer-events-none">$</span>
                  <Input
                    {...register('costo_otros', { valueAsNumber: true })}
                    type="number" min={0} step={1} placeholder="0"
                    className="h-8 text-[13px] border-[var(--border-default)] focus-visible:ring-[#7c3aed]/10 focus-visible:border-[#7c3aed] rounded-[6px] pl-7"
                  />
                </div>
              </Field>

              {/* Overhead — read-only from global config */}
              <Field
                label="Overhead ($/m²)"
                hint="Luz, agua, sueldos prorrateados — valor global desde configuración"
                className="sm:col-span-2"
              >
                <div className="flex h-8 items-center rounded-[6px] border border-[var(--border-default)] bg-[var(--bg-muted)] px-3">
                  <span className="text-[13px] text-[var(--text-primary)] tabular-nums">
                    {formatCLP(overheadGlobal)}/m²
                  </span>
                </div>
              </Field>
            </div>

            {/* Calculated summary */}
            <div className="rounded-[6px] border border-[var(--border-default)] bg-[var(--bg-muted)] divide-y divide-[var(--border-default)]">
              {!clienteLlevaMaterial && (
                <SummaryRow
                  label={matSeleccionadoObj ? `Material: ${matSeleccionadoObj.nombre}` : 'Material'}
                  value={formatCLP(Number(costoMaterial) || 0) + '/m²'}
                />
              )}
              {tieneTinta && (
                <SummaryRow label="Tinta" value={formatCLP(costoTintaGlobal) + '/m²'} />
              )}
              <SummaryRow label="Soporte" value={formatCLP(Number(costoSoporte) || 0) + '/u'} />
              <SummaryRow label="Overhead" value={formatCLP(overheadGlobal) + '/m²'} />
              <SummaryRow label="Costo total calculado" value={formatCLP(costoTotalCalculado)} />
              <SummaryRow label="Precio Normal" value={formatCLP(Number(precioNormal) || 0)} />
              <div className="flex items-center justify-between px-4 py-2.5">
                <span className="text-[13px] text-[var(--text-secondary)]">Margen bruto</span>
                <span className={`text-[13px] font-semibold ${margenColor(margenPct)}`}>
                  {(Number(precioNormal) || 0) > 0
                    ? `${margenPct.toFixed(1)}%`
                    : '—'
                  }
                </span>
              </div>
            </div>

          </div>
        )}
      </section>

      {/* Acciones */}
      <div className="flex items-center gap-2 justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push('/admin/productos')}
          disabled={isPending}
          className="h-8 px-3.5 text-[13px] border-[var(--border-default)] text-[var(--text-primary)] hover:bg-[var(--bg-muted)] rounded-[6px]"
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={isPending}
          className="h-8 px-3.5 text-[13px] bg-[#7c3aed] hover:bg-[#6d28d9] text-white font-medium rounded-[6px] min-w-[130px]"
        >
          {isPending ? (
            <>
              <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
              Guardando...
            </>
          ) : producto ? (
            'Guardar cambios'
          ) : (
            'Crear producto'
          )}
        </Button>
      </div>
    </form>
  )
}

// ── Helper components ──────────────────────────────────────────────────────────

function Field({
  label,
  hint,
  error,
  children,
  className,
}: {
  label: string
  hint?: string
  error?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={`space-y-1.5 ${className ?? ''}`}>
      <div>
        <Label className="text-[12px] font-medium text-[#374151]">
          {label}
        </Label>
        {hint && (
          <p className="text-[11px] text-[var(--text-muted)] mt-0.5">{hint}</p>
        )}
      </div>
      {children}
      {error && (
        <p className="flex items-center gap-1.5 text-xs text-red-500">
          <AlertCircle className="w-3 h-3 shrink-0" />
          {error}
        </p>
      )}
    </div>
  )
}

function ToggleField({
  id,
  label,
  checked,
  onChange,
}: {
  id: string
  label: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label htmlFor={id} className="flex items-center gap-2.5 cursor-pointer select-none">
      <button
        type="button"
        id={id}
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7c3aed] focus-visible:ring-offset-1 ${
          checked ? 'bg-[#7c3aed]' : 'bg-[var(--border-default)]'
        }`}
      >
        <span
          className={`pointer-events-none block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
            checked ? 'translate-x-4' : 'translate-x-0'
          }`}
        />
      </button>
      <span className="text-[13px] text-[var(--text-secondary)]">{label}</span>
    </label>
  )
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5">
      <span className="text-[13px] text-[var(--text-secondary)]">{label}</span>
      <span className="text-[13px] font-medium text-[var(--text-primary)]">{value}</span>
    </div>
  )
}
