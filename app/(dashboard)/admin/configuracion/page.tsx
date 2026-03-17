'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import ConfiguracionCostosForm from '@/components/admin/ConfiguracionCostosForm'
import ConfiguracionEmpresaForm from '@/components/admin/ConfiguracionEmpresaForm'
import ConfiguracionBancoForm from '@/components/admin/ConfiguracionBancoForm'
import ConfiguracionPagosForm from '@/components/admin/ConfiguracionPagosForm'
import ConfiguracionUsuariosPanel from '@/components/admin/ConfiguracionUsuariosPanel'

// ── Claves que maneja esta página ───────────────────────────────────────────

const CLAVES_EMPRESA = [
  'empresa_nombre', 'empresa_rut', 'empresa_giro',
  'empresa_direccion', 'empresa_telefono', 'empresa_email', 'empresa_web',
] as const

const CLAVES_BANCO = [
  'banco_nombre', 'banco_tipo_cuenta', 'banco_numero_cuenta',
  'banco_titular', 'banco_rut_titular', 'banco_email_transferencia',
] as const

const CLAVES_COSTOS = ['costo_tinta_m2', 'overhead_m2'] as const

const CLAVES_PAGOS = ['condiciones_pago'] as const

// ── Helpers ─────────────────────────────────────────────────────────────────

function val(rows: { clave: string; valor: string }[], clave: string, fallback = '') {
  return rows.find((r) => r.clave === clave)?.valor ?? fallback
}

async function upsertClaves(
  supabase: Awaited<ReturnType<typeof createClient>>,
  entries: [string, string][]
) {
  await Promise.all(
    entries.map(([clave, valor]) =>
      supabase.from('configuracion').upsert({ clave, valor }, { onConflict: 'clave' })
    )
  )
  revalidatePath('/admin/configuracion')
}

// ── Server Actions ───────────────────────────────────────────────────────────

async function guardarEmpresa(formData: FormData) {
  'use server'
  const supabase = await createClient()
  await upsertClaves(
    supabase,
    CLAVES_EMPRESA.map((k) => [k, String(formData.get(k) ?? '')])
  )
}

async function guardarBanco(formData: FormData) {
  'use server'
  const supabase = await createClient()
  await upsertClaves(
    supabase,
    CLAVES_BANCO.map((k) => [k, String(formData.get(k) ?? '')])
  )
}

async function guardarCostosGlobales(formData: FormData) {
  'use server'
  const costoTinta = Number(formData.get('costo_tinta_m2'))
  const overhead   = Number(formData.get('overhead_m2'))
  if (isNaN(costoTinta) || isNaN(overhead)) return
  const supabase = await createClient()
  await upsertClaves(supabase, [
    ['costo_tinta_m2', String(costoTinta)],
    ['overhead_m2',    String(overhead)],
  ])
}

async function guardarCondicionesPago(formData: FormData) {
  'use server'
  const supabase = await createClient()
  await upsertClaves(supabase, [
    ['condiciones_pago', String(formData.get('condiciones_pago') ?? '')],
  ])
}

async function invitarUsuario(formData: FormData): Promise<{ error?: string; success?: boolean }> {
  'use server'
  const email = String(formData.get('email') ?? '').trim()
  if (!email) return { error: 'Email requerido' }

  try {
    const admin = createAdminClient()
    const { error } = await admin.auth.admin.inviteUserByEmail(email)
    if (error) return { error: error.message }
    return { success: true }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Error al invitar usuario' }
  }
}

