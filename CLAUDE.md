# CLAUDE.md — Sistema VVO Publicidad
> Este archivo es la memoria del proyecto. Léelo completo al inicio de cada sesión antes de escribir código.

---

## ¿Qué es este proyecto?

Sistema de gestión interno para **VVO Publicidad** (vvo.cl), imprenta digital ubicada en Quilpué, Chile. Opera con 2-3 usuarios internos. El sistema centraliza cotizaciones, órdenes de trabajo, facturación y seguimiento de cobros — todo lo que hoy se hace en Excel, WhatsApp y papel.

El sistema vive en **sistema.vvo.cl** (subdominio de Vercel).

---

## Stack tecnológico

| Capa | Tecnología | Motivo |
|---|---|---|
| Frontend + Backend | **Next.js 15** (App Router) | Full-stack en un solo proyecto |
| Base de datos | **Supabase** (PostgreSQL) | Auth incluida, tier gratuito, RLS por usuario |
| Deploy | **Vercel** | CI/CD automático, dominio personalizado gratis |
| Email | **Resend** | Envío de cotizaciones PDF, 3.000 emails/mes gratis |
| PDF | **@react-pdf/renderer** | PDFs de cotizaciones y OTs con diseño de marca VVO |
| Estilos | **Tailwind CSS v4** | Utilidades, consistencia, velocidad |
| UI Components | **shadcn/ui** | Componentes accesibles, sin dependencia de diseño |
| Autenticación | **Supabase Auth** | Login con email/password, sesiones JWT |
| ORM / queries | **Supabase JS Client** | Tipado automático desde el schema |

---

## Identidad visual VVO

### Paleta de colores
```
--vvo-purple-dark:   #3d1450   /* fondo principal, sidebar */
--vvo-purple:        #4a1a5c   /* fondo secundario, cards */
--vvo-purple-light:  #6b2d7a   /* hover states, bordes activos */
--vvo-magenta:       #e91e8c   /* acento principal, CTAs, highlights */
--vvo-magenta-dark:  #c4176f   /* hover del acento */
--vvo-navy:          #1a1a3e   /* contornos, detalles del logo */
--vvo-white:         #ffffff   /* texto principal */
--vvo-white-muted:   #d4b8e0   /* texto secundario, labels */
--vvo-surface:       #5a2268   /* inputs, tablas, superficies elevadas */
```

### Tipografía
- **Display / headings:** Montserrat Black (900) o Bebas Neue — para títulos grandes, números de cotización, totales
- **Interfaz:** Montserrat SemiBold (600) y Regular (400) — para labels, botones, navegación
- **Números / monospace:** DM Mono — para montos CLP, códigos de cotización, RUTs

### Tono visual
- Fondo oscuro púrpura en toda la app (no blanco, no gris)
- Acento magenta para acciones primarias, estados activos, badges
- Contraste alto texto blanco sobre púrpura
- Energético pero profesional — no sobrecargado

### Logo
- URL: `https://www.vvo.cl/wp-content/uploads/2022/04/vvopublicidad-imprenta-marketing.png`
- Descargar y guardar en `/public/logo-vvo.png` al iniciar el proyecto
- En PDFs usar versión sobre fondo blanco si existe, o sobre fondo púrpura oscuro
- En sidebar y topbar usar el logo completo con ícono + texto

---

## Módulos del sistema

### 1. Cotizador (`/cotizaciones`)
El módulo más crítico. Flujo:
1. Seleccionar cliente (o crear uno nuevo inline)
2. Seleccionar nivel de precio: **Público general / Empresa / Cliente VIP**
3. Agregar ítems: producto → medidas (ancho × alto en metros) → cantidad → terminaciones
4. El sistema calcula automáticamente: `precio_nivel × m² × cantidad + terminaciones`
5. Vista previa de la cotización antes de enviar
6. Generar PDF y enviar por email al cliente desde el sistema
7. La cotización queda en estado `borrador → enviada → aprobada / rechazada`

