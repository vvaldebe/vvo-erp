import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import NuevaCotizacionForm from '@/components/cotizaciones/NuevaCotizacionForm'
import { generarNumeroCotizacion } from '@/lib/utils/numeracion'
import type { NivelPrecio, UnidadMedida } from '@/types/database.types'

export default async function NuevaCotizacionPage() {
  const supabase = await createClient()

  // Obtener número correlativo
  const { count } = await supabase
    .from('cotizaciones')
    .select('*', { count: 'exact', head: true })

  const numeroCotizacion = generarNumeroCotizacion((count ?? 0) + 1)

  // Fetch clientes activos
  const { data: clientesData } = await supabase
    .from('clientes')
    .select('id, nombre, nivel_precio, descuento_porcentaje')
    .order('nombre')

  // Fetch productos activos con categoría
  const { data: productosData } = await supabase
    .from('productos')
    .select(`
      id,
      nombre,
      unidad,
      precio_normal,
      precio_empresa,
      precio_agencia,
      categorias ( nombre )
    `)
    .eq('activo', true)
    .order('nombre')

  // Fetch terminaciones activas
  const { data: terminacionesData } = await supabase
    .from('terminaciones')
    .select('id, nombre, unidad, precio')
    .eq('activo', true)
    .order('nombre')

  // Fetch servicios de máquina activos (para precio/minuto en productos láser/CNC)
  const { data: serviciosMaquinaData } = await supabase
    .from('servicios_maquina')
    .select('id, nombre, tipo, precio_minuto_normal, precio_minuto_empresa, precio_minuto_agencia, minimo_minutos')
    .eq('activo', true)
    .order('nombre')

  // Normalizar datos
  type RawProducto = NonNullable<typeof productosData>[number]
  function getCatNombre(cat: RawProducto['categorias']): string {
    if (!cat) return 'Sin categoría'
    if (Array.isArray(cat)) return (cat as { nombre: string }[])[0]?.nombre ?? 'Sin categoría'
    return (cat as { nombre: string }).nombre ?? 'Sin categoría'
  }

  const clientes = (clientesData ?? []).map((c) => ({
    id:                   c.id,
    nombre:               c.nombre,
    nivel_precio:         c.nivel_precio as NivelPrecio,
    descuento_porcentaje: c.descuento_porcentaje ?? 0,
  }))

  const productos = (productosData ?? []).map((p) => ({
    id:             p.id,
    nombre:         p.nombre,
    categoria:      getCatNombre(p.categorias),
    unidad:         p.unidad as UnidadMedida,
    precio_normal:  p.precio_normal,
    precio_empresa: p.precio_empresa,
    precio_agencia: p.precio_agencia,
  }))

  const terminaciones = (terminacionesData ?? []).map((t) => ({
    id:     t.id,
    nombre: t.nombre,
    unidad: t.unidad as UnidadMedida,
    precio: t.precio,
  }))

  const serviciosMaquina = (serviciosMaquinaData ?? []).map((s) => ({
    id:                      s.id,
    nombre:                  s.nombre,
    tipo:                    s.tipo,
    precio_minuto_normal:    s.precio_minuto_normal,
    precio_minuto_empresa:   s.precio_minuto_empresa,
    precio_minuto_agencia:   s.precio_minuto_agencia,
    minimo_minutos:          s.minimo_minutos,
  }))

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/cotizaciones"
          className="w-8 h-8 rounded-[6px] border border-[var(--border-default)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:border-[var(--border-default)] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-[20px] font-semibold text-[var(--text-primary)]">Nueva cotización</h1>
          <p className="text-[13px] text-[var(--text-secondary)] mt-0.5">
            <span className="font-semibold text-[#7c3aed]">{numeroCotizacion}</span>
          </p>
        </div>
      </div>

      <NuevaCotizacionForm
        numeroCotizacion={numeroCotizacion}
        clientes={clientes}
        productos={productos}
        terminaciones={terminaciones}
        serviciosMaquina={serviciosMaquina}
      />

    </div>
  )
}
