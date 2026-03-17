'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, FileText, ClipboardList, Users, Receipt } from 'lucide-react'
import { cn } from '@/lib/utils'

const items = [
  { href: '/',             label: 'Dashboard',    icon: LayoutDashboard, exact: true },
  { href: '/cotizaciones', label: 'Cotizaciones', icon: FileText },
  { href: '/ot',           label: 'OT',           icon: ClipboardList },
  { href: '/clientes',     label: 'Clientes',     icon: Users },
  { href: '/facturas',     label: 'Facturas',     icon: Receipt },
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 md:hidden bg-[var(--bg-sidebar)] border-t border-[var(--border-sidebar)] flex items-stretch"
      style={{ height: 'calc(56px + env(safe-area-inset-bottom))', paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {items.map(({ href, label, icon: Icon, exact }) => {
        const isActive = exact
          ? pathname === href
          : pathname === href || pathname.startsWith(href + '/')
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex-1 flex flex-col items-center justify-center gap-1 transition-colors duration-150 cursor-pointer',
              isActive
                ? 'text-[#7c3aed]'
                : 'text-[var(--text-secondary)] active:text-[#e4e4e7]'
            )}
          >
            <Icon className={cn('w-[22px] h-[22px]', isActive && 'stroke-[2.5]')} />
            <span className={cn('text-[10px] font-medium leading-none', isActive ? 'text-[#7c3aed]' : 'text-[#71717a]')}>
              {label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