**Al aprobar una cotización** → opción de generar OT automáticamente con los datos heredados.

### 2. Base de productos (`/admin/productos`)
Tabla maestra configurable. Cada producto tiene:
- Nombre del producto (ej: "1mt² Trovicel 5mm emplacado adhesivo normal")
- Categoría (Emplacados / Telas PVC y Backlight / Adhesivos / Cajas de luz / Otro)
- Precio público general (por m²)
- Precio empresa (por m²)
- Precio VIP (por m²)
- Costo base (material + overhead) — para calcular margen internamente
- Unidad de medida: `m²` / `ml` / `unidad`
- Activo/inactivo

**Terminaciones configurables** (se suman al producto):
- Nombre (ej: Laminado, Ojetillos, Corte plotter, Bastidor)
- Precio adicional y unidad (por m², por ml, por unidad)

### 3. Órdenes de trabajo (`/ot`)
Soporta 2 orígenes:
- **Desde cotización aprobada** → hereda todos los datos
- **OT directa** → se crea manualmente sin cotización previa

Campos de una OT:
- Número correlativo (OT-001, OT-002...)
- Cliente + datos del trabajo
- Ítems con materiales, medidas, cantidad, terminaciones
- Máquina asignada (Plotter / Laminadora / Troqueladora / Caja de luz / Manual)
- Estado: `pendiente → en producción → terminado → entregado`
- Fecha de ingreso y fecha de entrega comprometida
- Notas internas de producción
- Archivo de diseño adjunto (URL o referencia)

### 4. Clientes (`/clientes`)
- RUT, razón social / nombre
- Email, teléfono, dirección
- Nivel de precio asignado (público / empresa / VIP)
- Canal de origen (WhatsApp / Email / Instagram / Presencial)
- Historial de cotizaciones y OTs
- Saldo pendiente de facturas

### 5. Facturación (`/facturas`)
Control interno de facturas emitidas (el sistema **no emite** documentos SII directamente — eso se hace en el portal SII como siempre, pero el sistema registra y hace seguimiento):
- Número de factura / boleta SII
- Cliente
- Monto neto + IVA + total
- Fecha de emisión y fecha de vencimiento
- Estado: `pendiente → pagada → vencida → anulada`
- Pagos parciales (rebaje): registrar abonos hasta completar el total
- Vinculada a OT o cotización origen

### 6. Dashboard (`/`)
Vista principal al ingresar:
- Cotizaciones enviadas sin respuesta (hace más de 3 días)
- OTs activas por estado (kanban compacto)
- Facturas vencidas y próximas a vencer
- Resumen del mes: cotizaciones enviadas, OTs completadas, facturado total, cobrado total

### 7. Configuración (`/admin`)
- Gestión de productos y terminaciones
- Gestión de máquinas
- Configuración de overhead / multiplicador de margen
- Datos de la empresa (para PDFs)
- Usuarios del sistema (hasta 3)

---

## Modelo de base de datos (Supabase / PostgreSQL)

