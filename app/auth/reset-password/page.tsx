'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AlertCircle, Loader2, CheckCircle2, Eye, EyeOff } from 'lucide-react'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [password, setPassword]       = useState('')
  const [confirm, setConfirm]         = useState('')
  const [showPwd, setShowPwd]         = useState(false)
  const [error, setError]             = useState<string | null>(null)
  const [success, setSuccess]         = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      return
    }
    if (password !== confirm) {
      setError('Las contraseñas no coinciden')
      return
    }

    startTransition(async () => {
      const supabase = createClient()
      const { error: updateError } = await supabase.auth.updateUser({ password })
      if (updateError) {
        setError(updateError.message)
      } else {
        setSuccess(true)
        setTimeout(() => router.push('/'), 2500)
      }
    })
  }

  return (
    <div className="min-h-screen bg-[var(--bg-sidebar)] flex items-center justify-center p-4">
      <div className="w-full max-w-[340px]">

        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Image
            src="/logo-vvo.png"
            alt="VVO Publicidad"
            width={160}
            height={50}
            className="object-contain h-auto w-auto"
            priority
          />
        </div>

        {/* Card */}
        <div className="bg-[var(--bg-card)] rounded-[10px] p-7 border border-[var(--border-default)]">
          <h1 className="text-[15px] font-semibold text-[var(--text-primary)] mb-0.5">
            Nueva contraseña
          </h1>
          <p className="text-[13px] text-[var(--text-muted)] mb-6">
            Elige una contraseña segura para tu cuenta
          </p>

          {success ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-[13px] text-[#16a34a] bg-[#dcfce7] rounded-[6px] px-3 py-2 border border-[#86efac]">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                Contraseña actualizada. Redirigiendo...
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-[12px] font-medium text-[var(--text-secondary)]">
                  Nueva contraseña
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPwd ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                    placeholder="Mínimo 6 caracteres"
                    className="h-8 text-[13px] border-[var(--border-input)] bg-[var(--bg-input)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus-visible:ring-[#7c3aed]/10 focus-visible:border-[#7c3aed] rounded-[6px] pr-9"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd(!showPwd)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors cursor-pointer"
                    tabIndex={-1}
                  >
                    {showPwd ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirm" className="text-[12px] font-medium text-[var(--text-secondary)]">
                  Confirmar contraseña
                </Label>
                <Input
                  id="confirm"
                  type={showPwd ? 'text' : 'password'}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  autoComplete="new-password"
                  placeholder="Repite la contraseña"
                  className="h-8 text-[13px] border-[var(--border-input)] bg-[var(--bg-input)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus-visible:ring-[#7c3aed]/10 focus-visible:border-[#7c3aed] rounded-[6px]"
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 text-[13px] text-[#dc2626] bg-[#fee2e2] rounded-[6px] px-3 py-2 border border-[#fca5a5]">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  {error}
                </div>
              )}

              <Button
                type="submit"
                disabled={isPending}
                className="w-full bg-[#7c3aed] hover:bg-[#6d28d9] text-white font-medium h-8 text-[13px] rounded-[6px] transition-colors cursor-pointer mt-1"
              >
                {isPending ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  'Guardar contraseña'
                )}
              </Button>
            </form>
          )}
        </div>

        <p className="text-center text-[var(--text-secondary)] text-[11px] mt-6">
          VVO Publicidad — Quilpué, Chile
        </p>
      </div>
    </div>
  )
}
