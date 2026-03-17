import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim()
  if (!q || q.length < 2) return NextResponse.json([])

  const supabase = await createClient()

  const [
    { data: cotizaciones },
    { data: clientes },
    { data: ots },
  ] = await Promise.all([
    supabase
      .from('cotizaciones')
      .select('id, numero, estado, clientes(nombre)')
      .or(`numero.ilike.%${q}%`)
      .limit(5),
    supabase
      .from('clientes')
      .select('id, nombre, rut, email')
      .or(`nombre.ilike.%${q}%,rut.ilike.%${q}%,email.ilike.%${q}%`)
      .limit(5),
    supabase
      .from('ordenes_trabajo')
      .select('id, numero, estado, clientes(nombre)')
      .or(`numero.ilike.%${q}%`)
      .limit(5),
  ])

  const results = [
    ...(cotizaciones ?? []).map((c) => {
      const cliente = Array.isArray(c.clientes) ? c.clientes[0] : c.clientes
      return {
        type: 'cotizacion' as const,
        id: c.id,
        label: c.numero,
        sub: (cliente as { nombre?: string } | null)?.nombre ?? '',
        href: `/cotizaciones/${c.id}`,
        estado: c.estado,
      }
    }),
    ...(ots ?? []).map((o) => {
      const cliente = Array.isArray(o.clientes) ? o.clientes[0] : o.clientes
      return {
        type: 'ot' as const,
        id: o.id,
        label: o.numero,
        sub: (cliente as { nombre?: string } | null)?.nombre ?? '',
        href: `/ot/${o.id}`,
        estado: o.estado,
      }
    }),
    ...(clientes ?? []).map((c) => ({
      type: 'cliente' as const,
      id: c.id,
      label: c.nombre,
      sub: c.rut ?? c.email ?? '',
      href: `/clientes/${c.id}`,
      estado: null,
    })),
  ]

  return NextResponse.json(results)
}
