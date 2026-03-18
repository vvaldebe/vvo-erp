import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from '@react-pdf/renderer'

// ── Tipos ──────────────────────────────────────────────────────────────────

export interface CotizacionPDFData {
  numero: string
  fecha: string
  valida_hasta: string | null
  nivel_precio: string
  cliente: {
    nombre: string
    rut: string | null
    email: string | null
    telefono: string | null
    direccion: string | null
  } | null
  items: {
    descripcion: string
    subtitulo?: string | null
    producto_nombre: string | null
    notas_item?: string | null
    ancho: number | null
    alto: number | null
    cantidad: number
    precio_unitario: number
    subtotal: number
    unidad: string
    terminaciones: {
      nombre: string
      precio: number
      cantidad: number
    }[]
  }[]
  subtotal: number
  iva: number
  total: number
  notas: string | null
  logoBase64: string | null
  // Datos de empresa (sobreescribe los valores por defecto del header)
  empresaNombre?: string
  empresaDireccion?: string
  empresaTelefono?: string
  empresaEmail?: string
  empresaWeb?: string
  empresaRut?: string
  // Condiciones de pago y datos bancarios
  condicionesPago?: string
  datosBancarios?: {
    banco?: string
    tipoCuenta?: string
    numeroCuenta?: string
    titular?: string
    rutTitular?: string
    emailTransferencia?: string
  }
  // Contacto del cliente (persona de atención)
  contactoNombre?: string
  contactoEmail?: string
}

// ── Helpers ────────────────────────────────────────────────────────────────

function clp(n: number) {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
  }).format(n)
}

function fecha(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-CL', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })
}

function dimensiones(item: CotizacionPDFData['items'][number]) {
  if (item.unidad === 'm2' && item.ancho != null && item.alto != null) {
    return `${item.ancho.toFixed(2)} × ${item.alto.toFixed(2)} m²`
  }
  if (item.unidad === 'ml' && item.ancho != null) {
    return `${item.ancho.toFixed(2)} ml`
  }
  return '—'
}

// ── Estilos ────────────────────────────────────────────────────────────────

const C = {
  purple: '#3d1450',
  magenta: '#e91e8c',
  text: '#1a1a2e',
  muted: '#6b7280',
  border: '#e5e7eb',
  bg: '#f9fafb',
}