```sql
-- Clientes
create table clientes (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  rut text,
  email text,
  telefono text,
  direccion text,
  nivel_precio text check (nivel_precio in ('publico','empresa','vip')) default 'publico',
  canal_origen text,
  notas text,
  activo boolean default true,
  created_at timestamptz default now()
);

-- Categorías de productos
create table categorias (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  orden int default 0
);

-- Productos (tabla maestra de precios)
create table productos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  categoria_id uuid references categorias(id),
  unidad text check (unidad in ('m2','ml','unidad')) default 'm2',
  precio_publico numeric not null default 0,
  precio_empresa numeric not null default 0,
  precio_vip numeric not null default 0,
  costo_base numeric default 0,
  activo boolean default true,
  created_at timestamptz default now()
);

-- Terminaciones configurables
create table terminaciones (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  unidad text check (unidad in ('m2','ml','unidad')) default 'm2',
  precio numeric not null default 0,
  activo boolean default true
);

-- Máquinas
create table maquinas (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  descripcion text,
  activo boolean default true
);

-- Cotizaciones
create table cotizaciones (
  id uuid primary key default gen_random_uuid(),
  numero text unique not null, -- COT-2026-001
  cliente_id uuid references clientes(id),
  nivel_precio text check (nivel_precio in ('publico','empresa','vip')),
  estado text check (estado in ('borrador','enviada','aprobada','rechazada')) default 'borrador',
  subtotal numeric default 0,
  iva numeric default 0,
  total numeric default 0,
  notas text,
  enviada_at timestamptz,
  valida_hasta date,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Ítems de cotización
create table cotizacion_items (
  id uuid primary key default gen_random_uuid(),
  cotizacion_id uuid references cotizaciones(id) on delete cascade,
  producto_id uuid references productos(id),
  descripcion text, -- descripción libre si no hay producto
  ancho numeric, -- metros
  alto numeric,  -- metros
  cantidad int default 1,
  precio_unitario numeric not null, -- precio/m² al momento de cotizar
  subtotal numeric not null,
  orden int default 0
);

-- Terminaciones por ítem de cotización
create table cotizacion_item_terminaciones (
  id uuid primary key default gen_random_uuid(),
  cotizacion_item_id uuid references cotizacion_items(id) on delete cascade,
  terminacion_id uuid references terminaciones(id),
  nombre text not null,
  precio numeric not null,
  cantidad numeric default 1
);

-- Órdenes de trabajo
create table ordenes_trabajo (
  id uuid primary key default gen_random_uuid(),
  numero text unique not null, -- OT-001
  cotizacion_id uuid references cotizaciones(id), -- null si es OT directa
  cliente_id uuid references clientes(id),
  maquina_id uuid references maquinas(id),
  estado text check (estado in ('pendiente','en_produccion','terminado','entregado')) default 'pendiente',
  fecha_entrega date,
  notas_produccion text,
  archivo_diseno text, -- URL
  subtotal numeric default 0,
  total numeric default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Ítems de OT (misma estructura que cotización)
create table ot_items (
  id uuid primary key default gen_random_uuid(),
  ot_id uuid references ordenes_trabajo(id) on delete cascade,
  producto_id uuid references productos(id),
  descripcion text,
  ancho numeric,
  alto numeric,
  cantidad int default 1,
  precio_unitario numeric not null,
  subtotal numeric not null,
  orden int default 0
);

-- Facturas
create table facturas (
  id uuid primary key default gen_random_uuid(),
  numero_sii text, -- número real del SII
  cliente_id uuid references clientes(id),
  ot_id uuid references ordenes_trabajo(id),
  cotizacion_id uuid references cotizaciones(id),
  monto_neto numeric not null,
  iva numeric not null,
  total numeric not null,
  estado text check (estado in ('pendiente','pagada','vencida','anulada')) default 'pendiente',
  fecha_emision date not null,
  fecha_vencimiento date,
  notas text,
  created_at timestamptz default now()
);

-- Pagos / rebajes de facturas
create table pagos (
  id uuid primary key default gen_random_uuid(),
  factura_id uuid references facturas(id) on delete cascade,
  monto numeric not null,
  fecha date not null,
  metodo text, -- transferencia, efectivo, cheque
  notas text,
  created_at timestamptz default now()
);
```

---

## Estructura de carpetas Next.js

