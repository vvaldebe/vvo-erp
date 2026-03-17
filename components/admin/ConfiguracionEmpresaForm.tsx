'use client'

import { useRef, useState, useTransition } from 'react'
import { Loader2, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface Props {
  valores: {
    empresa_nombre: string
    empresa_rut: string
    empresa_giro: string
    empresa_direccion: string
    empresa_telefono: string
    empresa_email: string
    empresa_web: string
  }
  action: (formData: FormData) => Promise<void>
}

export default function ConfiguracionEmpresaForm({ valores, action }: Props) {
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
          <Label className={labelClass}>Nombre de la empresa</Label>
          <Input
            name="empresa_nombre"
            type="text"
            defaultValue={valores.empresa_nombre}
            placeholder="VVO Publicidad"
            className={inputClass}
          />
        </div>

        <div className="space-y-1.5">
          <Label className={labelClass}>RUT empresa</Label>
          <Input
            name="empresa_rut"
            type="text"
            defaultValue={valores.empresa_rut}
            placeholder="12.345.678-9"
            className={inputClass}
          />
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <Label className={labelClass}>Giro comercial</Label>
          <Input
            name="empresa_giro"
            type="text"
            defaultValue={valores.empresa_giro}
            placeholder="Impresión digital, publicidad exterior"
            className={inputClass}
          />
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <Label className={labelClass}>Dirección</Label>
          <Input
            name="empresa_direccion"
            type="text"
            defaultValue={valores.empresa_direccion}
            placeholder="Calle Tres 703, Belloto, Quilpué"
            className={inputClass}
          />
        </div>

        <div className="space-y-1.5">
          <Label className={labelClass}>Teléfono</Label>
          <Input
            name="empresa_telefono"
            type="text"
            defaultValue={valores.empresa_telefono}
            placeholder="+56 9 86193102"
            className={inputClass}
          />
        </div>

        <div className="space-y-1.5">
          <Label className={labelClass}>Email de contacto</Label>
          <Input
            name="empresa_email"
            type="email"
            defaultValue={valores.empresa_email}
            placeholder="victor@vvo.cl"
            className={inputClass}
          />
        </div>

        <div className="space-y-1.5">
          <Label className={labelClass}>Sitio web</Label>
          <Input
            name="empresa_web"
            type="text"
            defaultValue={valores.empresa_web}
            placeholder="vvo.cl"
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
