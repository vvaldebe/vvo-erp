'use client'

import { useState, useTransition, useCallback, useEffect } from 'react'
import {
  useForm,
  useFieldArray,
  useWatch,
  type Control,
  type UseFormRegister,
  type UseFormWatch,
  type UseFormSetValue,
} from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, X, Loader2, AlertCircle, ChevronDown } from 'lucide-react'
import { crearCotizacion, actualizarCotizacion } from '@/app/actions/cotizaciones'
import {
  getPrecioNivel,
  calcularIva,
  formatCLP,
} from '@/lib/utils/calculos'
import type { NivelPrecio, UnidadMedida } from '@/types/database.types'

// ── Tipos de props ──────────────────────────────────────────────────────────

interface ClienteOption {
  id: string
  nombre: string
  nivel_precio: NivelPrecio
  descuento_porcentaje: number
}

interface ProductoOption {
  id: string
  nombre: string
  categoria: string
  unidad: UnidadMedida
  precio_normal: number
  precio_empresa: number
  precio_agencia: number
}

interface TerminacionOption {
  id: string
  nombre: string
  unidad: UnidadMedida
  precio: number
}

interface ServicioMaquinaOption {
  id: string
  nombre: string
  tipo: string | null
  precio_minuto_normal: number
  precio_minuto_empresa: number
  precio_minuto_agencia: number
  minimo_minutos: number
}

export interface InitialItem {
  producto_id:     string | null
  descripcion:     string | null
  ancho:           number | null
  alto:            number | null
  cantidad:        number
  precio_unitario: number
  subtotal:        number
  orden:           number
  notas_item:      string | null
  terminaciones:   { terminacion_id: string | null; nombre: string; precio: number; cantidad: number }[]
  _producto:       (ProductoOption & { id: string }) | null
}

interface Props {
  numeroCotizacion: string
  clientes:         ClienteOption[]
  productos:        ProductoOption[]
  terminaciones:    TerminacionOption[]
  serviciosMaquina?: ServicioMaquinaOption[]
  // Modo edición
  cotizacionId?:      string
  initialCliente?:    ClienteOption | null
  initialNivel?:      NivelPrecio
  initialNotas?:      string
  initialValidaHasta?: string
  initialItems?:      InitialItem[]
}

// ── Schema de formulario ────────────────────────────────────────────────────

const terminacionItemSchema = z.object({
  terminacion_id: z.string().optional().nullable(),
  nombre:         z.string().min(1, 'Nombre requerido'),
  precio:         z.number().min(0),
  cantidad:       z.number().int().min(1),
})

const itemSchema = z.object({
  producto_id:     z.string().optional().nullable(),
  descripcion:     z.string().optional().nullable(),
  ancho:           z.number().min(0).optional().nullable(),
  alto:            z.number().min(0).optional().nullable(),
  cantidad:        z.number().int().min(1),
  precio_unitario: z.number().min(0),
  subtotal:        z.number().min(0),
  orden:           z.number().int().min(0),
  notas_item:      z.string().optional().nullable(),
  terminaciones:   z.array(terminacionItemSchema),
})

const formSchema = z.object({
  valida_hasta: z.string().optional().nullable(),
  nivel_precio: z.enum(['normal', 'empresa', 'agencia', 'especial']),
  notas:        z.string().optional().nullable(),
  items:        z.array(itemSchema).min(1, 'Debe agregar al menos un ítem'),
})

type FormValues = z.infer<typeof formSchema>

// ── Helpers ─────────────────────────────────────────────────────────────────

function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

function addDays(isoDate: string, days: number): string {
  const d = new Date(isoDate)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

function formatFechaDisplay(iso: string): string {
  return new Date(iso + 'T12:00:00').toLocaleDateString('es-CL', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })
}

function calcItemSubtotal(
  unidad: UnidadMedida | undefined,
  precio: number,
  ancho: number,
  alto: number,
  cantidad: number
): number {
  if (isNaN(precio) || isNaN(cantidad)) return 0
  switch (unidad) {
    case 'm2':     return precio * (ancho * alto) * cantidad
    case 'ml':     return precio * ancho * cantidad
    default:       return precio * cantidad   // 'unidad' o sin producto
  }
}

