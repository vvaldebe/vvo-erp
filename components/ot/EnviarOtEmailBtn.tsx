'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Loader2, Send } from 'lucide-react'
import { enviarOtAProduccion } from '@/app/actions/ot'

interface EnviarOtEmailBtnProps {
  otId: string
  otNumero: string
}

export default function EnviarOtEmailBtn({ otId, otNumero }: EnviarOtEmailBtnProps) {
  const [isPending, startTransition] = useTransition()
  const [sent, setSent] = useState(false)

  function handleEnviar() {
    startTransition(async () => {
      const result = await enviarOtAProduccion(otId)
      if ('error' in result) {
        toast.error(`Error al enviar: ${result.error}`)
      } else {
        toast.success(`${otNumero} enviada a producción`)
        setSent(true)
        setTimeout(() => setSent(false), 3000)
      }
    })
  }

  return (
    <button
      onClick={handleEnviar}
      disabled={isPending}
      className={`w-full inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium border rounded-[6px] transition-colors disabled:opacity-50 ${
        sent
          ? 'border-green-500 text-green-600 bg-green-50'
          : 'border-[var(--border-default)] text-[var(--text-primary)] hover:bg-[var(--bg-muted)]'
      }`}
    >
      {isPending ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          Enviando...
        </>
      ) : sent ? (
        '✓ Enviado'
      ) : (
        <>
          <Send className="w-4 h-4" />
          Enviar a producción
        </>
      )}
    </button>
  )
}
