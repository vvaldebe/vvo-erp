'use client'

import { useRef, useState, useTransition } from 'react'
import { Loader2, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface Props {
  costoTintaGlobal: number
  overheadGlobal: number
  action: (formData: FormData) => Promise<void>
}

export default function ConfiguracionCostosForm({ costoTintaGlobal, overheadGlobal, action }: Props) {
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
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

        <div className="space-y-1.5">
          <Label className="text-[12px] font-medium text-[#374151]">
            Costo tinta / impresión ($/m²)
          </Label>
          <p className="text-[11px] text-[var(--text-muted)]">
            Costo promedio de tinta por metro cuadrado impreso
          </p>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] text-[13px] pointer-events-none">$</span>
            <Input
              name="costo_tinta_m2"
              type="number"
              min={0}
              step={1}
              defaultValue={costoTintaGlobal}
              required
              className="h-8 text-[13px] border-[var(--border-default)] focus-visible:ring-[#7c3aed]/10 focus-visible:border-[#7c3aed] rounded-[6px] pl-7"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-[12px] font-medium text-[#374151]">
            Overhead ($/m²)
          </Label>
          <p className="text-[11px] text-[var(--text-muted)]">
            Luz, agua, sueldos y gastos generales prorrateados
          </p>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] text-[13px] pointer-events-none">$</span>
            <Input
              name="overhead_m2"
              type="number"
              min={0}
              step={1}
              defaultValue={overheadGlobal}
              required
              className="h-8 text-[13px] border-[var(--border-default)] focus-visible:ring-[#7c3aed]/10 focus-visible:border-[#7c3aed] rounded-[6px] pl-7"
            />
          </div>
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
