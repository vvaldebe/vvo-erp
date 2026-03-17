'use client'

import { useState } from 'react'
import { CreditCard } from 'lucide-react'

interface DatosBancarios {
  banco?: string
  tipoCuenta?: string
  numeroCuenta?: string
  titular?: string
  rutTitular?: string
  emailTransferencia?: string
}

interface DatosPagoCotizacionProps {
  cotizacionId: string
  datosBancarios: DatosBancarios
  condicionesPago?: string
}

export default function DatosPagoCotizacion({
  cotizacionId,
  datosBancarios,
  condicionesPago,
}: DatosPagoCotizacionProps) {
  const [incluirEnPDF, setIncluirEnPDF] = useState(true)

  const tieneDatos = Object.values(datosBancarios).some(Boolean) || !!condicionesPago
  if (!tieneDatos) return null

  return (
    <div className="border border-[var(--border-default)] rounded-[8px] p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-[var(--text-muted)]" />
          <p className="text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-[0.1em]">
            Datos de pago
          </p>
        </div>
        <label className="flex items-center gap-2 text-xs text-[var(--text-secondary)] cursor-pointer select-none">
          <input
            type="checkbox"
            checked={incluirEnPDF}
            onChange={(e) => setIncluirEnPDF(e.target.checked)}
            className="w-3.5 h-3.5 accent-[#7c3aed]"
          />
          Incluir en PDF
        </label>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
        {datosBancarios.banco && (
          <div>
            <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider block">Banco</span>
            <span className="text-[var(--text-primary)]">{datosBancarios.banco}</span>
          </div>
        )}
        {datosBancarios.tipoCuenta && (
          <div>
            <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider block">Tipo cuenta</span>
            <span className="text-[var(--text-primary)]">{datosBancarios.tipoCuenta}</span>
          </div>
        )}
        {datosBancarios.numeroCuenta && (
          <div>
            <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider block">N° cuenta</span>
            <span className="text-[var(--text-primary)] font-mono">{datosBancarios.numeroCuenta}</span>
          </div>
        )}
        {datosBancarios.titular && (
          <div>
            <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider block">Titular</span>
            <span className="text-[var(--text-primary)]">{datosBancarios.titular}</span>
          </div>
        )}
        {datosBancarios.rutTitular && (
          <div>
            <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider block">RUT titular</span>
            <span className="text-[var(--text-primary)] font-mono">{datosBancarios.rutTitular}</span>
          </div>
        )}
        {datosBancarios.emailTransferencia && (
          <div>
            <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider block">Email transferencia</span>
            <span className="text-[var(--text-primary)]">{datosBancarios.emailTransferencia}</span>
          </div>
        )}
      </div>

      {condicionesPago && (
        <div>
          <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider block mb-1">
            Condiciones de pago
          </span>
          <p className="text-sm text-[var(--text-primary)] leading-relaxed whitespace-pre-wrap">
            {condicionesPago}
          </p>
        </div>
      )}

      <div className="pt-2 border-t border-[var(--border-subtle)]">
        <button
          type="button"
          onClick={() => {
            const url = incluirEnPDF
              ? `/api/pdf/${cotizacionId}`
              : `/api/pdf/${cotizacionId}?sinDatosBancarios=1`
            window.open(url, '_blank')
          }}
          className="text-xs font-medium text-[#7c3aed] hover:text-[#6d28d9] transition-colors underline"
        >
          Descargar PDF {incluirEnPDF ? 'con datos de pago' : 'sin datos de pago'}
        </button>
      </div>
    </div>
  )
}
