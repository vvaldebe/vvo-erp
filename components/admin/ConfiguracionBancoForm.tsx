'use client'

import { useRef, useState, useTransition } from 'react'
import { Loader2, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface Props {
  valores: {
    banco_nombre: string
    banco_tipo_cuenta: string
    banco_numero_cuenta: string
    banco_titular: string
    banco_rut_titular: string
    banco_email_transferencia: string
  }
  action: (formData: FormData) => Promise<void>
}

export default function ConfiguracionBancoForm({ valores, action }: Props) {
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

  const inputClass =
    'h-8 text-[13px] border-[var(--border-default)] focus-visible:ring-[#7c3aed]/10 focus-visible:border-[#7c3aed] rounded-[6px]'
  const labelClass = 'text-[12px] font-medium text-[#374151]'

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

        <div className="space-y-1.5">
          <Label className={labelClass}>Banco</Label>
          <Input
            name="banco_nombre"
            type="text"
            defaultValue={valores.banco_nombre}
            placeholder="Banco Estado"
            className={inputClass}
          />
        </div>

        <div className="space-y-1.5">
          <Label className={labelClass}>Tipo de cuenta</Label>
          <Input
            name="banco_tipo_cuenta"
            type="text"
            defaultValue={valores.banco_tipo_cuenta}
            placeholder="Cuenta Corriente / Vista / RUT"
            className={inputClass}
          />
        </div>

        <div className="space-y-1.5">
          <Label className={labelClass}>Número de cuenta</Label>
          <Input
            name="banco_numero_cuenta"
            type="text"
            defaultValue={valores.banco_numero_cuenta}
            placeholder="123456789"
            className={inputClass}
          />
        </div>

        <div className="space-y-1.5">
          <Label className={labelClass}>Titular de la cuenta</Label>
          <Input
            name="banco_titular"
            type="text"
            defaultValue={valores.banco_titular}
            placeholder="Victor Valdebenito"
            className={inputClass}
          />
        </div>

        <div className="space-y-1.5">
          <Label className={labelClass}>RUT del titular</Label>
          <Input
            name="banco_rut_titular"
            type="text"
            defaultValue={valores.banco_rut_titular}
            placeholder="12.345.678-9"
            className={inputClass}
          />
        </div>

        <div className="space-y-1.5">
          <Label className={labelClass}>Email para confirmación de transferencia</Label>
          <Input
            name="banco_email_transferencia"
            type="email"
            defaultValue={valores.banco_email_transferencia}
            placeholder="pagos@vvo.cl"
            className={inputClass}
          />
        </div>

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
