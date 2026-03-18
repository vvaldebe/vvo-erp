'use client'

import { useState, useTransition } from 'react'
import { Loader2, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface Props {
  prefijoCotizacion: string
  prefijoFactura:    string
  numeroInicialFacturas: string
  facturaCount:      number
  action: (formData: FormData) => Promise<void>
}

export default function ConfiguracionNumeracionForm({
  prefijoCotizacion,
  prefijoFactura,
  numeroInicialFacturas,
  facturaCount,
  action,
}: Props) {
  const [prefijoCot, setPrefijoCot]     = useState(prefijoCotizacion)
  const [prefijoFac, setPrefijoFac]     = useState(prefijoFactura)
  const [numInicial, setNumInicial]     = useState(numeroInicialFacturas)
  const [saved, setSaved]               = useState(false)
  const [isPending, startTransition]    = useTransition()

  const previewCount = Math.max(facturaCount + Number(numInicial || '1'), 1)
  const previewNumero = `${prefijoFac}${String(previewCount).padStart(6, '0')}`

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    setSaved(false)
    startTransition(async () => {
      await action(formData)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="prefijo_cotizacion" className="text-[12px] font-medium text-[var(--text-secondary)]">
            Prefijo cotizaciones
          </Label>
          <Input
            id="prefijo_cotizacion"
            name="prefijo_cotizacion"
            value={prefijoCot}
            onChange={(e) => setPrefijoCot(e.target.value)}
            placeholder="COT-"
            className="h-8 text-[13px] border-[var(--border-input)] bg-[var(--bg-input)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] rounded-[6px]"
          />
          <p className="text-[11px] text-[var(--text-muted)]">
            Ej: {prefijoCot || 'COT-'}2026-001
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="prefijo_factura" className="text-[12px] font-medium text-[var(--text-secondary)]">
            Prefijo facturas
          </Label>
          <Input
            id="prefijo_factura"
            name="prefijo_factura"
            value={prefijoFac}
            onChange={(e) => setPrefijoFac(e.target.value)}
            placeholder="F-"
            className="h-8 text-[13px] border-[var(--border-input)] bg-[var(--bg-input)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] rounded-[6px]"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="numero_inicial_facturas" className="text-[12px] font-medium text-[var(--text-secondary)]">
          Número inicial facturas
        </Label>
        <Input
          id="numero_inicial_facturas"
          name="numero_inicial_facturas"
          type="number"
          min={0}
          value={numInicial}
          onChange={(e) => setNumInicial(e.target.value)}
          placeholder="1"
          className="h-8 text-[13px] border-[var(--border-input)] bg-[var(--bg-input)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] rounded-[6px] w-32"
        />
        <p className="text-[11px] text-[var(--text-muted)]">
          Vista previa próximo número:{' '}
          <span className="font-mono font-semibold text-[var(--text-primary)]">{previewNumero}</span>
        </p>
      </div>

      <div className="flex items-center gap-3 pt-1">
        <Button
          type="submit"
          disabled={isPending}
          className="h-8 px-4 bg-[#7c3aed] hover:bg-[#6d28d9] text-white text-[13px] font-medium rounded-[6px] transition-colors cursor-pointer"
        >
          {isPending ? (
            <>
              <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
              Guardando...
            </>
          ) : (
            'Guardar'
          )}
        </Button>
        {saved && (
          <span className="flex items-center gap-1.5 text-[12px] text-[#16a34a]">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Guardado
          </span>
        )}
      </div>
    </form>
  )
}
