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
  total,
  validaHasta,
  linkAprobacion,
}: {
  to: string
  cc?: string[]
  numeroCotizacion: string
  pdfBuffer: Buffer
  asunto?: string
  cuerpo?: string
  total?: string
  validaHasta?: string
  linkAprobacion?: string
}) {
  const subject = asunto || `Cotización ${numeroCotizacion} — VVO Publicidad`
  const bodyText = (cuerpo ?? '').replace(/\n/g, '<br/>')

  const resumenRows = [
    total      ? `<tr><td style="padding:6px 0;color:#6b7280;font-size:13px">Total</td><td style="padding:6px 0;text-align:right;font-weight:700;font-size:15px;color:#1a1a2e">${total}</td></tr>` : '',
    validaHasta ? `<tr><td style="padding:6px 0;color:#6b7280;font-size:13px">Válida hasta</td><td style="padding:6px 0;text-align:right;font-size:13px;color:#374151">${validaHasta}</td></tr>` : '',
  ].filter(Boolean).join('')

  const resumenSection = resumenRows ? `
    <table style="width:100%;border-collapse:collapse;background:#f9fafb;border-radius:6px;overflow:hidden;margin:20px 0">
      <tbody style="padding:12px 16px;display:block">
        ${resumenRows}
      </tbody>
    </table>
  ` : ''

  const aprobacionSection = linkAprobacion ? `
    <div style="margin:24px 0;padding:16px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px">
      <p style="margin:0 0 12px;font-size:14px;color:#166534">¿Desea aprobar esta cotización?</p>
      <a href="${linkAprobacion}"
         style="display:inline-block;background:#16a34a;color:#fff;font-weight:700;font-size:14px;padding:10px 20px;border-radius:6px;text-decoration:none">
        ✓ Aprobar cotización
      </a>
    </div>
  ` : ''

  const html = `
    <!DOCTYPE html>
    <html lang="es">
    <head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
    <body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%">

              <!-- Header -->
              <tr>
                <td style="background:#1a1a2e;padding:24px 32px;border-radius:8px 8px 0 0">
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td>
                        <span style="color:#fff;font-size:20px;font-weight:700;letter-spacing:-0.3px">VVO Publicidad</span>
                        <br/>
                        <span style="color:#9ca3af;font-size:12px">vvo.cl &nbsp;·&nbsp; Quilpué, Chile</span>
                      </td>
                      <td align="right">
                        <span style="color:#d1d5db;font-size:13px">${numeroCotizacion}</span>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Body -->
              <tr>
                <td style="background:#ffffff;padding:32px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px">

                  <p style="margin:0 0 20px;font-size:15px;color:#111827;line-height:1.6">${bodyText}</p>

                  ${resumenSection}

                  ${aprobacionSection}

                  <!-- Footer -->
                  <div style="border-top:1px solid #e5e7eb;margin-top:28px;padding-top:20px">
                    <p style="margin:0;font-size:13px;font-weight:700;color:#3d1450">Victor Valdebenito</p>
                    <p style="margin:4px 0 0;font-size:12px;color:#6b7280">
                      VVO Publicidad &nbsp;·&nbsp;
                      <a href="tel:+56986193102" style="color:#6b7280;text-decoration:none">+56 9 86193102</a>
                      &nbsp;·&nbsp;
                      <a href="mailto:victor@vvo.cl" style="color:#6b7280;text-decoration:none">victor@vvo.cl</a>
                      &nbsp;·&nbsp;
                      <a href="https://vvo.cl" style="color:#6b7280;text-decoration:none">vvo.cl</a>
                    </p>
                  </div>

                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `

  return getResend().emails.send({
    from: 'cotizaciones@mail.vvo.cl',
    to,
    ...(cc && cc.length > 0 ? { cc } : {}),
    subject,
    html,
    attachments: [
      {
        filename: `${numeroCotizacion}.pdf`,
        content: pdfBuffer,
      },
    ],
  })
}
