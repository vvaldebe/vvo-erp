'use client'

import { useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AlertCircle, Loader2, CheckCircle2, ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function ForgotPasswordForm() {
  const [visible, setVisible]     = useState(false)
  const [email, setEmail]         = useState('')
  const [error, setError]         = useState<string | null>(null)
  const [success, setSuccess]     = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleSend() {
    setError(null)
    if (!email.trim()) {
      setError('Ingresa tu correo electrónico')
      return
    }

    startTransition(async () => {
      const supabase = createClient()
      const redirectTo = (process.env.NEXT_PUBLIC_APP_URL ?? '') + '/auth/callback'
      const { error: authError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo,
      })
      if (authError) {
        setError(authError.message)
      } else {
        setSuccess(true)
      }
    })
  }

  if (!visible) {
    return (
      <div className="mt-3 text-center">
        <button
          type="button"
          onClick={() => setVisible(true)}
          className="text-[12px] text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors underline-offset-2 hover:underline cursor-pointer"
        >
          ¿Olvidaste tu contraseña?
        </button>
      </div>
    )
  }

  return (
    <div className="mt-4 pt-4 border-t border-[var(--border-default)] space-y-3">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => { setVisible(false); setError(null); setSuccess(false); setEmail('') }}
          className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
          aria-label="Volver al inicio de sesión"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>
        <p className="text-[13px] font-medium text-[var(--text-primary)]">Recuperar contraseña</p>
      </div>

      {success ? (
        <div className="flex items-center gap-2 text-[13px] text-[#16a34a] bg-[#dcfce7] rounded-[6px] px-3 py-2 border border-[#86efac]">
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
          Revisa tu bandeja de entrada
        </div>
      ) : (
        <>
          <div className="space-y-1.5">
            <Label htmlFor="forgot-email" className="text-[12px] font-medium text-[var(--text-secondary)]">
              Email
            </Label>
            <Input
              id="forgot-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="usuario@vvo.cl"
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
            type="button"
            disabled={isPending}
            onClick={handleSend}
            className="w-full bg-[#7c3aed] hover:bg-[#6d28d9] text-white font-medium h-8 text-[13px] rounded-[6px] transition-colors cursor-pointer"
          >
            {isPending ? (
              <>
                <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                Enviando...
              </>
            ) : (
              'Enviar link de recuperación'
            )}
          </Button>
        </>
      )}
    </div>
  )
}
