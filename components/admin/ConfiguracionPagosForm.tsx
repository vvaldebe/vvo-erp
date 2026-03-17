'use client'

import { useRef, useState, useTransition } from 'react'
import { Loader2, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

interface Props {
  condicionesPago: string
  action: (formData: FormData) => Promise<void>
}

export default function ConfiguracionPagosForm({ condicionesPago, action }: Props) {
  const formRef = useRef<HTMLFormElement>(null)
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    setSaved(false)
    startTransition(async () => {
      await action(formData)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    })
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label className="text-[12px] font-medium text-[#374151]">
          Texto de condiciones de pago
        </Label>
        <p className="text-[11px] text-[var(--text-muted)]">
          Se incluirá en el PDF de cada cotización debajo de los datos bancarios.
        </p>
        <Textarea
          name="condiciones_pago"
          defaultValue={condicionesPago}
          placeholder="Pago al contado vía transferencia bancaria. Factura emitida una vez confirmado el pago."
          rows={4}
          className="text-[13px] border-[var(--border-default)] focus-visible:ring-[#7c3aed]/10 focus-visible:border-[#7c3aed] rounded-[6px] resize-none"
        />
      </div>

      <div className="flex items-center gap-3">
        <Button
          type="submit"
          disabled={isPending}
          className="h-8 px-3.5 text-[13px] bg-[#7c3aed] hover:bg-[#6d28d9] text-white font-medium rounded-[6px] min-w-[120px]"
        >
          {isPending ? (
            <>
              <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
              Guardando...
            </>
          ) : (
            'Guardar cambios'
          )}
        </Button>

        {saved && !isPending && (
          <span className="flex items-center gap-1.5 text-[13px] text-green-600">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Guardado
          </span>
        )}
      </div>
    </form>
  )
}
