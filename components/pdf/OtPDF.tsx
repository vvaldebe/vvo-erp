import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from '@react-pdf/renderer'

// ── Tipos ──────────────────────────────────────────────────────────────────

export interface OtPDFProps {
  ot: {
    numero: string
    estado: string
    fecha_entrega: string | null
    notas_produccion: string | null
    total: number
    created_at: string
    maquina_nombre: string | null
  }
  cliente: { nombre: string; telefono?: string | null } | null
  items: {
    descripcion: string | null
    producto_nombre: string | null
    ancho: number | null
    alto: number | null
    cantidad: number
    subtotal: number
    notas_item?: string | null
  }[]
  logoBase64: string | null
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
  return new Date(iso + (iso.length === 10 ? 'T12:00:00' : '')).toLocaleDateString('es-CL', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })
}

function dimensiones(item: OtPDFProps['items'][number]) {
  if (item.ancho != null && item.alto != null) {
    return `${item.ancho.toFixed(2)} × ${item.alto.toFixed(2)} m²`
  }
  if (item.ancho != null) {
    return `${item.ancho.toFixed(2)} ml`
  }
  return '—'
}

function estadoLabel(estado: string) {
  const map: Record<string, string> = {
    pendiente:     'Pendiente',
    en_produccion: 'En producción',
    terminado:     'Terminado',
    entregado:     'Entregado',
  }
  return map[estado] ?? estado
}

// ── Estilos ────────────────────────────────────────────────────────────────

const C = {
  purple:  '#3d1450',
  magenta: '#e91e8c',
  text:    '#1a1a2e',
  muted:   '#6b7280',
  border:  '#e5e7eb',
  bg:      '#f9fafb',
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
  dividerMagenta: { height: 2, backgroundColor: C.magenta, marginBottom: 16 },
  divider: { height: 0.5, backgroundColor: C.border, marginBottom: 16 },

  // ── Título OT ──
  otRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 20 },
  otLabel: { fontSize: 8, color: C.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 },
  otNumero: { fontSize: 20, fontFamily: 'Helvetica-Bold', color: C.magenta },
  fechaBlock: { alignItems: 'flex-end' },
  fechaLabel: { fontSize: 7.5, color: C.muted, marginBottom: 1 },
  fechaValue: { fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: C.text, marginBottom: 3 },

  // ── Info grid ──
  infoGrid: { flexDirection: 'row', gap: 16, marginBottom: 20 },
  infoBlock: { flex: 1, backgroundColor: C.bg, borderRadius: 4, padding: 10 },
  infoLabel: { fontSize: 7, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 3 },
  infoValue: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: C.text, marginBottom: 1 },
  infoSub: { fontSize: 8, color: C.muted },

  // ── Sección ──
  sectionLabel: { fontSize: 7, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 5 },

  // ── Tabla ──
  tableHeader: { flexDirection: 'row', backgroundColor: C.purple, paddingVertical: 6, paddingHorizontal: 8, borderRadius: 2, marginBottom: 0 },
  tableHeaderText: { fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: '#ffffff' },
  tableRow: { flexDirection: 'row', paddingVertical: 6, paddingHorizontal: 8, borderBottomWidth: 0.5, borderBottomColor: C.border },
  tableRowAlt: { flexDirection: 'row', paddingVertical: 6, paddingHorizontal: 8, borderBottomWidth: 0.5, borderBottomColor: C.border, backgroundColor: C.bg },

  // columnas (515pt disponibles)
  colDesc: { width: 235 },
  colDim:  { width: 95 },
  colCant: { width: 45, textAlign: 'right' },
  colSub:  { width: 140, textAlign: 'right' },

  cellText:      { fontSize: 8.5, color: C.text },
  cellMuted:     { fontSize: 8, color: C.muted },
  cellMono:      { fontSize: 8.5, color: C.text, fontFamily: 'Courier' },
  cellMonoRight: { fontSize: 8.5, color: C.text, fontFamily: 'Courier', textAlign: 'right' },

  // ── Total ──
  totalBlock: { marginTop: 12, alignItems: 'flex-end' },
  totalDivider: { width: 210, height: 0.5, backgroundColor: C.border, marginBottom: 4 },
  totalRow: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 3 },
  totalFinalLabel: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: C.purple, width: 110, textAlign: 'right', marginRight: 8 },
  totalFinalValue: { fontSize: 11, fontFamily: 'Courier-Bold', color: C.magenta, width: 100, textAlign: 'right' },

  // ── Notas ──
  notasBlock: { marginTop: 20, borderTopWidth: 0.5, borderTopColor: C.border, paddingTop: 12 },
  notasLabel: { fontSize: 7.5, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 },
  notasText:  { fontSize: 8.5, color: C.text, lineHeight: 1.5 },

  // ── Firma ──
  firmaBlock: { marginTop: 36, flexDirection: 'row', justifyContent: 'flex-end' },
  firmaLine:  { width: 160, borderTopWidth: 0.5, borderTopColor: C.text, paddingTop: 4, alignItems: 'center' },
  firmaLabel: { fontSize: 7.5, color: C.muted },

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
  footerName:   { fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: C.purple, marginBottom: 1 },
  footerDetail: { fontSize: 7.5, color: C.muted },
  pageNumber:   { fontSize: 7, color: C.muted },
})

