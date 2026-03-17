'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useTransition } from 'react'
import {
  LayoutDashboard,
  FileText,
  ClipboardList,
  Users,
  Receipt,
  Package,
  Package2,
  Scissors,
  Printer,
  SlidersHorizontal,
  LogOut,
  Timer,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { signOut } from '@/app/actions/auth'
import { useSidebar } from './SidebarContext'

const navItems = [
  { href: '/',             label: 'Dashboard',          icon: LayoutDashboard, exact: true },
  { href: '/cotizaciones', label: 'Cotizaciones',        icon: FileText },
  { href: '/ot',           label: 'Órdenes de trabajo',  icon: ClipboardList },
  { href: '/clientes',     label: 'Clientes',            icon: Users },
  { href: '/facturas',     label: 'Facturas',            icon: Receipt },
]

const adminItems = [
  { href: '/admin/productos',         label: 'Productos',         icon: Package },
  { href: '/admin/terminaciones',     label: 'Terminaciones',     icon: Scissors },
  { href: '/admin/maquinas',          label: 'Máquinas',          icon: Printer },
  { href: '/admin/materiales',        label: 'Materiales',        icon: Package2 },
  { href: '/admin/servicios-maquina', label: 'Servicios máquina', icon: Timer },
  { href: '/admin/configuracion',     label: 'Configuración',     icon: SlidersHorizontal },
]

function NavItem({
  href,
  label,
  icon: Icon,
  exact = false,
  onNavigate,
}: {
  href: string
  label: string
  icon: React.ElementType
  exact?: boolean
  onNavigate?: () => void
}) {
  const pathname = usePathname()
  const isActive = exact
    ? pathname === href
    : pathname === href || pathname.startsWith(href + '/')

  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={cn(
        'group flex items-center gap-2.5 px-2.5 py-2 rounded-[5px] transition-colors duration-100 cursor-pointer relative',
        isActive
          ? 'bg-[#27272a] text-white'
          : 'text-[var(--text-secondary)] hover:bg-[#27272a] hover:text-[#e4e4e7]'
      )}
    >
      {isActive && (
        <span className="absolute left-0 top-1 bottom-1 w-0.5 bg-[#7c3aed] rounded-r-full" />
      )}
      <Icon className="w-4 h-4 shrink-0" />
      <span className="text-[14px] font-medium leading-none">{label}</span>
    </Link>
  )
}

interface SidebarProps {
  userEmail: string
}

export default function Sidebar({ userEmail }: SidebarProps) {
  const [isPending, startTransition] = useTransition()
  const { isOpen, close } = useSidebar()
  const displayName = userEmail.split('@')[0]

  function handleSignOut() {
    startTransition(async () => {
      await signOut()
    })
  }

  const sidebarContent = (
    <aside className="w-[220px] h-full bg-[var(--bg-sidebar)] border-r border-[var(--border-sidebar)] flex flex-col">
      {/* Logo */}
      <div className="px-4 py-4 border-b border-[var(--border-sidebar)] flex items-center justify-between">
        <Image
          src="/logo-vvo.png"
          alt="VVO Publicidad"
          width={120}
          height={40}
          className="object-contain object-left h-9 w-auto"
          priority
        />
        {/* Close button — solo visible en móvil */}
        <button
          type="button"
          onClick={close}
          className="md:hidden p-1.5 rounded-md text-[var(--text-secondary)] hover:bg-[#27272a] hover:text-[#e4e4e7] transition-colors cursor-pointer"
          aria-label="Cerrar menú"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Navegación */}
      <nav className="flex-1 px-2 py-3 overflow-y-auto space-y-px">
        {navItems.map((item) => (
          <NavItem key={item.href} {...item} onNavigate={close} />
        ))}

        {/* Sección Admin */}
        <div className="pt-5">
          <p className="px-2.5 pb-1.5 text-[10px] font-semibold text-[#71717a] uppercase tracking-[0.1em]">
            Administración
          </p>
          <div className="space-y-px">
            {adminItems.map((item) => (
              <NavItem key={item.href} {...item} onNavigate={close} />
            ))}
          </div>
        </div>
      </nav>

      {/* Usuario */}
      <div className="px-2 py-3 border-t border-[var(--border-sidebar)]">
        <button
          type="button"
          onClick={handleSignOut}
          disabled={isPending}
          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-[5px] text-[var(--text-secondary)] hover:bg-[#27272a] hover:text-[#e4e4e7] transition-colors cursor-pointer group"
          title="Cerrar sesión"
        >
          <div className="w-6 h-6 rounded-full bg-[#27272a] border border-white/[0.1] flex items-center justify-center shrink-0">
            <span className="text-[10px] font-semibold text-[var(--text-muted)] uppercase">
              {displayName.charAt(0)}
            </span>
          </div>
          <div className="flex-1 min-w-0 text-left">
            <p className="text-[12px] font-medium text-[var(--text-muted)] truncate leading-none">{displayName}</p>
            <p className="text-[10px] text-[#71717a] truncate mt-0.5 leading-none">{userEmail}</p>
          </div>
          <LogOut className="w-3.5 h-3.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>
      </div>
    </aside>
  )

  return (
    <>
      {/* Desktop sidebar — siempre visible */}
      <div className="hidden md:block w-[220px] h-screen fixed left-0 top-0 z-20">
        {sidebarContent}
      </div>

      {/* Mobile drawer — overlay */}
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/60 md:hidden transition-opacity duration-200',
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        )}
        onClick={close}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <div
        className={cn(
          'fixed top-0 left-0 z-50 h-full md:hidden transition-transform duration-250 ease-in-out',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {sidebarContent}
      </div>
    </>
  )
}