const s = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: C.text,
    paddingTop: 40,
    paddingBottom: 48,
    paddingHorizontal: 40,
    backgroundColor: '#ffffff',
  },

  // ── Header ──
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  logo: { width: 80, height: 88, objectFit: 'contain' },
  logoPlaceholder: { width: 80 },
  companyBlock: { alignItems: 'flex-end' },
  companyName: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: C.purple, marginBottom: 2 },
  companyDetail: { fontSize: 8, color: C.muted, marginBottom: 1 },

  // ── Divider ──
  divider: { height: 0.5, backgroundColor: C.border, marginBottom: 16 },
  dividerMagenta: { height: 2, backgroundColor: C.magenta, marginBottom: 16 },

  // ── Título cotización ──
  cotizacionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 20 },
  cotizacionLabel: { fontSize: 8, color: C.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 },
  cotizacionNumero: { fontSize: 20, fontFamily: 'Helvetica-Bold', color: C.magenta },
  fechaBlock: { alignItems: 'flex-end' },
  fechaLabel: { fontSize: 7.5, color: C.muted, marginBottom: 1 },
  fechaValue: { fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: C.text, marginBottom: 3 },

  // ── Sección ──
  sectionLabel: { fontSize: 7, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 5 },

  // ── Cliente ──
  clienteBlock: { backgroundColor: C.bg, borderRadius: 4, padding: 12, marginBottom: 20 },
  clienteNombre: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: C.text, marginBottom: 3 },
  clienteDetail: { fontSize: 8, color: C.muted, marginBottom: 1 },

  // ── Tabla ──
  tableHeader: { flexDirection: 'row', backgroundColor: C.purple, paddingVertical: 6, paddingHorizontal: 8, borderRadius: 2, marginBottom: 0 },
  tableHeaderText: { fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: '#ffffff' },
  tableRow: { flexDirection: 'row', paddingVertical: 6, paddingHorizontal: 8, borderBottomWidth: 0.5, borderBottomColor: C.border },
  tableRowAlt: { flexDirection: 'row', paddingVertical: 6, paddingHorizontal: 8, borderBottomWidth: 0.5, borderBottomColor: C.border, backgroundColor: C.bg },
  tableRowTerm: { flexDirection: 'row', paddingVertical: 4, paddingHorizontal: 8, paddingLeft: 20, backgroundColor: '#fdf4f9', borderBottomWidth: 0.5, borderBottomColor: C.border },

  // columnas (total 515pt disponibles)
  colDesc:   { width: 195 },
  colDim:    { width: 75 },
  colCant:   { width: 35, textAlign: 'right' },
  colPrecio: { width: 95, textAlign: 'right' },
  colSub:    { width: 115, textAlign: 'right' },

  cellText: { fontSize: 8.5, color: C.text },
  cellMuted: { fontSize: 8, color: C.muted },
  cellMono: { fontSize: 8.5, color: C.text, fontFamily: 'Courier' },
  cellMonoRight: { fontSize: 8.5, color: C.text, fontFamily: 'Courier', textAlign: 'right' },
  termLabel: { fontSize: 7.5, color: C.magenta },

  // ── Totales ──
  totalesBlock: { marginTop: 12, alignItems: 'flex-end' },
  totalesRow: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 3 },
  totalesLabel: { fontSize: 8.5, color: C.muted, width: 110, textAlign: 'right', marginRight: 8 },
  totalesValue: { fontSize: 8.5, fontFamily: 'Courier', color: C.text, width: 100, textAlign: 'right' },
  totalFinalLabel: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: C.purple, width: 110, textAlign: 'right', marginRight: 8 },
  totalFinalValue: { fontSize: 11, fontFamily: 'Courier-Bold', color: C.magenta, width: 100, textAlign: 'right' },
  totalDivider: { width: 218, height: 0.5, backgroundColor: C.border, marginBottom: 4 },

  // ── Notas ──
  notasBlock: { marginTop: 20, borderTopWidth: 0.5, borderTopColor: C.border, paddingTop: 12 },
  notasLabel: { fontSize: 7.5, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 },
  notasText: { fontSize: 8.5, color: C.text, lineHeight: 1.5 },
  condicionesText: { fontSize: 7.5, color: C.muted, marginTop: 6, lineHeight: 1.4 },

  // ── Pago / banco ──
  pagoBlock: { marginTop: 16, borderTopWidth: 0.5, borderTopColor: C.border, paddingTop: 12, flexDirection: 'row', gap: 20 },
  pagoCol: { flex: 1 },
  pagoLabel: { fontSize: 7, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 5 },
  pagoCondiciones: { fontSize: 8, color: C.text, lineHeight: 1.5, marginBottom: 0 },
  bancoRow: { flexDirection: 'row', marginBottom: 2 },
  bancoKey: { fontSize: 7.5, color: C.muted, width: 80 },
  bancoVal: { fontSize: 7.5, color: C.text },

  // ── Footer ──
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 40,
    right: 40,
    borderTopWidth: 0.5,
    borderTopColor: C.border,
    paddingTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerName: { fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: C.purple, marginBottom: 1 },
  footerDetail: { fontSize: 7.5, color: C.muted },
  pageNumber: { fontSize: 7, color: C.muted },
})

// ── Componente principal ───────────────────────────────────────────────────

