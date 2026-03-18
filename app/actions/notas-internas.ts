'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function actualizarNotasInternas(
  id:    string,
  tipo:  'cotizacion' | 'ot',
  notas: string
): Promise<{ error: string } | { success: true }> {
  if (!id) return { error: 'ID requerido' }

  const supabase = await createClient()

  if (tipo === 'cotizacion') {
    const { error } = await supabase
      .from('cotizaciones')
      .update({ notas_internas: notas || null, updated_at: new Date().toISOString() })
      .eq('id', id)

    if (error) return { error: error.message }
    revalidatePath('/cotizaciones')
  } else {
    const { error } = await supabase
      .from('ordenes_trabajo')
      .update({ notas_internas: notas || null, updated_at: new Date().toISOString() })
      .eq('id', id)

    if (error) return { error: error.message }
    revalidatePath('/ot')
  }

  return { success: true }
}
