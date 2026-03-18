'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'

type EstadoOT = 'pendiente' | 'en_produccion' | 'terminado' | 'entregado'

interface OTCalendario {
  id:            string
  numero:        string
  estado:        EstadoOT
  fecha_entrega: string | null
  cliente_nombre: string | null
}

interface Props {
  ots: OTCalendario[]
  initialYear:  number
  initialMonth: number // 0-indexed
}

const ESTADO_CLASES: Record<EstadoOT, string> = {
  pendiente:     'bg-[var(--text-muted)]/20 text-[var(--text-muted)]',
  en_produccion: 'bg-amber-500 text-white',
  terminado:     'bg-blue-500 text-white',
  entregado:     'bg-green-600 text-white',
}

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

const DIAS_SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

function getDaysInMonth(year: number, month: number): Date[] {
  const days: Date[] = []
  const first = new Date(year, month, 1)
  const last  = new Date(year, month + 1, 0)

  // Fill leading days from previous month (Mon-based)
  const startDow = (first.getDay() + 6) % 7 // 0=Mon
  for (let i = startDow - 1; i >= 0; i--) {
    days.push(new Date(year, month, -i))
  }

  for (let d = 1; d <= last.getDate(); d++) {
    days.push(new Date(year, month, d))
  }

  // Fill trailing days
  const remaining = 7 - (days.length % 7)
  if (remaining < 7) {
    for (let d = 1; d <= remaining; d++) {
      days.push(new Date(year, month + 1, d))
    }
  }

  return days
}

export default function CalendarioOT({ ots, initialYear, initialMonth }: Props) {
  const [year, setYear]   = useState(initialYear)
  const [month, setMonth] = useState(initialMonth)

  function prev() {
    if (month === 0) { setYear(y => y - 1); setMonth(11) }
    else             { setMonth(m => m - 1) }
  }

  function next() {
    if (month === 11) { setYear(y => y + 1); setMonth(0) }
    else              { setMonth(m => m + 1) }
  }

  const days = getDaysInMonth(year, month)

  // Map OTs by date string "YYYY-MM-DD"
  const byDay = new Map<string, OTCalendario[]>()
  for (const ot of ots) {
    if (!ot.fecha_entrega) continue
    const key = ot.fecha_entrega.slice(0, 10)
    if (!byDay.has(key)) byDay.set(key, [])
    byDay.get(key)!.push(ot)
  }

  const today = new Date()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`

  return (
    <div className="border border-[var(--border-default)] rounded-[8px] overflow-hidden">
      {/* Nav */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-default)] bg-[var(--bg-card)]">
        <button
          type="button"
          onClick={prev}
          className="p-1 rounded-[5px] text-[var(--text-secondary)] hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
          aria-label="Mes anterior"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <p className="text-[14px] font-semibold text-[var(--text-primary)]">
          {MESES[month]} {year}
        </p>
        <button
          type="button"
          onClick={next}
          className="p-1 rounded-[5px] text-[var(--text-secondary)] hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
          aria-label="Mes siguiente"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Grid header */}
      <div className="grid grid-cols-7 bg-[var(--bg-muted)]">
        {DIAS_SEMANA.map((d) => (
          <div key={d} className="text-center py-2 text-[11px] font-medium text-[var(--text-secondary)] uppercase tracking-wide">
            {d}
          </div>
        ))}
      </div>

      {/* Grid days */}
      <div className="grid grid-cols-7 divide-x divide-y divide-[var(--border-subtle)]">
        {days.map((day, i) => {
          const isCurrentMonth = day.getMonth() === month
          const key = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2,'0')}-${String(day.getDate()).padStart(2,'0')}`
          const dayOTs = byDay.get(key) ?? []
          const isToday = key === todayStr

          return (
            <div
              key={i}
              className={[
                'min-h-[80px] p-1.5 bg-[var(--bg-card)]',
                !isCurrentMonth ? 'opacity-40' : '',
              ].join(' ')}
            >
              <p className={[
                'text-[12px] font-medium mb-1 w-5 h-5 flex items-center justify-center rounded-full',
                isToday
                  ? 'bg-[#7c3aed] text-white'
                  : isCurrentMonth
                  ? 'text-[var(--text-secondary)]'
                  : 'text-[var(--text-muted)]',
              ].join(' ')}>
                {day.getDate()}
              </p>

              <div className="space-y-0.5">
                {dayOTs.map((ot) => (
                  <Link
                    key={ot.id}
                    href={`/ot/${ot.id}`}
                    className={[
                      'block text-[10px] font-semibold px-1 py-0.5 rounded-[3px] truncate leading-tight hover:opacity-80 transition-opacity',
                      ESTADO_CLASES[ot.estado],
                    ].join(' ')}
                    title={`${ot.numero} — ${ot.cliente_nombre ?? 'Sin cliente'}`}
                  >
                    {ot.numero}
                  </Link>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 px-4 py-3 border-t border-[var(--border-default)] bg-[var(--bg-muted)]">
        {(Object.entries(ESTADO_CLASES) as [EstadoOT, string][]).map(([estado, cls]) => (
          <span key={estado} className="flex items-center gap-1.5 text-[11px] text-[var(--text-secondary)]">
            <span className={`inline-block w-2.5 h-2.5 rounded-[2px] ${cls}`} />
            {estado.replace('_', ' ')}
          </span>
        ))}
      </div>
    </div>
  )
}
