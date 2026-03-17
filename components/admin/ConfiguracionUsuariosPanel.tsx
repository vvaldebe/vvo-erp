'use client'

import { useState, useTransition } from 'react'
import { Loader2, CheckCircle2, UserPlus, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface Usuario {
  id: string
  email: string | null
  created_at: string
  last_sign_in_at: string | null
}

interface Props {
  usuarios: Usuario[]
  invitarUsuarioAction: (formData: FormData) => Promise<{ error?: string; success?: boolean }>
  cambiarPasswordAction: (formData: FormData) => Promise<{ error?: string; success?: boolean }>
  userEmail: string
}

export default function ConfiguracionUsuariosPanel({
  usuarios,
  invitarUsuarioAction,
  cambiarPasswordAction,
  userEmail,
}: Props) {
  const [inviteEmail, setInviteEmail] = useState('')
  const [invitePending, startInviteTransition] = useTransition()
  const [inviteFeedback, setInviteFeedback] = useState<{ ok: boolean; msg: string } | null>(null)

  const [pwPending, startPwTransition] = useTransition()
  const [pwFeedback, setPwFeedback] = useState<{ ok: boolean; msg: string } | null>(null)

  function handleInvite(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    setInviteFeedback(null)
    startInviteTransition(async () => {
      const result = await invitarUsuarioAction(formData)
      if (result.error) {
        setInviteFeedback({ ok: false, msg: result.error })
      } else {
        setInviteFeedback({ ok: true, msg: `Invitación enviada a ${inviteEmail}` })
        setInviteEmail('')
      }
    })
  }

  function handlePasswordReset() {
    const formData = new FormData()
    formData.set('email', userEmail)
    setPwFeedback(null)
    startPwTransition(async () => {
      const result = await cambiarPasswordAction(formData)
      if (result.error) {
        setPwFeedback({ ok: false, msg: result.error })
      } else {
        setPwFeedback({ ok: true, msg: 'Email de cambio de contraseña enviado.' })
      }
    })
  }

  function formatDate(iso: string | null) {
    if (!iso) return '—'
    return new Date(iso).toLocaleDateString('es-CL', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    })
  }

  return (
    <div className="space-y-6">

      {/* Lista de usuarios actuales */}
      <div className="space-y-2">
        <p className="text-[11px] text-[var(--text-muted)]">
          Usuarios con acceso al sistema (máximo 3).
        </p>
        <div className="rounded-[6px] border border-[var(--border-default)] overflow-hidden">
          {usuarios.length === 0 ? (
            <p className="px-4 py-3 text-[13px] text-[var(--text-muted)]">
              No se encontraron usuarios.
            </p>
          ) : (
            usuarios.map((u) => (
              <div
                key={u.id}
                className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--border-default)] last:border-b-0"
              >
                <div>
                  <p className="text-[13px] font-medium text-[var(--text-primary)]">
                    {u.email ?? '—'}
                  </p>
                  <p className="text-[11px] text-[var(--text-muted)]">
                    Creado {formatDate(u.created_at)} · Último acceso {formatDate(u.last_sign_in_at)}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Invitar nuevo usuario */}
      {usuarios.length < 3 && (
        <form onSubmit={handleInvite} className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-[12px] font-medium text-[#374151]">
              Invitar nuevo usuario
            </Label>
            <div className="flex gap-2">
              <Input
                name="email"
                type="email"
                required
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="nuevo@email.cl"
                className="h-8 text-[13px] border-[var(--border-default)] focus-visible:ring-[#7c3aed]/10 focus-visible:border-[#7c3aed] rounded-[6px]"
              />
              <Button
                type="submit"
                disabled={invitePending}
                className="h-8 px-3.5 text-[13px] bg-[#7c3aed] hover:bg-[#6d28d9] text-white font-medium rounded-[6px] whitespace-nowrap"
              >
                {invitePending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <>
                    <UserPlus className="w-3.5 h-3.5 mr-1.5" />
                    Invitar
                  </>
                )}
              </Button>
            </div>
          </div>

          {inviteFeedback && (
            <p className={`text-[12px] ${inviteFeedback.ok ? 'text-green-600' : 'text-red-500'}`}>
              {inviteFeedback.msg}
            </p>
          )}
        </form>
      )}

      {/* Cambio de contraseña */}
      <div className="border-t border-[var(--border-default)] pt-4 space-y-2">
        <p className="text-[12px] font-medium text-[#374151]">Cambiar contraseña</p>
        <p className="text-[11px] text-[var(--text-muted)]">
          Se enviará un email a <strong>{userEmail}</strong> con un enlace para cambiar la contraseña.
        </p>
        <Button
          type="button"
          onClick={handlePasswordReset}
          disabled={pwPending}
          variant="outline"
          className="h-8 px-3.5 text-[13px] border-[var(--border-default)] rounded-[6px]"
        >
          {pwPending ? (
            <>
              <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
              Enviando...
            </>
          ) : (
            <>
              <Mail className="w-3.5 h-3.5 mr-2" />
              Enviar email de cambio de contraseña
            </>
          )}
        </Button>
        {pwFeedback && (
          <p className={`text-[12px] flex items-center gap-1.5 ${pwFeedback.ok ? 'text-green-600' : 'text-red-500'}`}>
            {pwFeedback.ok && <CheckCircle2 className="w-3.5 h-3.5" />}
            {pwFeedback.msg}
          </p>
        )}
      </div>

    </div>
  )
}