export default function CotizacionPDF({ data }: { data: CotizacionPDFData }) {
  const empresaNombre    = data.empresaNombre    || 'VVO PUBLICIDAD'
  const empresaDireccion = data.empresaDireccion || 'Calle Tres 703, Belloto, Quilpué'
  const empresaTelefono  = data.empresaTelefono  || '+56 9 86193102'
  const empresaEmail     = data.empresaEmail     || 'victor@vvo.cl'
  const empresaWeb       = data.empresaWeb       || 'vvo.cl'
  const empresaRut       = data.empresaRut

  const db = data.datosBancarios ?? {}
  const tieneBanco = db.banco || db.numeroCuenta || db.titular

  return (
    <Document
      title={`${data.numero} — ${empresaNombre}`}
      author={empresaNombre}
    >
      <Page size="A4" style={s.page}>

        {/* ── HEADER ── */}
        <View style={s.header}>
          {data.logoBase64 ? (
            <Image src={data.logoBase64} style={s.logo} />
          ) : (
            <View style={s.logoPlaceholder} />
          )}
          <View style={s.companyBlock}>
            <Text style={s.companyName}>{empresaNombre.toUpperCase()}</Text>
            {empresaRut && (
              <Text style={s.companyDetail}>RUT: {empresaRut}</Text>
            )}
            <Text style={s.companyDetail}>{empresaDireccion}</Text>
            <Text style={s.companyDetail}>{empresaTelefono}  |  {empresaEmail}</Text>
            <Text style={s.companyDetail}>{empresaWeb}</Text>
          </View>
        </View>

        <View style={s.dividerMagenta} />

        {/* ── NÚMERO Y FECHAS ── */}
        <View style={s.cotizacionRow}>
          <View>
            <Text style={s.cotizacionLabel}>Cotización</Text>
            <Text style={s.cotizacionNumero}>{data.numero}</Text>
          </View>
          <View style={s.fechaBlock}>
            <Text style={s.fechaLabel}>Fecha de emisión</Text>
            <Text style={s.fechaValue}>{fecha(data.fecha)}</Text>
            <Text style={s.fechaLabel}>Válida hasta</Text>
            <Text style={s.fechaValue}>{fecha(data.valida_hasta)}</Text>
          </View>
        </View>

        {/* ── CLIENTE ── */}
        {data.cliente && (
          <View style={s.clienteBlock}>
            <Text style={s.sectionLabel}>Cotizar a</Text>
            <Text style={s.clienteNombre}>{data.cliente.nombre}</Text>
            {data.cliente.rut && (
              <Text style={s.clienteDetail}>RUT: {data.cliente.rut}</Text>
            )}
            {(data.contactoNombre || data.contactoEmail) && (
              <Text style={s.clienteDetail}>
                Atención: {[data.contactoNombre, data.contactoEmail].filter(Boolean).join('  ')}
              </Text>
            )}
            {data.cliente.email && (
              <Text style={s.clienteDetail}>{data.cliente.email}</Text>
            )}
            {data.cliente.telefono && (
              <Text style={s.clienteDetail}>{data.cliente.telefono}</Text>
            )}
            {data.cliente.direccion && (
              <Text style={s.clienteDetail}>{data.cliente.direccion}</Text>
            )}
          </View>
        )}

        {/* ── TABLA DE ÍTEMS ── */}
        <Text style={s.sectionLabel}>Detalle</Text>

        {/* Cabecera */}
        <View style={s.tableHeader}>
          <Text style={{ ...s.tableHeaderText, ...s.colDesc }}>Descripción</Text>
          <Text style={{ ...s.tableHeaderText, ...s.colDim }}>Dimensiones</Text>
          <Text style={{ ...s.tableHeaderText, ...s.colCant }}>Cant.</Text>
          <Text style={{ ...s.tableHeaderText, ...s.colPrecio }}>Precio/u</Text>
          <Text style={{ ...s.tableHeaderText, ...s.colSub }}>Subtotal</Text>
        </View>

        {/* Filas */}
        {data.items.map((item, i) => (
          <View key={i}>
            <View style={i % 2 === 0 ? s.tableRow : s.tableRowAlt}>
              <View style={s.colDesc}>
                {/* Title always bold — route.ts already resolves: catalog=product_name, free=titulo_item, Zoho=descripcion */}
                <Text style={{ ...s.cellText, fontFamily: 'Helvetica-Bold' }}>
                  {item.descripcion}
                </Text>
                {/* Subtitle: descripcion of catalog/free items when present */}
                {item.subtitulo && (
                  <Text style={s.cellMuted}>{item.subtitulo}</Text>
                )}
              </View>
              <Text style={{ ...s.cellMuted, ...s.colDim }}>
                {dimensiones(item)}
              </Text>
              <Text style={{ ...s.cellMono, ...s.colCant }}>
                {item.cantidad}
              </Text>
              <Text style={{ ...s.cellMonoRight, ...s.colPrecio }}>
                {clp(item.precio_unitario)}
              </Text>
              <Text style={{ ...s.cellMonoRight, ...s.colSub }}>
                {clp(item.subtotal)}
              </Text>
            </View>

            {/* Terminaciones del ítem */}
            {item.terminaciones.map((t, j) => (
              <View key={j} style={s.tableRowTerm}>
                <View style={s.colDesc}>
                  <Text style={s.termLabel}>  + {t.nombre}</Text>
                </View>
                <Text style={{ ...s.cellMuted, ...s.colDim }} />
                <Text style={{ ...s.cellMono, ...s.colCant }}>{t.cantidad}</Text>
                <Text style={{ ...s.cellMonoRight, ...s.colPrecio }}>
                  {clp(t.precio)}
                </Text>
                <Text style={{ ...s.cellMonoRight, ...s.colSub }}>
                  {clp(t.precio * t.cantidad)}
                </Text>
              </View>
            ))}
          </View>
        ))}

        {/* ── TOTALES ── */}
        <View style={s.totalesBlock}>
          <View style={s.totalesRow}>
            <Text style={s.totalesLabel}>Subtotal neto</Text>
            <Text style={s.totalesValue}>{clp(data.subtotal)}</Text>
          </View>
          <View style={s.totalesRow}>
            <Text style={s.totalesLabel}>IVA 19%</Text>
            <Text style={s.totalesValue}>{clp(data.iva)}</Text>
          </View>
          <View style={s.totalDivider} />
          <View style={s.totalesRow}>
            <Text style={s.totalFinalLabel}>TOTAL</Text>
            <Text style={s.totalFinalValue}>{clp(data.total)}</Text>
          </View>
        </View>

        {/* ── NOTAS ── */}
        <View style={s.notasBlock}>
          {data.notas && (
            <>
              <Text style={s.notasLabel}>Notas</Text>
              <Text style={s.notasText}>{data.notas}</Text>
            </>
          )}
          <Text style={s.condicionesText}>
            Los precios indicados son netos y no incluyen IVA. Esta cotización tiene validez de 30 días
            desde su emisión. Sujeto a disponibilidad de materiales.
          </Text>
        </View>

        {/* ── CONDICIONES DE PAGO + DATOS BANCARIOS ── */}
        {(data.condicionesPago || tieneBanco) && (
          <View style={s.pagoBlock}>

            {data.condicionesPago && (
              <View style={s.pagoCol}>
                <Text style={s.pagoLabel}>Condiciones de pago</Text>
                <Text style={s.pagoCondiciones}>{data.condicionesPago}</Text>
              </View>
            )}

            {tieneBanco && (
              <View style={s.pagoCol}>
                <Text style={s.pagoLabel}>Datos de transferencia</Text>
                {db.banco && (
                  <View style={s.bancoRow}>
                    <Text style={s.bancoKey}>Banco</Text>
                    <Text style={s.bancoVal}>{db.banco}</Text>
                  </View>
                )}
                {db.tipoCuenta && (
                  <View style={s.bancoRow}>
                    <Text style={s.bancoKey}>Tipo</Text>
                    <Text style={s.bancoVal}>{db.tipoCuenta}</Text>
                  </View>
                )}
                {db.numeroCuenta && (
                  <View style={s.bancoRow}>
                    <Text style={s.bancoKey}>Cuenta N°</Text>
                    <Text style={s.bancoVal}>{db.numeroCuenta}</Text>
                  </View>
                )}
                {db.titular && (
                  <View style={s.bancoRow}>
                    <Text style={s.bancoKey}>Titular</Text>
                    <Text style={s.bancoVal}>{db.titular}</Text>
                  </View>
                )}
                {db.rutTitular && (
                  <View style={s.bancoRow}>
                    <Text style={s.bancoKey}>RUT</Text>
                    <Text style={s.bancoVal}>{db.rutTitular}</Text>
                  </View>
                )}
                {db.emailTransferencia && (
                  <View style={s.bancoRow}>
                    <Text style={s.bancoKey}>Email</Text>
                    <Text style={s.bancoVal}>{db.emailTransferencia}</Text>
                  </View>
                )}
              </View>
            )}

          </View>
        )}

        {/* ── FOOTER ── */}
        <View style={s.footer} fixed>
          <View>
            <Text style={s.footerName}>{empresaNombre}</Text>
            <Text style={s.footerDetail}>{empresaTelefono}  |  {empresaEmail}  |  {empresaWeb}</Text>
          </View>
          <Text
            style={s.pageNumber}
            render={({ pageNumber, totalPages }) =>
              `Pág. ${pageNumber} / ${totalPages}`
            }
          />
        </View>

      </Page>
    </Document>
  )
}
