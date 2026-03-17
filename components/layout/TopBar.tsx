'use client'

import { usePathname } from 'next/navigation'
import { Menu } from 'lucide-react'
import SearchBox from './SearchBox'
import ThemeToggle from './ThemeToggle'
import { useSidebar } from './SidebarContext'

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
  const { toggle } = useSidebar()

  return (
    <header className="h-12 bg-[var(--bg-topbar)] border-b border-[var(--border-default)] flex items-center px-3 fixed top-0 left-0 right-0 md:left-[220px] z-10 gap-3">
      {/* Hamburger — solo móvil */}
      <button
        type="button"
        onClick={toggle}
        className="md:hidden p-1.5 rounded-md text-[var(--text-secondary)] hover:bg-[var(--bg-muted)] transition-colors cursor-pointer shrink-0"
        aria-label="Abrir menú"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Left — breadcrumb */}
      <div className="flex-1 min-w-0">
        {label && (
          <span className="text-[15px] font-medium text-[var(--text-primary)] truncate">{label}</span>
        )}
      </div>

      {/* Center — search */}
      <SearchBox />

      {/* Right — theme toggle */}
      <div className="flex items-center shrink-0">
        <ThemeToggle />
      </div>
    </header>
  )
}
