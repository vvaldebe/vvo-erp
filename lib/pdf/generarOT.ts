import { renderToBuffer } from '@react-pdf/renderer'
import React from 'react'
import fs from 'fs'
import path from 'path'
import OtPDF, { type OtPDFProps } from '@/components/pdf/OtPDF'

export type { OtPDFProps }

function getLogoBase64(): string | null {
  try {
    const logoPath = path.join(process.cwd(), 'public', 'logo-vvo.png')
    if (!fs.existsSync(logoPath)) return null
    const buffer = fs.readFileSync(logoPath)
    return `data:image/png;base64,${buffer.toString('base64')}`
  } catch {
    return null
  }
}

export async function generarOTPDF(
  data: Omit<OtPDFProps, 'logoBase64'>
): Promise<Buffer> {
  const logoBase64 = getLogoBase64()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const element = React.createElement(OtPDF as any, { ...data, logoBase64 })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buffer = await renderToBuffer(element as any)
  return Buffer.from(buffer)
}
