'use client'

import { useState, useTransition, useCallback, useEffect, useRef } from 'react'
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
import { Plus, X, Loader2, AlertCircle, ChevronDown, LayoutTemplate } from 'lucide-react'
import { crearCotizacion, actualizarCotizacion } from '@/app/actions/cotizaciones'
import PlantillaModal from './PlantillaModal'
import type { Plantilla } from '@/app/actions/plantillas'
import {
  getPrecioNivel,
  calcularIva,
  formatCLP,
} from '@/lib/utils/calculos'
import type { NivelPrecio, UnidadMedida } from '@/types/database.types'

const DRAFT_KEY = 'vvo_cotizacion_draft'

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
  titulo_item:     string | null
  descripcion:     string | null
  ancho:           number | null
  alto:            number | null
  cantidad:        number
  precio_unitario: number
  subtotal:        number
  orden:           number
  notas_item:      string | null
  unidad:          UnidadMedida | null
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
  initialAsunto?:     string
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
  titulo_item:     z.string().optional().nullable(),
  descripcion:     z.string().optional().nullable(),
  ancho:           z.number().min(0).optional().nullable(),
  alto:            z.number().min(0).optional().nullable(),
  cantidad:        z.number().int().min(1),
  precio_unitario: z.number().min(0),
  subtotal:        z.number().min(0),
  orden:           z.number().int().min(0),
  notas_item:      z.string().optional().nullable(),
  unidad:          z.enum(['m2', 'ml', 'unidad']),
  terminaciones:   z.array(terminacionItemSchema),
})

