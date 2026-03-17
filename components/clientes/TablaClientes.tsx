'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Users, Pencil } from 'lucide-react'
import NivelPrecioBadge from '@/components/shared/NivelPrecioBadge'
import type { NivelPrecio } from '@/types/database.types'

export interface ClienteRow {
  id: string
  nombre: string
  rut: string | null
  email: string | null
  telefono: string | null
  nivel_precio: NivelPrecio
  descuento_porcentaje: number
  razon_social?: string | null
  nombre_fantasia?: string | null
  contacto_email?: string | null
  contacto_telefono?: string | null
}

interface Props {
  clientes: ClienteRow[]
}

export default function TablaClientes({ clientes }: Props) {
  const router = useRouter()
  const [query, setQuery] = useState('')

  const filtrados = clientes.filter((c) => {
    if (!query.trim()) return true
    const q = query.toLowerCase()
    const displayName = c.razon_social ?? c.nombre
    return (
      displayName.toLowerCase().includes(q) ||
      (c.nombre_fantasia ?? '').toLowerCase().includes(q) ||
      (c.rut ?? '').toLowerCase().includes(q) ||
      (c.email ?? '').toLowerCase().includes(q) ||
      (c.contacto_email ?? '').toLowerCase().includes(q)
    )
  })

  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-[8px] overflow-hidden">

      {/* Barra de búsqueda */}
      <div className="px-4 border-b border-[var(--border-default)] h-11 flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-muted)] pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar nombre, RUT o email..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-8 pr-3 h-7 text-[12px] bg-[var(--bg-muted)] border border-[var(--border-default)] rounded-[5px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/10 transition-colors"
          />
        </div>
        {query && (
          <span className="text-[11px] text-[var(--text-muted)]">
            {filtrados.length} resultado{filtrados.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Tabla */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[500px]">
          <thead>
            <tr className="bg-[var(--bg-muted)] border-b border-[var(--border-default)]">
              <th className="text-left px-4 h-9 text-[11px] font-medium text-[var(--text-secondary)] uppercase tracking-wide">Nombre</th>
              <th className="text-left px-4 h-9 text-[11px] font-medium text-[var(--text-secondary)] uppercase tracking-wide">RUT</th>
              <th className="text-left px-4 h-9 text-[11px] font-medium text-[var(--text-secondary)] uppercase tracking-wide">Contacto</th>
              <th className="text-left px-4 h-9 text-[11px] font-medium text-[var(--text-secondary)] uppercase tracking-wide">Nivel</th>
              <th className="text-right px-4 h-9 text-[11px] font-medium text-[var(--text-secondary)] uppercase tracking-wide"></th>
            </tr>
          </thead>
          <tbody>
            {filtrados.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-14 text-center">
                  <div className="flex flex-col items-center gap-2 text-[var(--text-muted)]">
                    <Users className="w-8 h-8 opacity-25" />
                    <p className="text-[13px]">
                      {query ? 'Sin resultados para la búsqueda' : 'No hay clientes aún'}
                    </p>
                    {!query && (
                      <p className="text-[12px] text-[var(--text-faint)]">
                        Crea el primer cliente con el botón de arriba
                      </p>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              filtrados.map((c) => (
                <tr
                  key={c.id}
                  className="border-b border-[var(--border-subtle)] last:border-0 hover:bg-[var(--bg-muted)] transition-colors"
                >
                  <td className="px-4 h-11">
                    <button
                      type="button"
                      onClick={() => router.push(`/clientes/${c.id}`)}
                      className="text-left cursor-pointer"
                    >
                      <p className="text-[13px] font-medium text-[var(--text-primary)] hover:text-[#7c3aed] transition-colors">
                        {c.razon_social ?? c.nombre}
                      </p>
                      {c.nombre_fantasia && c.nombre_fantasia !== (c.razon_social ?? c.nombre) && (
                        <p className="text-[11px] text-[var(--text-muted)] mt-0.5">{c.nombre_fantasia}</p>
                      )}
                    </button>
                  </td>
                  <td className="px-4 h-11 text-[14px] text-[var(--text-secondary)]">
                    {c.rut || '—'}
                  </td>
                  <td className="px-4 h-11">
                    <p className="text-[13px] text-[var(--text-primary)]">
                      {c.contacto_email ?? c.email ?? '—'}
                    </p>
                    {(c.contacto_telefono ?? c.telefono) && (
                      <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                        {c.contacto_telefono ?? c.telefono}
                      </p>
                    )}
                  </td>
                  <td className="px-4 h-11">
                    <NivelPrecioBadge
                      nivel={c.nivel_precio}
                      descuento={c.descuento_porcentaje}
                    />
                  </td>
                  <td className="px-4 h-11 text-right">
                    <button
                      type="button"
                      onClick={() => router.push(`/clientes/${c.id}`)}
                      className="inline-flex items-center gap-1.5 px-3 h-7 text-[12px] font-medium text-[var(--text-secondary)] border border-[var(--border-default)] rounded-[5px] hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                    >
                      <Pencil className="w-3 h-3" />
                      Editar
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      {filtrados.length > 0 && (
        <div className="px-4 py-2.5 border-t border-[var(--border-subtle)] bg-[var(--bg-muted)]">
          <p className="text-[11px] text-[var(--text-muted)]">
            {filtrados.length} cliente{filtrados.length !== 1 ? 's' : ''}
            {query && ` · "${query}"`}
          </p>
        </div>
      )}
    </div>
  )
}
