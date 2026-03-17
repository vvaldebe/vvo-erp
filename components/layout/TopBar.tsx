'use client'

import { usePathname } from 'next/navigation'
import SearchBox from './SearchBox'
import ThemeToggle from './ThemeToggle'

const LABELS: Record<string, string> = {
  '/':                      'Dashboard',
  '/cotizaciones':          'Cotizaciones',
  '/cotizaciones/nueva':    'Nueva cotización',
  '/ot':                    'Órdenes de trabajo',
  '/ot/nueva':              'Nueva orden de trabajo',
  '/clientes':              'Clientes',
  '/clientes/nuevo':        'Nuevo cliente',
  '/facturas':              'Facturas',
  '/admin/productos':       'Productos',
  '/admin/productos/nuevo': 'Nuevo producto',
  '/admin/terminaciones':   'Terminaciones',
  '/admin/maquinas':        'Máquinas',
  '/admin/configuracion':   'Configuración',
}

function getLabel(pathname: string): string {
  if (LABELS[pathname]) return LABELS[pathname]
  const segments = pathname.split('/')
  if (segments[1] === 'cotizaciones' && segments[2]) return 'Detalle cotización'
  if (segments[1] === 'clientes' && segments[2]) return 'Detalle cliente'
  if (segments[1] === 'ot' && segments[2]) return 'Detalle OT'
  if (segments[1] === 'facturas' && segments[2]) return 'Detalle factura'
  if (segments[1] === 'admin' && segments[2] === 'productos' && segments[3]) return 'Editar producto'
  return ''
}

export default function TopBar() {
  const pathname = usePathname()
  const label = getLabel(pathname)

  return (
    <header className="h-12 bg-[var(--bg-topbar)] border-b border-[var(--border-default)] flex items-center px-4 fixed top-0 left-[220px] right-0 z-10 gap-4">
      {/* Left — breadcrumb */}
      <div className="flex-1 min-w-0">
        {label && (
          <span className="text-[15px] font-medium text-[var(--text-primary)]">{label}</span>
        )}
      </div>

      {/* Center — search */}
      <SearchBox />

      {/* Right — theme toggle */}
      <div className="flex items-center">
        <ThemeToggle />
      </div>
    </header>
  )
}
