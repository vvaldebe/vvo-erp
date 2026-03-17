import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import NuevaCotizacionForm from '@/components/cotizaciones/NuevaCotizacionForm'
import type { NivelPrecio, UnidadMedida } from '@/types/database.types'

export default async function EditarCotizacionPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  // Solo se puede editar borradores
  const { data: cot, error } = await supabase
    .from('cotizaciones')
    .select(`
      id, numero, estado, nivel_precio, notas, valida_hasta, cliente_id,
      clientes ( id, nombre, nivel_precio, descuento_porcentaje )
    `)
    .eq('id', id)
    .single()

  if (error || !cot) notFound()
  if (cot.estado !== 'borrador') redirect(`/cotizaciones/${id}`)

  // Ítems con terminaciones
  const { data: itemsData } = await supabase
    .from('cotizacion_items')
    .select('id, producto_id, descripcion, ancho, alto, cantidad, precio_unitario, subtotal, orden, notas_item, productos(id, nombre, unidad, precio_normal, precio_empresa, precio_agencia, categorias(nombre))')
    .eq('cotizacion_id', id)
    .order('orden')

  const { data: termsData } = await supabase
    .from('cotizacion_item_terminaciones')
    .select('cotizacion_item_id, terminacion_id, nombre, precio, cantidad')
    .in('cotizacion_item_id', (itemsData ?? []).map((i) => i.id))

  const termsByItem: Record<string, { terminacion_id: string | null; nombre: string; precio: number; cantidad: number }[]> = {}
  for (const t of termsData ?? []) {
    if (!termsByItem[t.cotizacion_item_id]) termsByItem[t.cotizacion_item_id] = []
    termsByItem[t.cotizacion_item_id].push({
      terminacion_id: t.terminacion_id,
      nombre: t.nombre,
      precio: t.precio,
      cantidad: t.cantidad,
    })
  }

  // Datos paralelos
  const [{ data: clientesData }, { data: productosData }, { data: terminacionesData }, { data: serviciosMaquinaData }] = await Promise.all([
    supabase.from('clientes').select('id, nombre, nivel_precio, descuento_porcentaje').order('nombre'),
    supabase.from('productos').select('id, nombre, unidad, precio_normal, precio_empresa, precio_agencia, categorias(nombre)').eq('activo', true).order('nombre'),
    supabase.from('terminaciones').select('id, nombre, unidad, precio').eq('activo', true).order('nombre'),
    supabase.from('servicios_maquina').select('id, nombre, tipo, precio_minuto_normal, precio_minuto_empresa, precio_minuto_agencia, minimo_minutos').eq('activo', true).order('nombre'),
  ])

  type RawProducto = NonNullable<typeof productosData>[number]
  function getCatNombre(cat: RawProducto['categorias']): string {
    if (!cat) return 'Sin categoría'
    if (Array.isArray(cat)) return (cat as { nombre: string }[])[0]?.nombre ?? 'Sin categoría'
    return (cat as { nombre: string }).nombre
  }

  const clientes = (clientesData ?? []).map((c) => ({
    id: c.id, nombre: c.nombre,
    nivel_precio: c.nivel_precio as NivelPrecio,
    descuento_porcentaje: c.descuento_porcentaje ?? 0,
  }))

  const productos = (productosData ?? []).map((p) => ({
    id: p.id, nombre: p.nombre,
    categoria: getCatNombre(p.categorias),
    unidad: p.unidad as UnidadMedida,
    precio_normal: p.precio_normal,
    precio_empresa: p.precio_empresa,
    precio_agencia: p.precio_agencia,
  }))

  const terminaciones = (terminacionesData ?? []).map((t) => ({
    id: t.id, nombre: t.nombre,
    unidad: t.unidad as UnidadMedida,
    precio: t.precio,
  }))

  const serviciosMaquina = (serviciosMaquinaData ?? []).map((s) => ({
    id:                    s.id,
    nombre:                s.nombre,
    tipo:                  s.tipo,
    precio_minuto_normal:  s.precio_minuto_normal,
    precio_minuto_empresa: s.precio_minuto_empresa,
    precio_minuto_agencia: s.precio_minuto_agencia,
    minimo_minutos:        s.minimo_minutos,
  }))

  // Construir initialItems con datos de producto para pre-llenar
  const clienteRaw = Array.isArray(cot.clientes) ? cot.clientes[0] : cot.clientes

  const initialItems = (itemsData ?? []).map((item) => {
    const prod = Array.isArray(item.productos) ? item.productos[0] : item.productos
    return {
      producto_id:     item.producto_id ?? null,
      descripcion:     item.descripcion ?? null,
      ancho:           item.ancho ?? null,
      alto:            item.alto ?? null,
      cantidad:        item.cantidad,
      precio_unitario: item.precio_unitario,
      subtotal:        item.subtotal,
      orden:           item.orden,
      notas_item:      item.notas_item ?? null,
      terminaciones:   termsByItem[item.id] ?? [],
      _producto: prod ? {
        id:             prod.id,
        nombre:         prod.nombre,
        unidad:         prod.unidad as UnidadMedida,
        categoria:      getCatNombre(prod.categorias),
        precio_normal:  prod.precio_normal,
        precio_empresa: prod.precio_empresa,
        precio_agencia: prod.precio_agencia,
      } : null,
    }
  })

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Link
          href={`/cotizaciones/${id}`}
          className="w-8 h-8 rounded-[6px] border border-[var(--border-default)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:border-[var(--border-default)] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-[20px] font-semibold text-[var(--text-primary)]">Editar cotización</h1>
          <p className="text-[13px] text-[var(--text-secondary)] mt-0.5">
            <span className="font-mono text-[var(--text-accent)] font-semibold">{cot.numero}</span>
          </p>
        </div>
      </div>

      <NuevaCotizacionForm
        numeroCotizacion={cot.numero}
        clientes={clientes}
        productos={productos}
        terminaciones={terminaciones}
        serviciosMaquina={serviciosMaquina}
        cotizacionId={id}
        initialCliente={clienteRaw ? {
          id: clienteRaw.id,
          nombre: clienteRaw.nombre,
          nivel_precio: clienteRaw.nivel_precio as NivelPrecio,
          descuento_porcentaje: clienteRaw.descuento_porcentaje ?? 0,
        } : null}
        initialNivel={cot.nivel_precio as NivelPrecio}
        initialNotas={cot.notas ?? ''}
        initialValidaHasta={cot.valida_hasta ?? ''}
        initialItems={initialItems}
      />
    </div>
  )
}
