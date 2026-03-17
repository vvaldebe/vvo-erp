'use client'

import { useActionState } from 'react'
import Image from 'next/image'
import { signIn } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AlertCircle, Loader2 } from 'lucide-react'

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(signIn, null)

  return (
    <div className="min-h-screen bg-[#18181b] flex items-center justify-center p-4">
      <div className="w-full max-w-[340px]">

        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Image
            src="/logo-vvo.png"
            alt="VVO Publicidad"
            width={140}
            height={44}
            className="object-contain h-10 w-auto"
            priority
          />
        </div>

        {/* Card */}
        <div className="bg-white rounded-[10px] p-7 border border-[#e4e4e7]">
          <h1 className="text-[15px] font-semibold text-[#09090b] mb-0.5">Iniciar sesión</h1>
          <p className="text-[13px] text-[#71717a] mb-6">
            Ingresa al sistema de gestión VVO
          </p>

          <form action={formAction} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-[12px] font-medium text-[#374151]">
                Email
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="usuario@vvo.cl"
                className="h-8 text-[13px] border-[#e4e4e7] bg-white text-[#09090b] placeholder:text-[#a1a1aa] focus-visible:ring-[#7c3aed]/10 focus-visible:border-[#7c3aed] rounded-[6px]"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-[12px] font-medium text-[#374151]">
                Contraseña
              </Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                placeholder="••••••••"
                className="h-8 text-[13px] border-[#e4e4e7] bg-white text-[#09090b] placeholder:text-[#a1a1aa] focus-visible:ring-[#7c3aed]/10 focus-visible:border-[#7c3aed] rounded-[6px]"
              />
            </div>

            {state?.error && (
              <div className="flex items-center gap-2 text-[13px] text-[#dc2626] bg-[#fee2e2] rounded-[6px] px-3 py-2 border border-[#fca5a5]">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                {state.error}
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
                  Ingresando...
                </>
              ) : (
                'Ingresar'
              )}
            </Button>
          </form>
        </div>

        <p className="text-center text-[#52525b] text-[11px] mt-6">
          VVO Publicidad — Quilpué, Chile
        </p>
      </div>
    </div>
  )
}
