import { Resend } from 'resend'

export function getResend() {
  const key = process.env.RESEND_API_KEY
  if (!key) throw new Error('RESEND_API_KEY no configurada')
  return new Resend(key)
}

export async function enviarCotizacion({
  to,
  cc,
  numeroCotizacion,
  pdfBuffer,
  asunto,
  cuerpo,
}: {
  to: string
  cc?: string[]
  numeroCotizacion: string
  pdfBuffer: Buffer
  asunto?: string
  cuerpo?: string
}) {
  const subject = asunto || `Cotización ${numeroCotizacion} — VVO Publicidad`
  const bodyHtml = (cuerpo ?? '').replace(/\n/g, '<br/>')

  return getResend().emails.send({
    from: 'cotizaciones@mail.vvo.cl',
    to,
    ...(cc && cc.length > 0 ? { cc } : {}),
    subject,
    html: `
      <div style="font-family:sans-serif;font-size:14px;color:#1a1a2e;max-width:600px">
        <div style="background:#3d1450;padding:20px 24px;border-radius:8px 8px 0 0">
          <span style="color:#fff;font-size:18px;font-weight:700">VVO Publicidad</span>
        </div>
        <div style="border:1px solid #e5e7eb;border-top:none;padding:24px;border-radius:0 0 8px 8px">
          <p style="margin:0 0 16px">${bodyHtml}</p>
          <div style="border-top:1px solid #e5e7eb;margin-top:24px;padding-top:16px;font-size:12px;color:#6b7280">
            <strong style="color:#3d1450">Victor Valdebenito — VVO Publicidad</strong><br/>
            +56 9 86193102 &nbsp;|&nbsp; victor@vvo.cl &nbsp;|&nbsp; vvo.cl
          </div>
        </div>
      </div>
    `,
    attachments: [
      {
        filename: `${numeroCotizacion}.pdf`,
        content: pdfBuffer,
      },
    ],
  })
}
