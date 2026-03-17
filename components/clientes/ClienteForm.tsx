'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { useTransition, useState, useCallback } from 'react'
import { Loader2, AlertCircle, Info, Plus, Trash2, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { crearCliente, actualizarCliente } from '@/app/actions/clientes'
import {
  crearContacto,
  actualizarContacto,
  eliminarContacto,
  setContactoPrincipal,
} from '@/app/actions/contactos'
import type { Cliente, Contacto, NivelPrecio } from '@/types/database.types'
import { NIVELES_PRECIO } from '@/types/database.types'

// ── RUT formatter ──────────────────────────────────────────────────────────

function formatRut(raw: string): string {
  const clean = raw.replace(/[^0-9kK]/g, '').toUpperCase()
  if (clean.length < 2) return clean
  const dv = clean.slice(-1)
  const body = clean.slice(0, -1)
  const formatted = body.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `${formatted}-${dv}`
}

// ── Schema ─────────────────────────────────────────────────────────────────

const schema = z.object({
  razon_social:         z.string().min(1, 'La razón social es requerida'),
  nombre_fantasia:      z.string().optional(),
  rut:                  z.string().optional(),
  giro:                 z.string().optional(),
  nivel_precio:         z.enum(['normal', 'empresa', 'agencia', 'especial']),
  descuento_porcentaje: z.number().min(0).max(100),
  canal_origen:         z.string().optional(),
  sitio_web:            z.string().optional(),
  notas:                z.string().optional(),
  direccion_fiscal:     z.string().optional(),
  comuna:               z.string().optional(),
  ciudad:               z.string().optional(),
}).refine(
  (data) => data.nivel_precio !== 'especial' || data.descuento_porcentaje > 0,
  { message: 'Ingresa un descuento mayor a 0 para nivel Especial', path: ['descuento_porcentaje'] }
)

type FormValues = z.infer<typeof schema>

const CANALES = ['WhatsApp', 'Email', 'Instagram', 'Presencial', 'Referido', 'Otro']

// ── Contact state type ─────────────────────────────────────────────────────

interface ContactoLocal {
  _key: string         // local identifier (not DB id)
  id?: string          // DB id if existing
  nombre: string
  cargo: string
  email: string
  telefono: string
  es_principal: boolean
  _deleted?: boolean
  _dirty?: boolean
}

// ── Props ──────────────────────────────────────────────────────────────────

interface ClienteFormProps {
  cliente?: Cliente & { contactos?: Contacto[] }
  onSuccess?: (id: string) => void
}

// ── Component ──────────────────────────────────────────────────────────────

export default function ClienteForm({ cliente, onSuccess }: ClienteFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [serverError, setServerError] = useState<string | null>(null)
  const [nombreFantasiaIgual, setNombreFantasiaIgual] = useState(
    !!cliente && cliente.razon_social === cliente.nombre_fantasia
  )

  // Initialize contacts state
  const [contactos, setContactos] = useState<ContactoLocal[]>(() => {
    if (cliente?.contactos && cliente.contactos.length > 0) {
      return cliente.contactos.map((c) => ({
        _key:        c.id,
        id:          c.id,
        nombre:      c.nombre,
        cargo:       c.cargo ?? '',
        email:       c.email ?? '',
        telefono:    c.telefono ?? '',
        es_principal: c.es_principal,
        _dirty:      false,
      }))
    }
    return []
  })

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      razon_social:         cliente?.razon_social ?? cliente?.nombre ?? '',
      nombre_fantasia:      cliente?.nombre_fantasia ?? '',
      rut:                  cliente?.rut ?? '',
      giro:                 cliente?.giro ?? '',
      nivel_precio:         (cliente?.nivel_precio as NivelPrecio) ?? 'normal',
      descuento_porcentaje: cliente?.descuento_porcentaje ?? 0,
      canal_origen:         cliente?.canal_origen ?? '',
      sitio_web:            cliente?.sitio_web ?? '',
      notas:                cliente?.notas ?? '',
      direccion_fiscal:     cliente?.direccion_fiscal ?? '',
      comuna:               cliente?.comuna ?? '',
      ciudad:               cliente?.ciudad ?? '',
    },
  })

  const nivelSeleccionado = watch('nivel_precio')
  const razonSocialValue  = watch('razon_social')
  const esEspecial        = nivelSeleccionado === 'especial'

  // Sync nombre_fantasia when checkbox is on
  const handleRazonSocialChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (nombreFantasiaIgual) {
      setValue('nombre_fantasia', e.target.value)
    }
  }, [nombreFantasiaIgual, setValue])

  function toggleNombreFantasiaIgual(checked: boolean) {
    setNombreFantasiaIgual(checked)
    if (checked) {
      setValue('nombre_fantasia', razonSocialValue)
    }
  }

  // ── Contact handlers ────────────────────────────────────────────────────

  function agregarContacto() {
    setContactos((prev) => [
      ...prev,
      {
        _key:        `new_${Date.now()}`,
        nombre:      '',
        cargo:       '',
        email:       '',
        telefono:    '',
        es_principal: prev.length === 0, // first contact is principal
        _dirty:      true,
      },
    ])
  }

  function actualizarContactoLocal(key: string, field: keyof Omit<ContactoLocal, '_key' | 'id' | '_deleted' | '_dirty'>, value: string | boolean) {
    setContactos((prev) =>
      prev.map((c) =>
        c._key === key ? { ...c, [field]: value, _dirty: true } : c
      )
    )
  }

  function eliminarContactoLocal(key: string) {
    setContactos((prev) =>
      prev.map((c) =>
        c._key === key
          ? c.id
            ? { ...c, _deleted: true }  // mark for DB deletion
            : undefined                  // remove new (unsaved) contacts
          : c
      ).filter(Boolean) as ContactoLocal[]
    )
  }

  function setPrincipal(key: string) {
    setContactos((prev) =>
      prev.map((c) => ({
        ...c,
        es_principal: c._key === key,
        _dirty: c._key === key ? true : c._dirty,
      }))
    )
  }

  // ── Submit ──────────────────────────────────────────────────────────────

  function onSubmit(values: FormValues) {
    setServerError(null)
    startTransition(async () => {
      // Map razon_social → nombre for backward compatibility
      const payload = {
        nombre:               values.razon_social,
        razon_social:         values.razon_social,
        nombre_fantasia:      nombreFantasiaIgual ? values.razon_social : (values.nombre_fantasia || undefined),
        rut:                  values.rut,
        giro:                 values.giro,
        nivel_precio:         values.nivel_precio,
        descuento_porcentaje: values.descuento_porcentaje,
        canal_origen:         values.canal_origen,
        sitio_web:            values.sitio_web,
        notas:                values.notas,
        direccion_fiscal:     values.direccion_fiscal,
        comuna:               values.comuna,
        ciudad:               values.ciudad,
        // Legacy fields kept for backward compat
        email:                undefined as string | undefined,
        telefono:             undefined as string | undefined,
        direccion:            undefined as string | undefined,
      }

      const result = cliente
        ? await actualizarCliente(cliente.id, payload)
        : await crearCliente(payload)

      if ('error' in result) {
        setServerError(result.error)
        return
      }

      const clienteId = result.id

      // Save contacts
      const visibleContacts = contactos.filter((c) => !c._deleted)
      const principalContact = visibleContacts.find((c) => c.es_principal)

      for (const contacto of contactos) {
        if (contacto._deleted && contacto.id) {
          await eliminarContacto(contacto.id, clienteId)
        } else if (!contacto._deleted && !contacto.id && contacto.nombre.trim()) {
          // New contact
          await crearContacto(clienteId, {
            nombre:       contacto.nombre,
            cargo:        contacto.cargo || undefined,
            email:        contacto.email || undefined,
            telefono:     contacto.telefono || undefined,
            es_principal: contacto.es_principal,
          })
        } else if (!contacto._deleted && contacto.id && contacto._dirty) {
          // Existing dirty contact
          await actualizarContacto(contacto.id, clienteId, {
            nombre:       contacto.nombre,
            cargo:        contacto.cargo || undefined,
            email:        contacto.email || undefined,
            telefono:     contacto.telefono || undefined,
            es_principal: contacto.es_principal,
          })
        }
      }

      // Set principal if needed
      if (principalContact?.id) {
        await setContactoPrincipal(principalContact.id, clienteId)
      }

      if (onSuccess) {
        onSuccess(clienteId)
      } else {
        router.push(`/clientes/${clienteId}`)
      }
    })
  }

  const visibleContactos = contactos.filter((c) => !c._deleted)

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

      {/* ── Section 1: Datos empresa ──────────────────────────── */}
      <section className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-[8px] p-5 space-y-4">
        <h2 className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-[0.1em]">
          Datos empresa
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Razón social */}
          <Field label="Razón social *" error={errors.razon_social?.message} className="sm:col-span-2">
            <Input
              {...register('razon_social', { onChange: handleRazonSocialChange })}
              placeholder="Empresa o nombre completo"
              className="h-8 text-[13px] bg-[var(--bg-input)] border-[var(--border-input)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/10 rounded-[6px]"
            />
          </Field>

          {/* Nombre fantasía */}
          <Field label="Nombre fantasía" error={errors.nombre_fantasia?.message} className="sm:col-span-2">
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer w-fit">
                <input
                  type="checkbox"
                  checked={nombreFantasiaIgual}
                  onChange={(e) => toggleNombreFantasiaIgual(e.target.checked)}
                  className="w-3.5 h-3.5 rounded border-[var(--border-input)] accent-[#7c3aed]"
                />
                <span className="text-[12px] text-[var(--text-secondary)]">¿Igual a razón social?</span>
              </label>
              {!nombreFantasiaIgual && (
                <Input
                  {...register('nombre_fantasia')}
                  placeholder="Nombre comercial (si es diferente)"
                  className="h-8 text-[13px] bg-[var(--bg-input)] border-[var(--border-input)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/10 rounded-[6px]"
                />
              )}
            </div>
          </Field>

          {/* RUT */}
          <Field label="RUT" error={errors.rut?.message}>
            <Input
              {...register('rut')}
              placeholder="12.345.678-9"
              onInput={(e) => {
                const target = e.currentTarget
                target.value = formatRut(target.value)
              }}
              className="h-8 text-[13px] bg-[var(--bg-input)] border-[var(--border-input)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/10 rounded-[6px]"
            />
          </Field>

          {/* Giro */}
          <Field label="Giro" error={errors.giro?.message}>
            <Input
              {...register('giro')}
              placeholder="Actividad comercial"
              className="h-8 text-[13px] bg-[var(--bg-input)] border-[var(--border-input)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/10 rounded-[6px]"
            />
          </Field>

          {/* Sitio web */}
          <Field label="Sitio web" error={errors.sitio_web?.message}>
            <Input
              {...register('sitio_web')}
              placeholder="https://empresa.cl"
              className="h-8 text-[13px] bg-[var(--bg-input)] border-[var(--border-input)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/10 rounded-[6px]"
            />
          </Field>

          {/* Canal de origen */}
          <Field label="Canal de origen" error={errors.canal_origen?.message}>
            <select
              {...register('canal_origen')}
              className="flex h-8 w-full rounded-[6px] border border-[var(--border-input)] bg-[var(--bg-input)] px-3 text-[13px] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/10 focus:border-[#7c3aed] transition-colors"
            >
              <option value="">Seleccionar...</option>
              {CANALES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </Field>
        </div>

        {/* Nivel de precio */}
        <div className="space-y-3 pt-1">
          <Label className="text-[12px] font-medium text-[var(--text-secondary)]">Nivel de precio</Label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {(Object.keys(NIVELES_PRECIO) as NivelPrecio[]).map((nivel) => {
              const isSelected = nivelSeleccionado === nivel
              return (
                <label
                  key={nivel}
                  className={[
                    'relative flex flex-col gap-1 rounded-[6px] border-2 p-3 cursor-pointer transition-all',
                    isSelected
                      ? 'border-[#7c3aed] bg-[#ede9fe]/20'
                      : 'border-[var(--border-default)] bg-[var(--bg-card)]',
                  ].join(' ')}
                >
                  <input
                    type="radio"
                    value={nivel}
                    {...register('nivel_precio')}
                    className="sr-only"
                  />
                  <span className={`text-[13px] font-semibold ${isSelected ? 'text-[#7c3aed]' : 'text-[var(--text-primary)]'}`}>
                    {NIVELES_PRECIO[nivel].label}
                  </span>
                  <span className="text-[11px] text-[var(--text-muted)] leading-tight">
                    {NIVELES_PRECIO[nivel].descripcion}
                  </span>
                  {isSelected && (
                    <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#7c3aed]" />
                  )}
                </label>
              )
            })}
          </div>

          {/* Descuento — solo para Especial */}
          {esEspecial && (
            <div className="rounded-[6px] border border-violet-200/30 bg-[#ede9fe]/10 p-4 space-y-3">
              <div className="flex items-start gap-2 text-[13px] text-[#7c3aed]">
                <Info className="w-4 h-4 mt-0.5 shrink-0" />
                <p>
                  El precio se calcula aplicando el descuento sobre el <strong>precio Normal</strong>.
                  Ej: con 20% de descuento, un producto de $10.000 cotiza a $8.000.
                </p>
              </div>
              <Field label="Descuento %" error={errors.descuento_porcentaje?.message}>
                <div className="relative max-w-[160px]">
                  <Input
                    {...register('descuento_porcentaje', { valueAsNumber: true })}
                    type="number"
                    min={1}
                    max={100}
                    step={0.5}
                    placeholder="0"
                    className="h-8 text-[13px] pr-8 bg-[var(--bg-input)] border-[var(--border-input)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/10 rounded-[6px]"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] text-[13px] pointer-events-none">%</span>
                </div>
              </Field>
            </div>
          )}
        </div>

        {/* Notas */}
        <Field label="Notas internas" error={errors.notas?.message}>
          <textarea
            {...register('notas')}
            rows={3}
            placeholder="Observaciones, condiciones especiales, etc."
            className="flex w-full rounded-[6px] border border-[var(--border-input)] bg-[var(--bg-input)] px-3 py-2 text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/10 focus:border-[#7c3aed] transition-colors resize-none"
          />
        </Field>
      </section>

      {/* ── Section 2: Contactos ──────────────────────────────── */}
      <section className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-[8px] p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-[0.1em]">
            Contactos
          </h2>
          <button
            type="button"
            onClick={agregarContacto}
            className="inline-flex items-center gap-1.5 h-7 px-2.5 text-[12px] font-medium text-[#7c3aed] border border-[#7c3aed]/30 rounded-[5px] hover:bg-[#7c3aed]/10 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Agregar contacto
          </button>
        </div>

        {visibleContactos.length === 0 ? (
          <p className="text-[13px] text-[var(--text-muted)] py-2">
            No hay contactos. Agrega al menos uno para facilitar el envío de cotizaciones.
          </p>
        ) : (
          <div className="space-y-3">
            {visibleContactos.map((contacto) => (
              <div
                key={contacto._key}
                className="rounded-[6px] border border-[var(--border-subtle)] bg-[var(--bg-muted)] p-3 space-y-3"
              >
                {/* Row 1: nombre + cargo */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[12px] font-medium text-[var(--text-secondary)]">Nombre *</label>
                    <input
                      type="text"
                      value={contacto.nombre}
                      onChange={(e) => actualizarContactoLocal(contacto._key, 'nombre', e.target.value)}
                      placeholder="Nombre completo"
                      className="w-full h-8 px-3 text-[13px] bg-[var(--bg-input)] border border-[var(--border-input)] rounded-[6px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/10"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[12px] font-medium text-[var(--text-secondary)]">Cargo</label>
                    <input
                      type="text"
                      value={contacto.cargo}
                      onChange={(e) => actualizarContactoLocal(contacto._key, 'cargo', e.target.value)}
                      placeholder="Gerente, Director, etc."
                      className="w-full h-8 px-3 text-[13px] bg-[var(--bg-input)] border border-[var(--border-input)] rounded-[6px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/10"
                    />
                  </div>
                </div>

                {/* Row 2: email + telefono */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[12px] font-medium text-[var(--text-secondary)]">Email</label>
                    <input
                      type="email"
                      value={contacto.email}
                      onChange={(e) => actualizarContactoLocal(contacto._key, 'email', e.target.value)}
                      placeholder="contacto@empresa.cl"
                      className="w-full h-8 px-3 text-[13px] bg-[var(--bg-input)] border border-[var(--border-input)] rounded-[6px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/10"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[12px] font-medium text-[var(--text-secondary)]">Teléfono</label>
                    <input
                      type="tel"
                      value={contacto.telefono}
                      onChange={(e) => actualizarContactoLocal(contacto._key, 'telefono', e.target.value)}
                      placeholder="+56 9 8619 3102"
                      className="w-full h-8 px-3 text-[13px] bg-[var(--bg-input)] border border-[var(--border-input)] rounded-[6px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/10"
                    />
                  </div>
                </div>

                {/* Row 3: principal toggle + delete */}
                <div className="flex items-center justify-between pt-0.5">
                  <button
                    type="button"
                    onClick={() => setPrincipal(contacto._key)}
                    className={[
                      'inline-flex items-center gap-1.5 h-6 px-2 text-[11px] font-medium rounded-[4px] transition-colors',
                      contacto.es_principal
                        ? 'bg-[#7c3aed]/15 text-[#7c3aed]'
                        : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-muted)]',
                    ].join(' ')}
                  >
                    <Star className={`w-3 h-3 ${contacto.es_principal ? 'fill-[#7c3aed]' : ''}`} />
                    {contacto.es_principal ? 'Principal' : 'Marcar como principal'}
                  </button>

                  <button
                    type="button"
                    onClick={() => eliminarContactoLocal(contacto._key)}
                    className="inline-flex items-center gap-1 h-6 px-2 text-[11px] text-[var(--text-muted)] hover:text-red-500 hover:bg-red-50/10 rounded-[4px] transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Section 3: Dirección ──────────────────────────────── */}
      <section className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-[8px] p-5 space-y-4">
        <h2 className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-[0.1em]">
          Dirección
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Dirección fiscal" error={errors.direccion_fiscal?.message} className="sm:col-span-2">
            <Input
              {...register('direccion_fiscal')}
              placeholder="Calle, número"
              className="h-8 text-[13px] bg-[var(--bg-input)] border-[var(--border-input)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/10 rounded-[6px]"
            />
          </Field>

          <Field label="Comuna" error={errors.comuna?.message}>
            <Input
              {...register('comuna')}
              placeholder="Quilpué"
              className="h-8 text-[13px] bg-[var(--bg-input)] border-[var(--border-input)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/10 rounded-[6px]"
            />
          </Field>

          <Field label="Ciudad" error={errors.ciudad?.message}>
            <Input
              {...register('ciudad')}
              placeholder="Valparaíso"
              className="h-8 text-[13px] bg-[var(--bg-input)] border-[var(--border-input)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/10 rounded-[6px]"
            />
          </Field>
        </div>
      </section>

      {/* ── Server error ───────────────────────────────────────── */}
      {serverError && (
        <div className="flex items-center gap-2 rounded-[6px] bg-red-50/10 border border-red-500/20 px-4 py-3 text-[13px] text-red-400">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {serverError}
        </div>
      )}

      {/* ── Actions ───────────────────────────────────────────── */}
      <div className="flex items-center gap-3 justify-end">
        <button
          type="button"
          onClick={() => router.back()}
          disabled={isPending}
          className="h-8 px-3.5 text-[13px] border border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)] rounded-[6px] transition-colors disabled:opacity-50"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center gap-2 h-8 px-3.5 text-[13px] bg-[#7c3aed] hover:bg-[#6d28d9] text-white font-medium rounded-[6px] transition-colors disabled:opacity-50 min-w-[130px] justify-center"
        >
          {isPending ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Guardando...
            </>
          ) : cliente ? (
            'Guardar cambios'
          ) : (
            'Crear cliente'
          )}
        </button>
      </div>
    </form>
  )
}

// ── Helper ─────────────────────────────────────────────────────────────────

function Field({
  label,
  error,
  children,
  className,
}: {
  label: string
  error?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={`space-y-1.5 ${className ?? ''}`}>
      <Label className="text-[12px] font-medium text-[var(--text-secondary)]">
        {label}
      </Label>
      {children}
      {error && (
        <p className="flex items-center gap-1.5 text-[11px] text-red-500">
          <AlertCircle className="w-3 h-3 shrink-0" />
          {error}
        </p>
      )}
    </div>
  )
}
