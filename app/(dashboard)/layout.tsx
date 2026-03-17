import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/layout/Sidebar'
import TopBar from '@/components/layout/TopBar'
import BottomNav from '@/components/layout/BottomNav'
import { SidebarProvider } from '@/components/layout/SidebarContext'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  return (
    <SidebarProvider>
      <div className="min-h-screen bg-[var(--bg-page)]">
        <Sidebar userEmail={user.email ?? 'usuario@vvo.cl'} />
        <TopBar />
        <main className="ml-0 md:ml-[220px] pt-12 pb-[calc(56px+env(safe-area-inset-bottom))] md:pb-0 min-h-screen bg-[var(--bg-page)]">
          <div className="p-4 md:p-8">{children}</div>
        </main>
        <BottomNav />
      </div>
    </SidebarProvider>
  )
}