async function cambiarPassword(formData: FormData): Promise<{ error?: string; success?: boolean }> {
  'use server'
  const email = String(formData.get('email') ?? '').trim()
  if (!email) return { error: 'Email requerido' }

  const supabase = await createClient()
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password`,
  })
  if (error) return { error: error.message }
  return { success: true }
}

// ── Página ───────────────────────────────────────────────────────────────────

export default async function AdminConfiguracionPage() {
  const supabase = await createClient()

  // Usuario actual
  const { data: { user } } = await supabase.auth.getUser()

  // Fetch de todas las claves de configuración relevantes
  const allClaves = [...CLAVES_EMPRESA, ...CLAVES_BANCO, ...CLAVES_COSTOS, ...CLAVES_PAGOS]
  const { data: configRows = [] } = await supabase
    .from('configuracion')
    .select('clave, valor')
    .in('clave', allClaves)

  const rows = configRows ?? []

  // Valores por sección
  const valoresEmpresa = {
    empresa_nombre:    val(rows, 'empresa_nombre',    'VVO Publicidad'),
    empresa_rut:       val(rows, 'empresa_rut',       ''),
    empresa_giro:      val(rows, 'empresa_giro',      'Impresión digital, publicidad exterior'),
    empresa_direccion: val(rows, 'empresa_direccion', 'Calle Tres 703, Belloto, Quilpué'),
    empresa_telefono:  val(rows, 'empresa_telefono',  '+56 9 86193102'),
    empresa_email:     val(rows, 'empresa_email',     'victor@vvo.cl'),
    empresa_web:       val(rows, 'empresa_web',       'vvo.cl'),
  }

  const valoresBanco = {
    banco_nombre:              val(rows, 'banco_nombre',              ''),
    banco_tipo_cuenta:         val(rows, 'banco_tipo_cuenta',         ''),
    banco_numero_cuenta:       val(rows, 'banco_numero_cuenta',       ''),
    banco_titular:             val(rows, 'banco_titular',             ''),
    banco_rut_titular:         val(rows, 'banco_rut_titular',         ''),
    banco_email_transferencia: val(rows, 'banco_email_transferencia', ''),
  }

  const costoTintaGlobal = Number(val(rows, 'costo_tinta_m2', '2500'))
  const overheadGlobal   = Number(val(rows, 'overhead_m2',    '1800'))
  const condicionesPago  = val(rows, 'condiciones_pago', 'Pago al contado vía transferencia bancaria. Factura emitida una vez confirmado el pago.')

  // Usuarios (via service role)
  let usuarios: { id: string; email: string | null; created_at: string; last_sign_in_at: string | null }[] = []
  try {
    const admin = createAdminClient()
    const { data: usersData } = await admin.auth.admin.listUsers()
    usuarios = (usersData?.users ?? []).map((u) => ({
      id:              u.id,
      email:           u.email ?? null,
      created_at:      u.created_at,
      last_sign_in_at: u.last_sign_in_at ?? null,
    }))
  } catch {
    // Si falla (ej: no hay SUPABASE_SERVICE_ROLE_KEY en dev), mostrar vacío
  }

  const sectionClass =
    'bg-[var(--bg-card)] border border-[var(--border-default)] rounded-[8px] p-5 space-y-4'
  const sectionHeaderClass =
    'text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-[0.1em]'
  const sectionDescClass = 'text-[12px] text-[var(--text-muted)] mt-1'

  return (
    <div className="max-w-2xl space-y-8">

      {/* Header */}
      <div>
        <h1 className="text-xl font-black text-[var(--text-primary)]">Configuración</h1>
        <p className="text-sm text-[var(--text-muted)] mt-0.5">Parámetros globales del sistema</p>
      </div>

      {/* ── A) Datos de la empresa ── */}
      <section className={sectionClass}>
        <div>
          <h2 className={sectionHeaderClass}>Datos de la empresa</h2>
          <p className={sectionDescClass}>
            Aparecen en el encabezado de los PDFs de cotizaciones y en los emails.
          </p>
        </div>
        <ConfiguracionEmpresaForm
          valores={valoresEmpresa}
          action={guardarEmpresa}
        />
      </section>

      {/* ── B) Datos bancarios ── */}
      <section className={sectionClass}>
        <div>
          <h2 className={sectionHeaderClass}>Datos bancarios</h2>
          <p className={sectionDescClass}>
            Se incluyen en el PDF de cada cotización para facilitar el pago por transferencia.
          </p>
        </div>
        <ConfiguracionBancoForm
          valores={valoresBanco}
          action={guardarBanco}
        />
      </section>

      {/* ── C) Costos globales de producción ── */}
      <section className={sectionClass}>
        <div>
          <h2 className={sectionHeaderClass}>Costos globales de producción</h2>
          <p className={sectionDescClass}>
            Estos valores se aplican automáticamente al calcular el costo base de todos los productos.
          </p>
        </div>
        <ConfiguracionCostosForm
          costoTintaGlobal={costoTintaGlobal}
          overheadGlobal={overheadGlobal}
          action={guardarCostosGlobales}
        />
      </section>

      {/* ── D) Condiciones de pago ── */}
      <section className={sectionClass}>
        <div>
          <h2 className={sectionHeaderClass}>Condiciones de pago</h2>
          <p className={sectionDescClass}>
            Texto que aparece al final de cada cotización en PDF.
          </p>
        </div>
        <ConfiguracionPagosForm
          condicionesPago={condicionesPago}
          action={guardarCondicionesPago}
        />
      </section>

      {/* ── E) Seguridad y usuarios ── */}
      <section className={sectionClass}>
        <div>
          <h2 className={sectionHeaderClass}>Seguridad y usuarios</h2>
          <p className={sectionDescClass}>
            Gestión de acceso al sistema. Máximo 3 usuarios.
          </p>
        </div>
        <ConfiguracionUsuariosPanel
          usuarios={usuarios}
          invitarUsuarioAction={invitarUsuario}
          cambiarPasswordAction={cambiarPassword}
          userEmail={user?.email ?? ''}
        />
      </section>

    </div>
  )
}