// ── Componente principal ───────────────────────────────────────────────────

export default function OtPDF({ ot, cliente, items, logoBase64 }: OtPDFProps) {
  return (
    <Document
      title={`${ot.numero} — VVO Publicidad`}
      author="VVO Publicidad"
    >
      <Page size="A4" style={s.page}>

        {/* ── HEADER ── */}
        <View style={s.header}>
          {logoBase64 ? (
            <Image src={logoBase64} style={s.logo} />
          ) : (
            <View style={s.logoPlaceholder} />
          )}
          <View style={s.companyBlock}>
            <Text style={s.companyName}>VVO PUBLICIDAD</Text>
            <Text style={s.companyDetail}>Calle Tres 703, Belloto, Quilpué</Text>
            <Text style={s.companyDetail}>+56 9 86193102  |  victor@vvo.cl</Text>
            <Text style={s.companyDetail}>vvo.cl</Text>
          </View>
        </View>

        <View style={s.dividerMagenta} />

        {/* ── NÚMERO Y FECHAS ── */}
        <View style={s.otRow}>
          <View>
            <Text style={s.otLabel}>Orden de Trabajo</Text>
            <Text style={s.otNumero}>{ot.numero}</Text>
          </View>
          <View style={s.fechaBlock}>
            <Text style={s.fechaLabel}>Fecha de ingreso</Text>
            <Text style={s.fechaValue}>{fecha(ot.created_at)}</Text>
            <Text style={s.fechaLabel}>Fecha de entrega</Text>
            <Text style={s.fechaValue}>{fecha(ot.fecha_entrega)}</Text>
          </View>
        </View>

        {/* ── INFO GRID: Cliente / Máquina / Estado ── */}
        <View style={s.infoGrid}>
          <View style={s.infoBlock}>
            <Text style={s.infoLabel}>Cliente</Text>
            <Text style={s.infoValue}>{cliente?.nombre ?? '—'}</Text>
            {cliente?.telefono && (
              <Text style={s.infoSub}>{cliente.telefono}</Text>
            )}
          </View>

          <View style={s.infoBlock}>
            <Text style={s.infoLabel}>Máquina</Text>
            <Text style={s.infoValue}>{ot.maquina_nombre ?? 'Sin asignar'}</Text>
          </View>

          <View style={s.infoBlock}>
            <Text style={s.infoLabel}>Estado</Text>
            <Text style={s.infoValue}>{estadoLabel(ot.estado)}</Text>
          </View>
        </View>

        {/* ── TABLA DE TRABAJOS ── */}
        <Text style={s.sectionLabel}>Trabajos</Text>

        <View style={s.tableHeader}>
          <Text style={{ ...s.tableHeaderText, ...s.colDesc }}>Descripción</Text>
          <Text style={{ ...s.tableHeaderText, ...s.colDim }}>Dimensiones</Text>
          <Text style={{ ...s.tableHeaderText, ...s.colCant }}>Cant.</Text>
          <Text style={{ ...s.tableHeaderText, ...s.colSub }}>Subtotal</Text>
        </View>

        {items.map((item, i) => (
          <View key={i} style={i % 2 === 0 ? s.tableRow : s.tableRowAlt}>
            <View style={s.colDesc}>
              <Text style={s.cellText}>
                {item.producto_nombre ?? item.descripcion ?? 'Ítem'}
              </Text>
              {item.producto_nombre && item.descripcion && (
                <Text style={s.cellMuted}>{item.descripcion}</Text>
              )}
              {item.notas_item && (
                <Text style={s.cellMuted}>{item.notas_item}</Text>
              )}
            </View>
            <Text style={{ ...s.cellMuted, ...s.colDim }}>
              {dimensiones(item)}
            </Text>
            <Text style={{ ...s.cellMono, ...s.colCant }}>
              {item.cantidad}
            </Text>
            <Text style={{ ...s.cellMonoRight, ...s.colSub }}>
              {clp(item.subtotal)}
            </Text>
          </View>
        ))}

        {/* ── TOTAL ── */}
        <View style={s.totalBlock}>
          <View style={s.totalDivider} />
          <View style={s.totalRow}>
            <Text style={s.totalFinalLabel}>TOTAL</Text>
            <Text style={s.totalFinalValue}>{clp(ot.total)}</Text>
          </View>
        </View>

        {/* ── NOTAS DE PRODUCCIÓN ── */}
        {ot.notas_produccion && (
          <View style={s.notasBlock}>
            <Text style={s.notasLabel}>Notas de producción</Text>
            <Text style={s.notasText}>{ot.notas_produccion}</Text>
          </View>
        )}

        {/* ── FIRMA ── */}
        <View style={s.firmaBlock}>
          <View style={s.firmaLine}>
            <Text style={s.firmaLabel}>Firma responsable</Text>
          </View>
        </View>

        {/* ── FOOTER ── */}
        <View style={s.footer} fixed>
          <View>
            <Text style={s.footerName}>Victor Valdebenito — VVO Publicidad</Text>
            <Text style={s.footerDetail}>+56 9 86193102  |  victor@vvo.cl  |  vvo.cl</Text>
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
