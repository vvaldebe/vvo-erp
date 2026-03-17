import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/layout/Sidebar'
import TopBar from '@/components/layout/TopBar'

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
    <div className="min-h-screen bg-[var(--bg-page)]">
      <Sidebar userEmail={user.email ?? 'usuario@vvo.cl'} />
      <TopBar />
      <main className="ml-[220px] pt-12 min-h-screen bg-[var(--bg-page)]">
        <div className="p-8">{children}</div>
      </main>
    </div>
  )
}