```
vvo-sistema/
├── app/
│   ├── (auth)/
│   │   └── login/page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx              # Layout con sidebar
│   │   ├── page.tsx                # Dashboard principal
│   │   ├── cotizaciones/
│   │   │   ├── page.tsx            # Lista de cotizaciones
│   │   │   ├── nueva/page.tsx      # Crear cotización
│   │   │   └── [id]/page.tsx       # Detalle / editar
│   │   ├── ot/
│   │   │   ├── page.tsx
│   │   │   ├── nueva/page.tsx
│   │   │   └── [id]/page.tsx
│   │   ├── clientes/
│   │   │   ├── page.tsx
│   │   │   └── [id]/page.tsx
│   │   ├── facturas/
│   │   │   ├── page.tsx
│   │   │   └── [id]/page.tsx
│   │   └── admin/
│   │       ├── productos/page.tsx
│   │       ├── terminaciones/page.tsx
│   │       ├── maquinas/page.tsx
│   │       └── configuracion/page.tsx
│   └── api/
│       ├── cotizaciones/
│       │   ├── route.ts
│       │   └── [id]/
│       │       ├── route.ts
│       │       ├── enviar/route.ts  # Genera PDF + envía email
│       │       └── aprobar/route.ts # Aprueba y ofrece crear OT
│       ├── ot/route.ts
│       ├── facturas/route.ts
│       └── pdf/[id]/route.ts        # Genera PDF de cotización
├── components/
│   ├── ui/                          # shadcn/ui components
│   ├── cotizador/
│   │   ├── CotizadorForm.tsx        # Formulario principal
│   │   ├── ItemRow.tsx              # Fila de ítem con cálculo en tiempo real
│   │   └── ResumenCotizacion.tsx    # Totales + IVA
│   ├── pdf/
│   │   └── CotizacionPDF.tsx        # Template PDF con @react-pdf/renderer
│   ├── layout/
│   │   ├── Sidebar.tsx
│   │   └── TopBar.tsx
│   └── shared/
│       ├── ClienteSelector.tsx      # Selector con búsqueda + crear inline
│       ├── ProductoSelector.tsx
│       └── EstadoBadge.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts               # Cliente browser
│   │   └── server.ts               # Cliente server (RSC + API routes)
│   ├── email/
│   │   └── resend.ts               # Templates y función de envío
│   ├── pdf/
│   │   └── generarCotizacion.ts
│   └── utils/
│       ├── calculos.ts             # Lógica de m², totales, IVA
│       └── numeracion.ts           # Generador COT-2026-001, OT-001
├── types/
│   └── database.types.ts           # Tipos generados desde Supabase
├── .env.local
└── CLAUDE.md                       # Este archivo
```

---

## Variables de entorno requeridas

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Resend (email)
RESEND_API_KEY=

# App
NEXT_PUBLIC_APP_URL=https://sistema.vvo.cl
NEXT_PUBLIC_EMPRESA_NOMBRE=VVO Publicidad
NEXT_PUBLIC_EMPRESA_EMAIL=victor@vvo.cl
NEXT_PUBLIC_EMPRESA_TELEFONO=+56 9 86193102
NEXT_PUBLIC_EMPRESA_DIRECCION=Calle Tres 703, Belloto, Quilpué
```

---

## Reglas de negocio críticas

### Cálculo de precios
```
m2 = ancho × alto
subtotal_item = precio_nivel × m2 × cantidad
subtotal_terminaciones = suma de (precio_terminacion × cantidad)
subtotal_item_total = subtotal_item + subtotal_terminaciones

subtotal_cotizacion = suma de todos los subtotal_item_total
iva = subtotal_cotizacion × 0.19
total = subtotal_cotizacion + iva
```

### Niveles de precio
Los niveles van de MAYOR a MENOR precio — normal es el más caro, agencia el más económico:
- `normal` → precio más alto (público general, sin relación comercial)
- `empresa` → precio intermedio (clientes corporativos con relación establecida)
- `agencia` → precio más bajo estándar (agencias, diseñadores, volumen frecuente)
- `especial` → precio negociado caso a caso (el cliente tiene % descuento o precio directo)

El nivel se asigna al cliente y se hereda en cada cotización, pero es editable por cotización.
Los clientes `especial` tienen un campo descuento_porcentaje en la tabla clientes.
Se pueden agregar más niveles desde /admin/configuracion sin tocar código.

En la tabla productos las columnas de precio se llaman:
- precio_normal (antes precio_publico)
- precio_empresa
- precio_agencia (antes precio_vip)
El precio_especial se calcula en tiempo real: precio_normal × (1 - descuento_porcentaje/100)

### Numeración automática
- Cotizaciones: `COT-{AÑO}-{correlativo 3 dígitos}` → COT-2026-001
- OTs: `OT-{correlativo 4 dígitos}` → OT-0001 (correlativo global sin año)

### Estados y flujos permitidos
```
Cotización:  borrador → enviada → aprobada → (genera OT opcional)
                                → rechazada