const formSchema = z.object({
  valida_hasta: z.string().optional().nullable(),
  nivel_precio: z.enum(['normal', 'empresa', 'agencia', 'especial']),
  notas:        z.string().optional().nullable(),
  asunto:       z.string().optional().nullable(),
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
  initialAsunto     = '',
  initialValidaHasta,
  initialItems      = [],
}: Props) {
  const hoy = todayISO()
  const esEdicion = !!cotizacionId
  const [isPending, startTransition] = useTransition()
  const [serverError, setServerError] = useState<string | null>(null)
  const [draftBanner, setDraftBanner] = useState(false)
  const [draftRestored, setDraftRestored] = useState(false)
  const [showPlantillaModal, setShowPlantillaModal] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      valida_hasta: initialValidaHasta || addDays(hoy, 3),
      nivel_precio: initialNivel,
      notas:        initialNotas,
      asunto:       initialAsunto,
      items:        initialItems.map((item) => ({
        producto_id:     item.producto_id,
        titulo_item:     item.titulo_item ?? null,
        descripcion:     item.descripcion,
        ancho:           item.ancho,
        alto:            item.alto,
        cantidad:        item.cantidad,
        precio_unitario: item.precio_unitario,
        subtotal:        item.subtotal,
        orden:           item.orden,
        notas_item:      item.notas_item ?? null,
        unidad:          (item.unidad ?? item._producto?.unidad ?? 'm2') as UnidadMedida,
        terminaciones:   item.terminaciones,
      })),
    },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'items' })

  // Watch en tiempo real para resumen
  const watchedItems = useWatch({ control, name: 'items' })
  const nivel        = watch('nivel_precio')
  const watchedNotas = watch('notas')
  const watchedAsunto = watch('asunto')
  const watchedValida = watch('valida_hasta')

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

  // Recalcular precios de ítems cuando cambia el nivel de precio
  const prevNivelRef = useRef<NivelPrecio>(initialNivel)
  useEffect(() => {
    if (nivel === prevNivelRef.current) return
    prevNivelRef.current = nivel
    const currentItems = watchedItems ?? []
    currentItems.forEach((item, index) => {
      // Solo recalcular ítems que tienen un producto asignado
      // Para eso necesitamos acceder a _producto del initialItems o al producto seleccionado
      // Los productos están en el array `productos` prop; buscamos por producto_id
      if (!item?.producto_id) return
      const prod = productos.find((p) => p.id === item.producto_id)
      if (!prod) return
      const nuevoPrecio = getPrecioNivel(prod, nivel, clienteSeleccionado?.descuento_porcentaje ?? 0)
      setValue(`items.${index}.precio_unitario`, nuevoPrecio)
      // Recalcular subtotal del ítem
      const ancho = Number(item.ancho) || 0
      const alto  = Number(item.alto)  || 0
      const cantidad = Number(item.cantidad) || 1
      const unidad = prod.unidad
      let nuevoSubtotal = 0
      if (unidad === 'm2') nuevoSubtotal = nuevoPrecio * ancho * alto * cantidad
      else if (unidad === 'ml') nuevoSubtotal = nuevoPrecio * ancho * cantidad
      else nuevoSubtotal = nuevoPrecio * cantidad
      setValue(`items.${index}.subtotal`, nuevoSubtotal)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nivel])

  // Autoguardado en localStorage (solo nueva cotización, no edición)
  useEffect(() => {
    if (esEdicion) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      try {
        const draft = {
          nivel_precio: nivel,
          notas:        watchedNotas,
          asunto:       watchedAsunto,
          valida_hasta: watchedValida,
          cliente_id:   clienteSeleccionado?.id ?? null,
          items:        watchedItems,
        }
        localStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
      } catch {
        // localStorage no disponible
      }
    }, 2000)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nivel, watchedNotas, watchedAsunto, watchedValida, clienteSeleccionado, watchedItems, esEdicion])

  // Leer draft al montar (solo nueva cotización)
  useEffect(() => {
    if (esEdicion || draftRestored) return
    try {
      const raw = localStorage.getItem(DRAFT_KEY)
      if (!raw) return
      const draft = JSON.parse(raw)
      if (draft && draft.items && Array.isArray(draft.items) && draft.items.length > 0) {
        setDraftBanner(true)
      }
    } catch {
      // ignora errores de parse
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function restaurarDraft() {
    try {
      const raw = localStorage.getItem(DRAFT_KEY)
      if (!raw) return
      const draft = JSON.parse(raw)
      reset({
        nivel_precio: draft.nivel_precio ?? 'normal',
        notas:        draft.notas        ?? '',
        asunto:       draft.asunto       ?? '',
        valida_hasta: draft.valida_hasta ?? addDays(hoy, 3),
        items:        draft.items        ?? [],
      })
      if (draft.cliente_id) {
        const cli = clientes.find((c) => c.id === draft.cliente_id)
        if (cli) setClienteSeleccionado(cli)
      }
    } catch {
      // ignora
    }
    setDraftBanner(false)
    setDraftRestored(true)
  }

  function descartarDraft() {
    try { localStorage.removeItem(DRAFT_KEY) } catch { /* ignora */ }
    setDraftBanner(false)
    setDraftRestored(true)
  }

  const clientesFiltrados = clientes
    .filter((c) => c.nombre.toLowerCase().includes(clienteQuery.toLowerCase()))
    .slice(0, 30)

  // Agregar ítem vacío
  function agregarItem() {
    append({
      producto_id:     null,
      titulo_item:     null,
      descripcion:     null,
      ancho:           1,
      alto:            1,
      cantidad:        1,
      precio_unitario: 0,
      subtotal:        0,
      orden:           fields.length,
      notas_item:      null,
      unidad:          'm2',
      terminaciones:   [],
    })
  }

  // Agregar ítems desde plantilla
  function handlePlantillaSelect(plantilla: Plantilla) {
    const currentLength = fields.length
    for (let i = 0; i < plantilla.items.length; i++) {
      const item = plantilla.items[i]
      // Try to resolve the product to get its unidad
      const prod = item.producto_id ? productos.find((p) => p.id === item.producto_id) : null
      append({
        producto_id:     item.producto_id,
        titulo_item:     null,
        descripcion:     item.descripcion ?? '',
        ancho:           item.ancho ?? 1,
        alto:            item.alto ?? 1,
        cantidad:        item.cantidad,
        precio_unitario: 0,
        subtotal:        0,
        orden:           currentLength + i,
        notas_item:      null,
        unidad:          prod?.unidad ?? 'm2',
        terminaciones:   [],
      })
    }
  }

  // Guardar cotización
  function onSubmit(values: FormValues) {
    setServerError(null)
    const payload = {
      numero:       numeroCotizacion,
      cliente_id:   clienteSeleccionado?.id ?? null,
      nivel_precio: values.nivel_precio,
      notas:        values.notas ?? null,
      asunto:       values.asunto ?? null,
      valida_hasta: values.valida_hasta ?? null,
      items:        values.items.map((it, idx) => ({
        producto_id:     it.producto_id ?? null,
        titulo_item:     it.titulo_item ?? null,
        descripcion:     it.descripcion ?? null,
        ancho:           it.ancho ?? null,
        alto:            it.alto ?? null,
        cantidad:        it.cantidad,
        precio_unitario: it.precio_unitario,
        subtotal:        it.subtotal,
        orden:           idx,
        notas_item:      it.notas_item ?? null,
        unidad:          it.unidad ?? 'm2',
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
      } else {
        // Limpiar draft en caso de éxito (el server action redirige)
        if (!esEdicion) {
          try { localStorage.removeItem(DRAFT_KEY) } catch { /* ignora */ }
        }
      }
      // Si éxito, el server action redirige
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>

      {/* ── Barra sticky móvil: total + guardar ── */}
      <div className="lg:hidden fixed bottom-[56px] left-0 right-0 z-20 bg-[var(--bg-topbar)] border-t border-[var(--border-default)] px-4 py-2.5 flex items-center justify-between gap-3 shadow-lg md:left-[220px]">
        <div className="text-sm">
          <span className="text-[var(--text-muted)] text-xs">Total</span>
          <p className="font-bold text-[#7c3aed] tabular-nums leading-tight">{formatCLP(Math.round(totalVal))}</p>
        </div>
        <button
          type="submit"
          disabled={isPending}
          className="px-5 py-2 bg-[#7c3aed] hover:bg-[#6d28d9] text-white text-sm font-semibold rounded-[6px] transition-colors flex items-center gap-2 disabled:opacity-70 shrink-0"
        >
          {isPending ? <><Loader2 className="w-4 h-4 animate-spin" />{esEdicion ? 'Guardando...' : 'Guardando...'}</> : (esEdicion ? 'Guardar cambios' : 'Guardar')}
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 items-start pb-16 lg:pb-0">

        {/* ── Columna izquierda ──────────────────────────────────── */}
        <div className="flex-1 min-w-0 space-y-5 w-full">

          {/* Banner de borrador recuperado */}
          {draftBanner && (
            <div className="flex items-center justify-between gap-3 rounded-[6px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              <span>Borrador recuperado — ¿Continuar donde lo dejaste?</span>
              <div className="flex gap-2 shrink-0">
                <button
                  type="button"
                  onClick={restaurarDraft}
                  className="font-semibold hover:text-amber-900 underline"
                >
                  Sí, continuar
                </button>
                <button
                  type="button"
                  onClick={descartarDraft}
                  className="text-amber-600 hover:text-amber-800"
                >
                  Descartar
                </button>
              </div>
            </div>
          )}

          {serverError && (
            <div className="flex items-center gap-2 rounded-[6px] border border-red-100 bg-red-50 p-4 text-sm text-red-600">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {serverError}
            </div>
          )}

          {/* Sección 1: Encabezado */}
          <section className="bg-[var(--bg-card)] rounded-[8px] border border-[var(--border-default)] p-4 sm:p-6 space-y-5">
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
            {/* Asunto / referencia */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider block">
                Asunto / referencia
              </label>
              <input
                type="text"
                {...register('asunto')}
                placeholder="Ej: Señalética tienda, Banner evento, Letrero fachada..."
                className="flex h-10 w-full rounded-md border border-[var(--border-default)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/10 focus:border-[#7c3aed] transition-colors"
              />
            </div>
          </section>

          {/* Sección 2: Cliente y nivel */}
          <section className="bg-[var(--bg-card)] rounded-[8px] border border-[var(--border-default)] p-4 sm:p-6 space-y-5">
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
          <section className="bg-[var(--bg-card)] rounded-[8px] border border-[var(--border-default)] p-4 sm:p-6 space-y-4">
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
                initialTituloItem={initialItems[index]?.titulo_item ?? null}
                initialDescripcion={initialItems[index]?.descripcion ?? null}
              />
            ))}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={agregarItem}
                className="flex-1 py-2.5 border-2 border-dashed border-[var(--border-default)] rounded-[6px] text-sm text-[var(--text-muted)] hover:border-[#7c3aed]/40 hover:text-[#7c3aed] transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Agregar ítem
              </button>
              <button
                type="button"
                onClick={() => setShowPlantillaModal(true)}
                className="py-2.5 px-4 border-2 border-dashed border-[var(--border-default)] rounded-[6px] text-sm text-[var(--text-muted)] hover:border-[#7c3aed]/40 hover:text-[#7c3aed] transition-colors flex items-center gap-2 shrink-0"
              >
                <LayoutTemplate className="w-4 h-4" />
                Usar plantilla
              </button>
            </div>

            {showPlantillaModal && (
              <PlantillaModal
                onSelect={handlePlantillaSelect}
                onClose={() => setShowPlantillaModal(false)}
              />
            )}
          </section>

          {/* Sección 4: Notas */}
          <section className="bg-[var(--bg-card)] rounded-[8px] border border-[var(--border-default)] p-4 sm:p-6 space-y-3">
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
        <div className="w-full lg:w-80 lg:flex-shrink-0 lg:sticky lg:top-6 space-y-3">
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

            <div className="hidden lg:flex flex-col gap-2 pt-1">
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
  initialTituloItem?: string | null
  initialDescripcion?: string | null
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
  initialTituloItem,
  initialDescripcion,
}: ItemRowProps) {
  const hasInitialProduct = initialProducto != null
  // productoQuery drives the dropdown filter — read directly from RHF so it's always in sync with what gets saved
  const productoQuery = (watch(`items.${index}.titulo_item`) as string) ?? ''
  const setProductoQuery = (val: string) => setValue(`items.${index}.titulo_item`, val || null)
  const [productoDropdown, setProductoDropdown] = useState(false)
  const [productoSel,      setProductoSel]      = useState<ProductoOption | null>(initialProducto ?? null)
  const [mostrarTerms,     setMostrarTerms]      = useState(false)
  const [esMinutos,        setEsMinutos]         = useState(() => detectarModoMinutos(initialProducto?.nombre ?? ''))
  const [minimoMinutos,    setMinimoMinutos]     = useState<number | null>(null)
  const [mostrarNotaItem,  setMostrarNotaItem]   = useState(false)

  const { fields: termFields, append: appendTerm, remove: removeTerm } =
    useFieldArray({ control, name: `items.${index}.terminaciones` as const })

  const ancho    = Number(watch(`items.${index}.ancho`))    || 0
  const alto     = Number(watch(`items.${index}.alto`))     || 0
  const cantidad = Number(watch(`items.${index}.cantidad`)) || 1
  const precioU  = Number(watch(`items.${index}.precio_unitario`)) || 0

  // Bug 1 & 5: unidad is now stored in form state, not derived from productoSel only
  const unidad: UnidadMedida = (watch(`items.${index}.unidad`) as UnidadMedida) ?? 'm2'

  const subtotalCalc = calcItemSubtotal(unidad, precioU, ancho, alto, cantidad)

  // Sync subtotal en efecto para evitar loop de re-renders
  useEffect(() => {
    setValue(`items.${index}.subtotal`, subtotalCalc, { shouldValidate: false })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subtotalCalc, index])

  const productosFiltrados = productos
    .filter((p) => p.nombre.toLowerCase().includes(productoQuery.toLowerCase()))
    .slice(0, 25)

  // Bug 1: handler for manual unidad type change (when no catalog product is selected)
  function cambiarUnidad(nuevaUnidad: UnidadMedida) {
    setValue(`items.${index}.unidad`, nuevaUnidad)
    // Clear irrelevant dimension fields
    if (nuevaUnidad === 'unidad') {
      setValue(`items.${index}.ancho`, null)
      setValue(`items.${index}.alto`, null)
    } else if (nuevaUnidad === 'ml') {
      setValue(`items.${index}.alto`, null)
    }
  }

  function seleccionarProducto(p: ProductoOption) {
    setProductoSel(p)
    setValue(`items.${index}.titulo_item`, null)
    setProductoDropdown(false)
    const modoMinutos = detectarModoMinutos(p.nombre)
    setEsMinutos(modoMinutos)
    setValue(`items.${index}.producto_id`, p.id)

    // Bug 1 & 5: set unidad in form state from product
    setValue(`items.${index}.unidad`, p.unidad)

    // Clear alto when product is unidad or ml type
    if (p.unidad === 'unidad') {
      setValue(`items.${index}.ancho`, null)
      setValue(`items.${index}.alto`, null)
    } else if (p.unidad === 'ml') {
      setValue(`items.${index}.alto`, null)
    }

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

  // Derived flags for field visibility
  const mostrarAncho   = !esMinutos && unidad !== 'unidad'
  const mostrarAlto    = !esMinutos && unidad === 'm2'
  const mostrarAreaM2  = !esMinutos && unidad === 'm2'

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
                    // Keep unidad as-is so user can manually adjust
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
                  placeholder="Título del ítem (ej: Señalética tienda)"
                  {...register(`items.${index}.titulo_item`)}
                  onChange={(e) => {
                    setValue(`items.${index}.titulo_item`, e.target.value || null)
                    setProductoDropdown(true)
                  }}
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
            {/* Descripción — siempre visible para ambos tipos de ítem */}
            <input
              type="text"
              placeholder={productoSel ? 'Descripción adicional (opcional)' : 'Descripción del ítem (opcional)'}
              {...register(`items.${index}.descripcion`)}
              className={`${INPUT_BASE} w-full mt-1`}
            />
            {/* Bug 1: Selector de tipo de unidad — visible solo cuando no hay producto seleccionado del catálogo */}
            {!productoSel && !esMinutos && (
              <div className="flex items-center gap-1 mt-1.5">
                {(['m2', 'ml', 'unidad'] as const).map((u) => (
                  <button
                    key={u}
                    type="button"
                    onClick={() => cambiarUnidad(u)}
                    className={`px-2.5 py-1 text-xs rounded-[4px] border transition-colors font-medium ${
                      unidad === u
                        ? 'bg-[#7c3aed] border-[#7c3aed] text-white'
                        : 'border-[var(--border-default)] text-[var(--text-secondary)] hover:border-[#7c3aed]/40 hover:text-[#7c3aed]'
                    }`}
                  >
                    {u === 'm2' ? 'm²' : u === 'ml' ? 'Metro lineal' : 'Unidad'}
                  </button>
                ))}
              </div>
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
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {/* Bug 1 & 5: Ancho — shown for m2 and ml, hidden for unidad and minutos */}
          {mostrarAncho && (
            <div className="space-y-1">
              <label className="text-xs text-[var(--text-secondary)] font-semibold uppercase tracking-wider block">
                {unidad === 'ml' ? 'Metros (ml)' : 'Ancho (m)'}
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
          {/* Bug 1 & 5: Alto — shown only for m2, hidden for ml and unidad */}
          {mostrarAlto && (
            <div className="space-y-1">
              <label className="text-xs text-[var(--text-secondary)] font-semibold uppercase tracking-wider block">
                Alto (m)
              </label>
              <input
                type="number"
                step="0.01"
                min={0}
                {...register(`items.${index}.alto`, { valueAsNumber: true })}
                className={`${INPUT_BASE} w-full`}
                placeholder="0.00"
              />
            </div>
          )}
          {/* m² display — shown only for m2 */}
          {mostrarAreaM2 && (
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
              {esMinutos ? '$/min' : unidad === 'm2' ? 'Precio/m²' : unidad === 'ml' ? 'Precio/ml' : 'Precio/u'}
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
            className="w-full px-2 py-1.5 text-[12px] text-[var(--text-muted)] border border-[var(--border-default)] rounded-[5px] focus:outline-none focus:border-[#e91e8c]/50 bg-[var(--bg-input)]"
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
