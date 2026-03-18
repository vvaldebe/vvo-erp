import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generarCotizacionPDF } from '@/lib/pdf/generarCotizacion'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const sinDatosBancarios = req.nextUrl.searchParams.get('sinDatosBancarios') === '1'
  const supabase = await createClient()

  // Verificar sesión
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  // Cotización + cliente
  const { data: cot, error: cotError } = await supabase
    .from('cotizaciones')
    .select(`
      id, numero, estado, nivel_precio, subtotal, iva, total,
      notas, created_at, valida_hasta, cliente_id,
      clientes ( nombre, rut, email, telefono, direccion )
    `)
    .eq('id', id)
    .single()

  if (cotError || !cot) {
    return NextResponse.json({ error: 'Cotización no encontrada' }, { status: 404 })
  }

  // Ítems
  const { data: items, error: itemsError } = await supabase
    .from('cotizacion_items')
    .select(`
      id, descripcion, notas_item, ancho, alto, cantidad,
      precio_unitario, subtotal, orden,
      productos ( nombre, unidad )
    `)
    .eq('cotizacion_id', id)
    .order('orden')

  if (itemsError) {
    return NextResponse.json({ error: 'Error al cargar ítems' }, { status: 500 })
  }

  // Terminaciones de todos los ítems
  const itemIds = (items ?? []).map((i) => i.id)
  const terminacionesPorItem: Record<string, { nombre: string; precio: number; cantidad: number }[]> = {}

  if (itemIds.length > 0) {
    const { data: terms } = await supabase
      .from('cotizacion_item_terminaciones')
      .select('cotizacion_item_id, nombre, precio, cantidad')
      .in('cotizacion_item_id', itemIds)

    for (const t of terms ?? []) {
      if (!terminacionesPorItem[t.cotizacion_item_id]) {
        terminacionesPorItem[t.cotizacion_item_id] = []
      }
      terminacionesPorItem[t.cotizacion_item_id].push({
        nombre: t.nombre,
        precio: t.precio,
        cantidad: t.cantidad,
      })
    }
  }

  // Configuración global (empresa + banco + condiciones de pago)
  const CONFIG_CLAVES = [
    'empresa_nombre', 'empresa_rut', 'empresa_giro',
    'empresa_direccion', 'empresa_telefono', 'empresa_email', 'empresa_web',
    'banco_nombre', 'banco_tipo_cuenta', 'banco_numero_cuenta',
    'banco_titular', 'banco_rut_titular', 'banco_email_transferencia',
    'condiciones_pago',
  ]

  const { data: configRows } = await supabase
    .from('configuracion')
    .select('clave, valor')
    .in('clave', CONFIG_CLAVES)

  function cfg(clave: string, fallback = '') {
    return configRows?.find((r) => r.clave === clave)?.valor ?? fallback
  }

  // Contacto principal del cliente
  let contactoNombre: string | undefined
  let contactoEmail: string | undefined

  if (cot.cliente_id) {
    const { data: contacto } = await supabase
      .from('contactos')
      .select('nombre, email')
      .eq('cliente_id', cot.cliente_id)
      .eq('es_principal', true)
      .single()

    if (contacto) {
      contactoNombre = contacto.nombre ?? undefined
      contactoEmail  = contacto.email  ?? undefined
    }
  }

  // Construir data para el PDF
  const clienteRaw = Array.isArray(cot.clientes) ? cot.clientes[0] : cot.clientes

  const pdfData = {
    numero:       cot.numero,
    fecha:        cot.created_at,
    valida_hasta: cot.valida_hasta,
    nivel_precio: cot.nivel_precio,
    subtotal:     cot.subtotal,
    iva:          cot.iva,
    total:        cot.total,
    notas:        cot.notas,
    cliente:      clienteRaw
      ? {
          nombre:    clienteRaw.nombre,
          rut:       clienteRaw.rut       ?? null,
          email:     clienteRaw.email     ?? null,
          telefono:  clienteRaw.telefono  ?? null,
          direccion: clienteRaw.direccion ?? null,
        }
      : null,
    items: (items ?? []).map((item) => {
      const prod = Array.isArray(item.productos) ? item.productos[0] : item.productos
      return {
        descripcion:     item.descripcion ?? prod?.nombre ?? 'Ítem',
        producto_nombre: prod?.nombre ?? null,
        notas_item:      (item as typeof item & { notas_item?: string | null }).notas_item ?? null,
        ancho:           item.ancho,
        alto:            item.alto,
        cantidad:        item.cantidad,
        precio_unitario: item.precio_unitario,
        subtotal:        item.subtotal,
        unidad:          prod?.unidad ?? 'unidad',
        terminaciones:   terminacionesPorItem[item.id] ?? [],
      }
    }),
    // Datos de empresa desde configuración
    empresaNombre:    cfg('empresa_nombre',    'VVO Publicidad') || undefined,
    empresaRut:       cfg('empresa_rut')       || undefined,
    empresaDireccion: cfg('empresa_direccion', 'Calle Tres 703, Belloto, Quilpué') || undefined,
    empresaTelefono:  cfg('empresa_telefono',  '+56 9 86193102') || undefined,
    empresaEmail:     cfg('empresa_email',     'victor@vvo.cl') || undefined,
    empresaWeb:       cfg('empresa_web',       'vvo.cl') || undefined,
    // Condiciones de pago
    condicionesPago: sinDatosBancarios ? undefined : (cfg('condiciones_pago') || undefined),
    // Datos bancarios (se omiten si sinDatosBancarios=1)
    datosBancarios: sinDatosBancarios ? undefined : {
      banco:             cfg('banco_nombre')              || undefined,
      tipoCuenta:        cfg('banco_tipo_cuenta')         || undefined,
      numeroCuenta:      cfg('banco_numero_cuenta')       || undefined,
      titular:           cfg('banco_titular')             || undefined,
      rutTitular:        cfg('banco_rut_titular')         || undefined,
      emailTransferencia: cfg('banco_email_transferencia') || undefined,
    },
    // Contacto del cliente
    contactoNombre,
    contactoEmail,
  }

  const buffer = await generarCotizacionPDF(pdfData)

  return new NextResponse(buffer as unknown as BodyInit, {
    status: 200,
    headers: {
      'Content-Type':        'application/pdf',
      'Content-Disposition': `inline; filename="${cot.numero}.pdf"`,
      'Cache-Control':       'no-store',
    },
  })
}