OT:          pendiente → en_produccion → terminado → entregado
Factura:     pendiente → pagada (con rebajes parciales)
                       → vencida (automático si pasa fecha_vencimiento)
                       → anulada
```

### IVA
- Siempre 19% sobre el subtotal neto
- Los precios en la tabla de productos son **netos** (sin IVA)
- La cotización muestra subtotal neto + IVA + total

---

## PDF de cotización — contenido mínimo

1. Logo VVO Publicidad + datos empresa
2. Número de cotización + fecha + validez (30 días por defecto)
3. Datos del cliente
4. Tabla de ítems: descripción, dimensiones, cantidad, precio unitario, subtotal
5. Subtotal neto + IVA 19% + **Total**
6. Notas / condiciones comerciales
7. Firma de contacto (Victor Valdebenito + teléfono + email)

---

## Email de cotización — contenido

- **Asunto:** `Cotización ${numero} — VVO Publicidad`
- **Cuerpo:** Email HTML simple con resumen de la cotización y botón para descargar el PDF adjunto
- **Remitente:** `cotizaciones@vvo.cl` (configurar en Resend con dominio vvo.cl)
- **PDF adjunto:** Generado server-side antes del envío

---

## Orden de desarrollo recomendado

Construir en este orden exacto — cada fase es usable antes de empezar la siguiente:

**Fase 1 — Base (semana 1)**
1. Setup Next.js + Supabase + Tailwind + shadcn/ui
2. Auth: login con email/password, middleware de protección de rutas
3. Schema SQL completo en Supabase
4. Seed de datos iniciales: categorías, productos VVO reales, terminaciones, máquinas
5. Layout principal: sidebar + topbar

**Fase 2 — Cotizador (semana 2)**
6. CRUD de clientes
7. Admin de productos y terminaciones
8. Formulario de cotización con cálculo en tiempo real
9. Generación de PDF con @react-pdf/renderer
10. Envío por email con Resend

**Fase 3 — OT y seguimiento (semana 3)**
11. CRUD de órdenes de trabajo
12. Flujo cotización aprobada → genera OT
13. Vista de OT activas con estados
14. Dashboard principal con métricas

**Fase 4 — Facturación (semana 4)**
15. Registro de facturas
16. Sistema de rebajes / pagos parciales
17. Alertas de vencimiento
18. Reportes básicos del mes

---

## Convenciones de código

- Todo en **TypeScript** estricto — no usar `any`
- Server Components por defecto, Client Components solo donde haya interactividad
- Supabase queries en server actions o API routes, nunca exponer service role key al cliente
- Nombres en español para variables de dominio (cliente, cotizacion, orden_trabajo)
- Nombres en inglés para código técnico (handler, props, utils)
- Validación con **Zod** en todos los formularios y API routes
- Manejo de errores explícito — nunca silenciar errores con `catch(e) {}`

---

## Notas importantes

- El sistema **no emite documentos SII** — solo registra el número de factura/boleta que se emite manualmente en el portal SII. La integración SII directa queda para una fase futura.
- Los precios en la BD son siempre **netos sin IVA**
- El sistema opera en **Chile** — formato de fechas DD/MM/YYYY, moneda CLP, separador de miles punto y decimal coma
- Los emails de cotización se envían desde el sistema — el cliente NO tiene acceso al sistema
- Máximo 3 usuarios simultáneos — no necesita optimización para escala masiva
