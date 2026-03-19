import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generarCotizacionPDF } from '@/lib/pdf/generarCotizacion'
import { enviarCotizacion } from '@/lib/email/resend'
import { generarTokenAprobacion } from '@/app/actions/cotizaciones'

const CONFIG_CLAVES = [
  'empresa_nombre', 'empresa_rut', 'empresa_giro',
  'empresa_direccion', 'empresa_telefono', 'empresa_email', 'empresa_web',
  'banco_nombre', 'banco_tipo_cuenta', 'banco_numero_cuenta',
  'banco_titular', 'banco_rut_titular', 'banco_email_transferencia',
  'condiciones_pago',
]

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await req.json().catch(() => ({}))
  const asunto: string | undefined = body.asunto
  const cuerpo: string | undefined = body.cuerpo
  const ccExtra: string[] = Array.isArray(body.cc) ? body.cc : []
  const toOverride: string | undefined = typeof body.to === 'string' ? body.to : undefined
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  // Cotización + cliente
  const { data: cot, error: cotError } = await supabase
    .from('cotizaciones')
    .select(`
      id, numero, estado, nivel_precio, subtotal, iva, total, descuento_global,
      notas, created_at, valida_hasta,
      clientes ( nombre, rut, email, telefono, direccion )
    `)
    .eq('id', id)
    .single()

  if (cotError || !cot) {
    return NextResponse.json({ error: 'Cotización no encontrada' }, { status: 404 })
  }

  const clienteRaw = Array.isArray(cot.clientes) ? cot.clientes[0] : cot.clientes

  if (!toOverride && !clienteRaw?.email) {
    return NextResponse.json(
      { error: 'El cliente no tiene email registrado' },
      { status: 422 }
    )
  }

  // Configuración empresa/banco
  const { data: configRows } = await supabase
    .from('configuracion')
    .select('clave, valor')
    .in('clave', CONFIG_CLAVES)

  function cfg(clave: string, fallback = '') {
    return configRows?.find((r) => r.clave === clave)?.valor ?? fallback
  }

  // Ítems
  const { data: items } = await supabase
    .from('cotizacion_items')
    .select('id, producto_id, titulo_item, descripcion, notas_item, ancho, alto, cantidad, precio_unitario, subtotal, descuento, orden')
    .eq('cotizacion_id', id)
    .order('orden')

  const itemIds = (items ?? []).map((i) => i.id)
  const terminacionesPorItem: Record<string, { nombre: string; precio: number; cantidad: number }[]> = {}

  if (itemIds.length > 0) {
    const { data: terms } = await supabase
      .from('cotizacion_item_terminaciones')
      .select('cotizacion_item_id, nombre, precio, cantidad')
      .in('cotizacion_item_id', itemIds)

    for (const t of terms ?? []) {
      if (!terminacionesPorItem[t.cotizacion_item_id]) terminacionesPorItem[t.cotizacion_item_id] = []
      terminacionesPorItem[t.cotizacion_item_id].push({ nombre: t.nombre, precio: t.precio, cantidad: t.cantidad })
    }
  }

  // Ítems con producto_ids para lookup separado
  const productIds = [...new Set((items ?? [])
    .map((i) => (i as typeof i & { producto_id?: string | null }).producto_id)
    .filter(Boolean) as string[])]
  const productoMapEmail: Record<string, { nombre: string; unidad: string }> = {}
  if (productIds.length > 0) {
    const { data: prods } = await supabase.from('productos').select('id, nombre, unidad').in('id', productIds)
    for (const p of prods ?? []) productoMapEmail[p.id] = { nombre: p.nombre, unidad: p.unidad }
  }

  // Generar PDF
  const pdfData = {
    numero:          cot.numero,
    fecha:           cot.created_at,
    valida_hasta:    cot.valida_hasta,
    nivel_precio:    cot.nivel_precio,
    subtotal:        cot.subtotal,
    iva:             cot.iva,
    total:           cot.total,
    notas:           cot.notas,
    descuento_global: (cot as typeof cot & { descuento_global?: number }).descuento_global ?? 0,
    cliente: {
      nombre:    clienteRaw.nombre,
      rut:       clienteRaw.rut ?? null,
      email:     clienteRaw.email,
      telefono:  clienteRaw.telefono ?? null,
      direccion: clienteRaw.direccion ?? null,
    },
    items: (items ?? []).map((item) => {
      const itemAny = item as typeof item & { producto_id?: string | null; titulo_item?: string | null; notas_item?: string | null; descuento?: number }
      const prod = itemAny.producto_id ? productoMapEmail[itemAny.producto_id] ?? null : null
      const titulo = prod?.nombre ?? itemAny.titulo_item ?? item.descripcion ?? 'Ítem'
      const subtituloDesc = prod?.nombre
        ? (item.descripcion && item.descripcion !== prod.nombre ? item.descripcion : null)
        : itemAny.titulo_item ? (item.descripcion ?? null) : null
      return {
        descripcion:     titulo,
        subtitulo:       subtituloDesc,
        producto_nombre: prod?.nombre ?? null,
        notas_item:      itemAny.notas_item ?? null,
        ancho:           item.ancho,
        alto:            item.alto,
        cantidad:        item.cantidad,
        precio_unitario: item.precio_unitario,
        subtotal:        item.subtotal,
        unidad:          prod?.unidad ?? 'unidad',
        terminaciones:   terminacionesPorItem[item.id] ?? [],
        descuento:       itemAny.descuento ?? 0,
      }
    }),
    // Datos de empresa desde configuración
    empresaNombre:    cfg('empresa_nombre',    'VVO Publicidad') || undefined,
    empresaRut:       cfg('empresa_rut')       || undefined,
    empresaDireccion: cfg('empresa_direccion', 'Calle Tres 703, Belloto, Quilpué') || undefined,
    empresaTelefono:  cfg('empresa_telefono',  '+56 9 86193102') || undefined,
    empresaEmail:     cfg('empresa_email',     'victor@vvo.cl') || undefined,
    empresaWeb:       cfg('empresa_web',       'vvo.cl') || undefined,
    condicionesPago:  cfg('condiciones_pago')  || undefined,
    datosBancarios: {
      banco:              cfg('banco_nombre')               || undefined,
      tipoCuenta:         cfg('banco_tipo_cuenta')          || undefined,
      numeroCuenta:       cfg('banco_numero_cuenta')        || undefined,
      titular:            cfg('banco_titular')              || undefined,
      rutTitular:         cfg('banco_rut_titular')          || undefined,
      emailTransferencia: cfg('banco_email_transferencia')  || undefined,
    },
  }

  const pdfBuffer = await generarCotizacionPDF(pdfData)

  // Generar token de aprobación
  const token = await generarTokenAprobacion(id)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://sistema.vvo.cl'
  const linkAprobacion = `${appUrl}/aprobar/${token}`

  // Formatear total y validez para el email
  const totalFormateado = new Intl.NumberFormat('es-CL', {
    style: 'currency', currency: 'CLP', minimumFractionDigits: 0,
  }).format(cot.total)
  const validaHastaFormateada = cot.valida_hasta
    ? new Date(cot.valida_hasta + 'T12:00:00').toLocaleDateString('es-CL', {
        day: '2-digit', month: '2-digit', year: 'numeric',
      })
    : undefined

  // Enviar email
  const copiaInterna = process.env.NEXT_PUBLIC_EMPRESA_EMAIL ?? 'victor@vvo.cl'
  const ccFinal = Array.from(new Set([copiaInterna, ...ccExtra]))

  const emailDestino = toOverride ?? clienteRaw.email
  let emailError: unknown = null
  try {
    const result = await enviarCotizacion({
      to:               emailDestino,
      cc:               ccFinal,
      numeroCotizacion: cot.numero,
      pdfBuffer,
      asunto,
      cuerpo,
      total:            totalFormateado,
      validaHasta:      validaHastaFormateada,
      linkAprobacion,
    })
    emailError = result.error
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }

  if (emailError) {
    const msg = typeof emailError === 'object' && emailError !== null && 'message' in emailError
      ? String((emailError as { message: unknown }).message)
      : 'Error al enviar el email'
    return NextResponse.json({ error: msg }, { status: 500 })
  }

  // Actualizar estado a 'enviada'
  await supabase
    .from('cotizaciones')
    .update({ estado: 'enviada', enviada_at: new Date().toISOString() })
    .eq('id', id)

  return NextResponse.json({ success: true })
}