const INPUT_BASE = 'px-2 py-1.5 text-sm bg-[var(--bg-card)] border border-[var(--border-default)] rounded-md text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/10 focus:border-[#7c3aed] transition-colors'

// Detecta si un nombre de producto corresponde a modo "por minuto" (láser/CNC)
function detectarModoMinutos(nombre: string): boolean {
  return /l[aá]ser|cnc|minuto|min\s/i.test(nombre)
}

// ── Componente principal ────────────────────────────────────────────────────

export default function NuevaCotizacionForm({
  numeroCotizacion,
  clientes,
  productos,
  terminaciones,
  serviciosMaquina  = [],
  cotizacionId,
  initialCliente    = null,
  initialNivel      = 'normal',
  initialNotas      = '',
  initialValidaHasta,
  initialItems      = [],
}: Props) {
  const hoy = todayISO()
  const esEdicion = !!cotizacionId
  const [isPending, startTransition] = useTransition()
  const [serverError, setServerError] = useState<string | null>(null)

  // Estado de cliente seleccionado
  const [clienteSeleccionado, setClienteSeleccionado] = useState<ClienteOption | null>(initialCliente)
  const [clienteQuery, setClienteQuery]               = useState('')
  const [clienteDropdown, setClienteDropdown]         = useState(false)

  const {
    register,
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      valida_hasta: initialValidaHasta || addDays(hoy, 30),
      nivel_precio: initialNivel,
      notas:        initialNotas,
      items:        initialItems.map((item) => ({
        producto_id:     item.producto_id,
        descripcion:     item.descripcion,
        ancho:           item.ancho,
        alto:            item.alto,
        cantidad:        item.cantidad,
        precio_unitario: item.precio_unitario,
        subtotal:        item.subtotal,
        orden:           item.orden,
        notas_item:      item.notas_item ?? null,
        terminaciones:   item.terminaciones,
      })),
    },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'items' })

  // Watch en tiempo real para resumen
  const watchedItems = useWatch({ control, name: 'items' })
  const nivel        = watch('nivel_precio')

  // Cálculo de subtotal total
  const subtotalNeto = (watchedItems ?? []).reduce((acc, item) => {
    const itemSub = Number(item?.subtotal) || 0
    const termSub = (item?.terminaciones ?? []).reduce((ta, t) => {
      return ta + ((Number(t?.precio) || 0) * (Number(t?.cantidad) || 1))
    }, 0)
    return acc + itemSub + termSub
  }, 0)

  const ivaVal   = calcularIva(subtotalNeto)
  const totalVal = subtotalNeto + ivaVal

  // Seleccionar cliente
  const selectCliente = useCallback((c: ClienteOption) => {
    setClienteSeleccionado(c)
    setClienteQuery('')
    setClienteDropdown(false)
    setValue('nivel_precio', c.nivel_precio)
  }, [setValue])

  const deseleccionarCliente = useCallback(() => {
    setClienteSeleccionado(null)
    setValue('nivel_precio', 'normal')
  }, [setValue])

  const clientesFiltrados = clientes
    .filter((c) => c.nombre.toLowerCase().includes(clienteQuery.toLowerCase()))
    .slice(0, 30)

  // Agregar ítem vacío
  function agregarItem() {
    append({
      producto_id:     null,
      descripcion:     '',
      ancho:           1,
      alto:            1,
      cantidad:        1,
      precio_unitario: 0,
      subtotal:        0,
      orden:           fields.length,
      notas_item:      null,
      terminaciones:   [],
    })
  }

  // Guardar cotización
  function onSubmit(values: FormValues) {
    setServerError(null)
    const payload = {
      numero:       numeroCotizacion,
      cliente_id:   clienteSeleccionado?.id ?? null,
      nivel_precio: values.nivel_precio,
      notas:        values.notas ?? null,
      valida_hasta: values.valida_hasta ?? null,
      items:        values.items.map((it, idx) => ({
        producto_id:     it.producto_id ?? null,
        descripcion:     it.descripcion ?? null,
        ancho:           it.ancho ?? null,
        alto:            it.alto ?? null,
        cantidad:        it.cantidad,
        precio_unitario: it.precio_unitario,
        subtotal:        it.subtotal,
        orden:           idx,
        notas_item:      it.notas_item ?? null,
        terminaciones:   (it.terminaciones ?? []).map((t) => ({
          terminacion_id: t.terminacion_id ?? null,
          nombre:         t.nombre,
          precio:         t.precio,
          cantidad:       t.cantidad,
        })),
      })),
    }

    startTransition(async () => {
      const { numero: _numero, ...payloadSinNumero } = payload
      const result = esEdicion
        ? await actualizarCotizacion(cotizacionId!, payloadSinNumero)
        : await crearCotizacion(payload)

      if (result && 'error' in result) {
        setServerError(result.error)
      }
      // Si éxito, el server action redirige
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="flex gap-6 items-start">

        {/* ── Columna izquierda ──────────────────────────────────── */}
        <div className="flex-1 min-w-0 space-y-5">

          {serverError && (
            <div className="flex items-center gap-2 rounded-[6px] border border-red-100 bg-red-50 p-4 text-sm text-red-600">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {serverError}
            </div>
          )}

          {/* Sección 1: Encabezado */}
          <section className="bg-[var(--bg-card)] rounded-[8px] border border-[var(--border-default)] p-6 space-y-5">
            <h2 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wider">
              Datos de la cotización
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {/* Número (read-only) */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider block">
                  N° Cotización
                </label>
                <div className="flex h-10 items-center px-3 rounded-md border border-[var(--border-default)] bg-gray-50">
                  <span className="font-semibold text-[#7c3aed] tracking-tight">
                    {numeroCotizacion}
                  </span>
                </div>
              </div>
              {/* Fecha (read-only) */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider block">
                  Fecha
                </label>
                <div className="flex h-10 items-center px-3 rounded-md border border-[var(--border-default)] bg-gray-50 text-sm text-gray-600">
                  {formatFechaDisplay(hoy)}
                </div>
              </div>
              {/* Válida hasta */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider block">
                  Válida hasta
                </label>
                <input
                  type="date"
                  {...register('valida_hasta')}
                  className="flex h-10 w-full rounded-md border border-[var(--border-default)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/10 focus:border-[#7c3aed] transition-colors"
                />
              </div>
            </div>
          </section>

          {/* Sección 2: Cliente y nivel */}
          <section className="bg-[var(--bg-card)] rounded-[8px] border border-[var(--border-default)] p-6 space-y-5">
            <h2 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wider">
              Cliente y nivel de precio
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* Buscador de cliente */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider block">
                  Cliente
                </label>
                {clienteSeleccionado ? (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-md border border-[#7c3aed]/20 bg-[#ede9fe]/20 h-10">
                    <span className="text-sm font-medium text-[var(--text-primary)] flex-1 truncate">
                      {clienteSeleccionado.nombre}
                    </span>
                    <button
                      type="button"
                      onClick={deseleccionarCliente}
                      className="text-[var(--text-muted)] hover:text-gray-600 transition-colors flex-shrink-0"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Buscar cliente..."
                      value={clienteQuery}
                      onChange={(e) => { setClienteQuery(e.target.value); setClienteDropdown(true) }}
                      onFocus={() => setClienteDropdown(true)}
                      onBlur={() => setTimeout(() => setClienteDropdown(false), 150)}
                      className="flex h-10 w-full rounded-md border border-[var(--border-default)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/10 focus:border-[#7c3aed] transition-colors"
                    />
                    {clienteDropdown && (
                      <div className="absolute z-20 left-0 right-0 top-11 bg-[var(--bg-card)] border border-[var(--border-default)] rounded-[6px] shadow-lg max-h-48 overflow-y-auto">
                        {clientesFiltrados.length > 0 ? (
                          clientesFiltrados.map((c) => (
                            <button
                              key={c.id}
                              type="button"
                              onMouseDown={() => selectCliente(c)}
                              className="w-full text-left px-3 py-2 text-sm hover:bg-[#ede9fe]/20 hover:text-[#7c3aed] transition-colors"
                            >
                              {c.nombre}
                            </button>
                          ))
                        ) : (
                          <p className="px-3 py-2 text-sm text-[var(--text-muted)]">Sin resultados</p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Nivel de precio */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider block">
                  Nivel de precio
                </label>
                <div className="relative">
                  <select
                    {...register('nivel_precio')}
                    className="flex h-10 w-full rounded-md border border-[var(--border-default)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/10 focus:border-[#7c3aed] transition-colors appearance-none pr-8"
                  >
                    <option value="normal">Normal (Público)</option>
                    <option value="empresa">Empresa</option>
                    <option value="agencia">Agencia / Diseñador</option>
                    <option value="especial">Especial (negociado)</option>
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] pointer-events-none" />
                </div>
                {nivel === 'especial' && clienteSeleccionado && (
                  <p className="text-xs text-[#7c3aed] mt-1">
                    Descuento especial: {clienteSeleccionado.descuento_porcentaje}% sobre precio Normal
                  </p>
                )}
              </div>
            </div>
          </section>

          {/* Sección 3: Ítems */}
          <section className="bg-[var(--bg-card)] rounded-[8px] border border-[var(--border-default)] p-6 space-y-4">
            <h2 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wider">
              Ítems de la cotización
            </h2>

            {errors.items?.root && (
              <p className="text-xs text-red-500 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {errors.items.root.message}
              </p>
            )}

            {fields.length === 0 && (
              <p className="text-sm text-[var(--text-muted)] text-center py-4">
                No hay ítems aún. Agrega el primero abajo.
              </p>
            )}

            {fields.map((_field, index) => (
              <ItemRow
                key={_field.id}
                index={index}
                register={register}
                control={control}
                watch={watch}
                setValue={setValue}
                remove={remove}
                productos={productos}
                terminaciones={terminaciones}
                serviciosMaquina={serviciosMaquina}
                nivel={nivel}
                descuentoEspecial={clienteSeleccionado?.descuento_porcentaje ?? 0}
                initialProducto={initialItems[index]?._producto ?? null}
              />
            ))}

            <button
              type="button"
              onClick={agregarItem}
              className="w-full py-2.5 border-2 border-dashed border-[var(--border-default)] rounded-[6px] text-sm text-[var(--text-muted)] hover:border-[#7c3aed]/40 hover:text-[#7c3aed] transition-colors flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Agregar ítem
            </button>
          </section>

          {/* Sección 4: Notas */}
          <section className="bg-[var(--bg-card)] rounded-[8px] border border-[var(--border-default)] p-6 space-y-3">
            <h2 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wider">
              Notas
            </h2>
            <textarea
              {...register('notas')}
              rows={3}
              placeholder="Observaciones, condiciones de pago, plazo de entrega, etc."
              className="flex w-full rounded-md border border-[var(--border-default)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/10 focus:border-[#7c3aed] transition-colors resize-none"
            />
          </section>

        </div>

        {/* ── Columna derecha: Resumen sticky ───────────────────── */}
        <div className="w-80 flex-shrink-0 sticky top-6 space-y-3">
          <div className="bg-[var(--bg-card)] rounded-[8px] border border-[var(--border-default)] p-5 space-y-4 shadow-sm">
            <h3 className="text-sm font-semibold text-[var(--text-secondary)]">Resumen</h3>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal neto</span>
                <span className="tabular-nums font-semibold text-[var(--text-primary)]">
                  {formatCLP(Math.round(subtotalNeto))}
                </span>
              </div>
              <div className="flex justify-between text-[var(--text-secondary)]">
                <span>IVA 19%</span>
                <span className="tabular-nums">
                  {formatCLP(Math.round(ivaVal))}
                </span>
              </div>
              <div className="border-t border-[var(--border-default)] pt-2 flex justify-between text-base font-bold text-[var(--text-primary)]">
                <span>TOTAL</span>
                <span className="tabular-nums text-[#7c3aed]">
                  {formatCLP(Math.round(totalVal))}
                </span>
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <button
                type="submit"
                disabled={isPending}
                className="w-full py-2.5 bg-[#7c3aed] hover:bg-[#6d28d9] text-white text-sm font-semibold rounded-[6px] transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
              >
                {isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  esEdicion ? 'Guardar cambios' : 'Guardar y generar PDF'
                )}
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="w-full py-2.5 bg-[var(--bg-card)] border border-[var(--border-default)] hover:border-[var(--border-default)] text-[var(--text-secondary)] text-sm font-semibold rounded-[6px] transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
              >
                Guardar borrador
              </button>
            </div>
          </div>

          {/* Info cliente seleccionado */}
          {clienteSeleccionado && (
            <div className="bg-gray-50 rounded-[8px] border border-[var(--border-default)] p-4 text-xs space-y-1 text-[var(--text-secondary)]">
              <p className="font-semibold text-[var(--text-secondary)]">{clienteSeleccionado.nombre}</p>
              <p>
                Nivel:{' '}
                <span className="font-medium text-[var(--text-primary)] capitalize">
                  {clienteSeleccionado.nivel_precio}
                </span>
              </p>
              {clienteSeleccionado.nivel_precio === 'especial' && (
                <p>
                  Descuento:{' '}
                  <span className="font-medium text-[#7c3aed]">
                    {clienteSeleccionado.descuento_porcentaje}%
                  </span>
                </p>
              )}
            </div>
          )}
        </div>

      </div>
    </form>
  )
}

// ── Subcomponente: fila de ítem ─────────────────────────────────────────────

interface ItemRowProps {
  index: number
  register:  UseFormRegister<FormValues>
  control:   Control<FormValues>
  watch:     UseFormWatch<FormValues>
  setValue:  UseFormSetValue<FormValues>
  remove:    (index: number) => void
  productos: ProductoOption[]
  terminaciones: TerminacionOption[]
  serviciosMaquina: ServicioMaquinaOption[]
  nivel: NivelPrecio
  descuentoEspecial: number
  initialProducto?: (ProductoOption & { id: string }) | null
}

function ItemRow({
  index,
  register,
  control,
  watch,
  setValue,
  remove,
  productos,
  terminaciones,
  serviciosMaquina,
  nivel,
  descuentoEspecial,
  initialProducto,
}: ItemRowProps) {
  const [productoQuery,    setProductoQuery]    = useState('')
  const [productoDropdown, setProductoDropdown] = useState(false)
  const [productoSel,      setProductoSel]      = useState<ProductoOption | null>(initialProducto ?? null)
  const [mostrarTerms,     setMostrarTerms]      = useState(false)
  const [mostrarDesc,      setMostrarDesc]       = useState(false)
  const [esMinutos,        setEsMinutos]         = useState(() => detectarModoMinutos(initialProducto?.nombre ?? ''))
  const [minimoMinutos,    setMinimoMinutos]     = useState<number | null>(null)
  const [mostrarNotaItem,  setMostrarNotaItem]   = useState(false)

  const { fields: termFields, append: appendTerm, remove: removeTerm } =
    useFieldArray({ control, name: `items.${index}.terminaciones` as const })

  const ancho    = Number(watch(`items.${index}.ancho`))    || 0
  const alto     = Number(watch(`items.${index}.alto`))     || 0
  const cantidad = Number(watch(`items.${index}.cantidad`)) || 1
  const precioU  = Number(watch(`items.${index}.precio_unitario`)) || 0
  const unidad   = productoSel?.unidad

  const subtotalCalc = calcItemSubtotal(unidad, precioU, ancho, alto, cantidad)

  // Sync subtotal en efecto para evitar loop de re-renders
  useEffect(() => {
    setValue(`items.${index}.subtotal`, subtotalCalc, { shouldValidate: false })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subtotalCalc, index])

  const productosFiltrados = productos
    .filter((p) => p.nombre.toLowerCase().includes(productoQuery.toLowerCase()))
    .slice(0, 25)

  function seleccionarProducto(p: ProductoOption) {
    setProductoSel(p)
    setProductoQuery('')
    setProductoDropdown(false)
    const modoMinutos = detectarModoMinutos(p.nombre)
    setEsMinutos(modoMinutos)
    setValue(`items.${index}.producto_id`, p.id)

    // Intentar auto-llenar precio/minuto desde servicios_maquina
    if (modoMinutos && serviciosMaquina.length > 0) {
      const nombreProducto = p.nombre.toLowerCase()
      const primerToken = nombreProducto.split(/\s+/)[0]
      const servicioMatch = serviciosMaquina.find((s) => {
        const nombreServicio = s.nombre.toLowerCase()
        return (
          nombreServicio.includes(primerToken) ||
          nombreProducto.includes(nombreServicio.split(/\s+/)[0])
        )
      })
      if (servicioMatch) {
        const precioMinuto =
          nivel === 'empresa' ? servicioMatch.precio_minuto_empresa
          : nivel === 'agencia' ? servicioMatch.precio_minuto_agencia
          : servicioMatch.precio_minuto_normal
        setValue(`items.${index}.precio_unitario`, precioMinuto)
        setMinimoMinutos(servicioMatch.minimo_minutos)
        const newSub = calcItemSubtotal('unidad', precioMinuto, ancho, alto, cantidad)
        setValue(`items.${index}.subtotal`, newSub)
        return
      }
    }

    // Sin match de servicio: usar precio del producto normalmente
    setMinimoMinutos(null)
    const precio = getPrecioNivel(p, nivel, descuentoEspecial)
    setValue(`items.${index}.precio_unitario`, precio)
    const newSub = calcItemSubtotal(p.unidad, precio, ancho, alto, cantidad)
    setValue(`items.${index}.subtotal`, newSub)
  }

  return (
    <div className="border border-[var(--border-default)] rounded-[8px] overflow-hidden">
      <div className="p-4 space-y-3">

        {/* Fila 1: Producto */}
        <div className="flex items-start gap-3">
          <div className="flex-1 space-y-1">
            <label className="text-xs text-[var(--text-secondary)] font-semibold uppercase tracking-wider">
              Producto / Descripción
            </label>
            {productoSel ? (
              <div className="flex items-center gap-2 px-3 py-2 rounded-md border border-[#7c3aed]/20 bg-[#ede9fe]/20 h-9">
                <span className="text-sm font-medium text-[var(--text-primary)] flex-1 truncate">
                  {productoSel.nombre}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setProductoSel(null)
                    setEsMinutos(false)
                    setValue(`items.${index}.producto_id`, null)
                    setValue(`items.${index}.precio_unitario`, 0)
                    setValue(`items.${index}.subtotal`, 0)
                  }}
                  className="text-[var(--text-muted)] hover:text-gray-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="relative">
                <input
                  type="text"
                  placeholder="Buscar producto..."
                  value={productoQuery}
                  onChange={(e) => { setProductoQuery(e.target.value); setProductoDropdown(true) }}
                  onFocus={() => setProductoDropdown(true)}
                  onBlur={() => setTimeout(() => setProductoDropdown(false), 150)}
                  className={`${INPUT_BASE} w-full`}
                />
                {productoDropdown && productosFiltrados.length > 0 && (
                  <div className="absolute z-20 left-0 right-0 top-10 bg-[var(--bg-card)] border border-[var(--border-default)] rounded-[6px] shadow-lg max-h-40 overflow-y-auto">
                    {productosFiltrados.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onMouseDown={() => seleccionarProducto(p)}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-[#ede9fe]/20 hover:text-[#7c3aed] transition-colors"
                      >
                        <span className="font-medium">{p.nombre}</span>
                        <span className="text-xs text-[var(--text-muted)] ml-2">{p.categoria}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            {/* Descripción libre */}
            {!productoSel && (
              mostrarDesc ? (
                <input
                  type="text"
                  placeholder="Descripción del ítem"
                  {...register(`items.${index}.descripcion`)}
                  autoFocus
                  className={`${INPUT_BASE} w-full mt-1`}
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setMostrarDesc(true)}
                  className="text-xs text-[var(--text-muted)] hover:text-[#7c3aed] transition-colors mt-1"
                >
                  + descripción libre
                </button>
              )
            )}
          </div>
          <button
            type="button"
            onClick={() => remove(index)}
            className="mt-6 p-1.5 text-gray-300 hover:text-red-400 transition-colors rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Fila 2: dimensiones + precios */}
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
          {!esMinutos && (
            <div className="space-y-1">
              <label className="text-xs text-[var(--text-secondary)] font-semibold uppercase tracking-wider block">
                Ancho (m)
              </label>
              <input
                type="number"
                step="0.01"
                min={0}
                {...register(`items.${index}.ancho`, { valueAsNumber: true })}
                className={`${INPUT_BASE} w-full`}
                placeholder="0.00"
              />
            </div>
          )}
          {!esMinutos && (
            <div className="space-y-1">
              <label className="text-xs text-[var(--text-secondary)] font-semibold uppercase tracking-wider block">
                {unidad === 'ml' ? 'Largo (m)' : 'Alto (m)'}
              </label>
              <input
                type="number"
                step="0.01"
                min={0}
                {...register(`items.${index}.alto`, { valueAsNumber: true })}
                disabled={unidad === 'unidad'}
                className={`${INPUT_BASE} w-full ${unidad === 'unidad' ? 'opacity-40 cursor-not-allowed bg-gray-50' : ''}`}
                placeholder="0.00"
              />
            </div>
          )}
          {!esMinutos && (!unidad || unidad === 'm2') && (
            <div className="space-y-1">
              <label className="text-xs text-[var(--text-secondary)] font-semibold uppercase tracking-wider block">m²</label>
              <div className={`${INPUT_BASE} bg-gray-50 text-[var(--text-secondary)] text-right`}>
                {(ancho * alto).toFixed(2)}
              </div>
            </div>
          )}
          <div className="space-y-1">
            <label className="text-xs text-[var(--text-secondary)] font-semibold uppercase tracking-wider block">
              {esMinutos ? 'Minutos' : 'Cant.'}
            </label>
            <input
              type="number"
              min={1}
              step={1}
              {...register(`items.${index}.cantidad`, { valueAsNumber: true })}
              className={`${INPUT_BASE} w-full text-right`}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-[var(--text-secondary)] font-semibold uppercase tracking-wider block">
              {esMinutos ? '$/min' : 'Precio/u'}
            </label>
            <input
              type="number"
              min={0}
              step={1}
              {...register(`items.${index}.precio_unitario`, { valueAsNumber: true })}
              className={`${INPUT_BASE} w-full text-right`}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-[var(--text-secondary)] font-semibold uppercase tracking-wider block">Subtotal</label>
            <div className={`${INPUT_BASE} bg-gray-50 text-[var(--text-secondary)] font-semibold text-right`}>
              {formatCLP(Math.round(subtotalCalc))}
            </div>
          </div>
        </div>

        {/* Aviso modo minutos */}
        {esMinutos && (
          <div className="flex items-center gap-3 mt-1">
            <p className="text-[11px] text-amber-600 bg-amber-50 px-2 py-1 rounded-[4px] flex-1">
              ⚠ Precio estimado. El costo final se ajusta al tiempo real registrado en la máquina.
            </p>
            {minimoMinutos !== null && (
              <p className="text-[11px] text-[var(--text-muted)] whitespace-nowrap">
                Mínimo: {minimoMinutos} min
              </p>
            )}
          </div>
        )}

        {/* Notas del ítem */}
        {(mostrarNotaItem || watch(`items.${index}.notas_item`)) ? (
          <input
            type="text"
            placeholder="Ej: incluye material, mínimo 15 min..."
            {...register(`items.${index}.notas_item`)}
            className="w-full px-2 py-1.5 text-[12px] text-[#71717a] border border-[#e4e4e7] rounded-[5px] focus:outline-none focus:border-[#e91e8c]/50 bg-white"
          />
        ) : (
          <button
            type="button"
            onClick={() => setMostrarNotaItem(true)}
            className="text-xs text-[var(--text-muted)] hover:text-[#e91e8c] transition-colors"
          >
            + nota
          </button>
        )}

        {/* Botón terminaciones */}
        <button
          type="button"
          onClick={() => setMostrarTerms(!mostrarTerms)}
          className="text-xs text-[var(--text-secondary)] hover:text-[#7c3aed] transition-colors flex items-center gap-1"
        >
          <Plus className="w-3 h-3" />
          {termFields.length > 0
            ? `${termFields.length} terminación${termFields.length !== 1 ? 'es' : ''}`
            : 'Agregar terminación'}
        </button>
      </div>

      {/* Panel de terminaciones */}
      {mostrarTerms && (
        <div className="border-t border-gray-100 bg-gray-50/50 p-4 space-y-3">
          <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
            Terminaciones
          </p>

          {termFields.map((_tField, tIndex) => (
            <TerminacionRow
              key={_tField.id}
              itemIndex={index}
              termIndex={tIndex}
              register={register}
              watch={watch}
              setValue={setValue}
              removeTerm={removeTerm}
              terminaciones={terminaciones}
            />
          ))}

          <button
            type="button"
            onClick={() =>
              appendTerm({ terminacion_id: null, nombre: '', precio: 0, cantidad: 1 })
            }
            className="text-xs text-[var(--text-muted)] hover:text-[#7c3aed] transition-colors flex items-center gap-1"
          >
            <Plus className="w-3 h-3" />
            Agregar terminación
          </button>
        </div>
      )}
    </div>
  )
}

// ── Subcomponente: fila de terminación ──────────────────────────────────────

interface TerminacionRowProps {
  itemIndex:    number
  termIndex:    number
  register:     UseFormRegister<FormValues>
  watch:        UseFormWatch<FormValues>
  setValue:     UseFormSetValue<FormValues>
  removeTerm:   (index: number) => void
  terminaciones: TerminacionOption[]
}

function TerminacionRow({
  itemIndex,
  termIndex,
  register,
  watch,
  setValue,
  removeTerm,
  terminaciones,
}: TerminacionRowProps) {
  const precio   = Number(watch(`items.${itemIndex}.terminaciones.${termIndex}.precio`))   || 0
  const cantidad = Number(watch(`items.${itemIndex}.terminaciones.${termIndex}.cantidad`)) || 1

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <select
        onChange={(e) => {
          const found = terminaciones.find((t) => t.id === e.target.value)
          if (found) {
            setValue(`items.${itemIndex}.terminaciones.${termIndex}.terminacion_id`, found.id)
            setValue(`items.${itemIndex}.terminaciones.${termIndex}.nombre`, found.nombre)
            setValue(`items.${itemIndex}.terminaciones.${termIndex}.precio`, found.precio)
          } else {
            setValue(`items.${itemIndex}.terminaciones.${termIndex}.terminacion_id`, null)
          }
        }}
        defaultValue=""
        className={`${INPUT_BASE} flex-1 min-w-[160px]`}
      >
        <option value="">Seleccionar predefinida...</option>
        {terminaciones.map((t) => (
          <option key={t.id} value={t.id}>{t.nombre}</option>
        ))}
      </select>
      <input
        type="text"
        placeholder="Nombre libre"
        {...register(`items.${itemIndex}.terminaciones.${termIndex}.nombre`)}
        className={`${INPUT_BASE} w-32`}
      />
      <input
        type="number"
        min={0}
        step={1}
        placeholder="Precio"
        {...register(`items.${itemIndex}.terminaciones.${termIndex}.precio`, { valueAsNumber: true })}
        className={`${INPUT_BASE} w-24 text-right`}
      />
      <input
        type="number"
        min={1}
        step={1}
        {...register(`items.${itemIndex}.terminaciones.${termIndex}.cantidad`, { valueAsNumber: true })}
        className={`${INPUT_BASE} w-16 text-right`}
      />
      <div className={`${INPUT_BASE} bg-gray-50 text-[var(--text-secondary)] text-right w-24`}>
        {formatCLP(Math.round(precio * cantidad))}
      </div>
      <button
        type="button"
        onClick={() => removeTerm(termIndex)}
        className="p-1 text-gray-300 hover:text-red-400 transition-colors"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}
