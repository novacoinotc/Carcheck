import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer';
import type { ReportDetail } from '@/lib/reports/queries';

/* ---------- typed shapes for the AI JSON blobs ---------- */
interface RedFlag {
  severity?: string;
  finding: string;
  sources?: string[];
}
interface GreenFlag {
  finding: string;
  sources?: string[];
}
interface CrossSourceFinding {
  finding: string;
  sources?: string[];
  explanation?: string;
}
interface Recommendation {
  priority: 'must_check' | 'should_check' | 'nice_to_check' | string;
  action: string;
  reason: string;
}

/* ---------- palette ---------- */
const COLORS = {
  primary: '#0F766E',
  text: '#111827',
  muted: '#6B7280',
  border: '#E5E7EB',
  bgMuted: '#F9FAFB',
  green: '#16A34A',
  yellow: '#CA8A04',
  red: '#DC2626',
  gray: '#9CA3AF',
  white: '#FFFFFF',
};

const riskColor = (level: string): string => {
  switch (level) {
    case 'green':
      return COLORS.green;
    case 'yellow':
      return COLORS.yellow;
    case 'red':
      return COLORS.red;
    default:
      return COLORS.gray;
  }
};

const riskLabel = (level: string): string => {
  switch (level) {
    case 'green':
      return 'Riesgo BAJO';
    case 'yellow':
      return 'Riesgo MEDIO';
    case 'red':
      return 'Riesgo ALTO';
    default:
      return 'Sin datos suficientes';
  }
};

const priorityLabel: Record<string, string> = {
  must_check: 'OBLIGATORIO',
  should_check: 'RECOMENDADO',
  nice_to_check: 'OPCIONAL',
};

const priorityColor: Record<string, string> = {
  must_check: COLORS.red,
  should_check: COLORS.yellow,
  nice_to_check: COLORS.gray,
};

const statusLabel: Record<string, string> = {
  success: 'EXITOSA',
  partial: 'PARCIAL',
  cached: 'CACHE',
  failed: 'FALLIDA',
  timeout: 'TIEMPO AGOTADO',
  skipped: 'OMITIDA',
  not_applicable: 'N/A',
};

const formatDateMX = (date: Date): string =>
  new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);

const styles = StyleSheet.create({
  page: {
    paddingTop: 36,
    paddingBottom: 56,
    paddingHorizontal: 40,
    fontSize: 10,
    color: COLORS.text,
    lineHeight: 1.4,
    fontFamily: 'Helvetica',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primary,
    paddingBottom: 10,
    marginBottom: 16,
  },
  logo: {
    fontSize: 20,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.primary,
  },
  headerSubtitle: {
    fontSize: 11,
    color: COLORS.text,
    marginTop: 2,
  },
  headerDate: {
    fontSize: 9,
    color: COLORS.muted,
    textAlign: 'right',
  },
  section: {
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 6,
    color: COLORS.text,
  },
  card: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 6,
    padding: 12,
  },
  vehicleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  vehicleTitle: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
  },
  vehicleMeta: {
    fontSize: 9,
    color: COLORS.muted,
    marginTop: 3,
  },
  riskBox: {
    borderWidth: 1,
    borderRadius: 6,
    padding: 10,
    minWidth: 120,
    alignItems: 'center',
  },
  riskLabel: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
  },
  riskScore: {
    fontSize: 32,
    fontFamily: 'Helvetica-Bold',
    marginTop: 2,
  },
  riskOutOf: {
    fontSize: 8,
    color: COLORS.muted,
  },
  riskConfidence: {
    fontSize: 8,
    marginTop: 4,
    color: COLORS.muted,
  },
  paragraph: {
    fontSize: 10,
  },
  listItem: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  bullet: {
    width: 12,
    fontFamily: 'Helvetica-Bold',
  },
  listBody: {
    flex: 1,
  },
  finding: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 10,
  },
  subtle: {
    fontSize: 8,
    color: COLORS.muted,
    marginTop: 2,
  },
  badge: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.white,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 3,
    textTransform: 'uppercase',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
    gap: 4,
  },
  table: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 6,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: COLORS.bgMuted,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  th: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  td: {
    fontSize: 9,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  colName: { flex: 3 },
  colStatus: { flex: 2 },
  colCountry: { flex: 1 },
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 40,
    right: 40,
    textAlign: 'center',
    fontSize: 7,
    color: COLORS.muted,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 6,
  },
});

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

export function ReportDocument({ report }: { report: ReportDetail }) {
  const generatedAt = formatDateMX(report.createdAt ?? new Date());
  const ai = report.ai;
  const level = report.riskLevel ?? 'unknown';
  const color = riskColor(level);

  const redFlags = asArray<RedFlag>(ai?.redFlags);
  const greenFlags = asArray<GreenFlag>(ai?.greenFlags);
  const crossFindings = asArray<CrossSourceFinding>(ai?.crossSourceFindings);
  const recommendations = asArray<Recommendation>(ai?.recommendations);
  const questions = asArray<string>(ai?.questionsForSeller);

  const baselineSummary = report.summary?.key_findings?.length
    ? report.summary.key_findings.join('\n')
    : 'No se generó un análisis de inteligencia artificial para este reporte. Revise las fuentes consultadas y los hallazgos listados más abajo.';

  const summaryText = ai?.executiveSummary ?? baselineSummary;
  const confidence =
    ai?.confidence != null && !Number.isNaN(parseFloat(ai.confidence))
      ? `${Math.round(parseFloat(ai.confidence))}%`
      : null;

  return (
    <Document
      title={`Reporte de Auditoría Vehicular ${report.vin ?? ''}`}
      author="CarCheck"
      language="es-MX"
    >
      <Page size="A4" style={styles.page} wrap>
        {/* Header */}
        <View style={styles.header} fixed>
          <View>
            <Text style={styles.logo}>CarCheck</Text>
            <Text style={styles.headerSubtitle}>Reporte de Auditoría Vehicular</Text>
          </View>
          <Text style={styles.headerDate}>Generado: {generatedAt}</Text>
        </View>

        {/* Vehicle + risk */}
        <View style={[styles.section, styles.card]}>
          <View style={styles.vehicleRow}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={styles.vehicleTitle}>
                {report.vehicle.make ?? '—'} {report.vehicle.model ?? ''}{' '}
                {report.vehicle.year ?? ''}
              </Text>
              {report.vehicle.body ? (
                <Text style={styles.vehicleMeta}>Carrocería: {report.vehicle.body}</Text>
              ) : null}
              {report.vin ? <Text style={styles.vehicleMeta}>VIN: {report.vin}</Text> : null}
              {report.plate ? (
                <Text style={styles.vehicleMeta}>
                  Placa: {report.plate}
                  {report.plateState ? ` (${report.plateState})` : ''}
                </Text>
              ) : null}
            </View>
            <View style={[styles.riskBox, { borderColor: color }]}>
              <Text style={[styles.riskLabel, { color }]}>{riskLabel(level)}</Text>
              <Text style={[styles.riskScore, { color }]}>{report.riskScore ?? '—'}</Text>
              <Text style={styles.riskOutOf}>/ 100</Text>
              {confidence ? (
                <Text style={styles.riskConfidence}>Confianza: {confidence}</Text>
              ) : null}
            </View>
          </View>
        </View>

        {/* Executive summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Resumen ejecutivo</Text>
          <View style={styles.card}>
            <Text style={styles.paragraph}>{summaryText}</Text>
          </View>
        </View>

        {/* Red flags */}
        {redFlags.length > 0 ? (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: COLORS.red }]}>
              Señales de alerta ({redFlags.length})
            </Text>
            <View style={styles.card}>
              {redFlags.map((f, i) => (
                <View key={i} style={styles.listItem}>
                  <Text style={[styles.bullet, { color: COLORS.red }]}>•</Text>
                  <View style={styles.listBody}>
                    <View style={styles.badgeRow}>
                      <Text style={styles.finding}>{f.finding}</Text>
                      {f.severity ? (
                        <Text style={[styles.badge, { backgroundColor: COLORS.red }]}>
                          {f.severity}
                        </Text>
                      ) : null}
                    </View>
                    {f.sources?.length ? (
                      <Text style={styles.subtle}>Fuentes: {f.sources.join(', ')}</Text>
                    ) : null}
                  </View>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {/* Green flags */}
        {greenFlags.length > 0 ? (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: COLORS.green }]}>
              Señales positivas ({greenFlags.length})
            </Text>
            <View style={styles.card}>
              {greenFlags.map((f, i) => (
                <View key={i} style={styles.listItem}>
                  <Text style={[styles.bullet, { color: COLORS.green }]}>•</Text>
                  <View style={styles.listBody}>
                    <Text style={styles.finding}>{f.finding}</Text>
                    {f.sources?.length ? (
                      <Text style={styles.subtle}>Fuentes: {f.sources.join(', ')}</Text>
                    ) : null}
                  </View>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {/* Cross-source findings */}
        {crossFindings.length > 0 ? (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: COLORS.primary }]}>
              Hallazgos cruzados entre fuentes ({crossFindings.length})
            </Text>
            <View style={styles.card}>
              {crossFindings.map((f, i) => (
                <View key={i} style={[styles.listItem, { flexDirection: 'column' }]}>
                  <Text style={styles.finding}>{f.finding}</Text>
                  {f.explanation ? (
                    <Text style={styles.paragraph}>{f.explanation}</Text>
                  ) : null}
                  {f.sources?.length ? (
                    <Text style={styles.subtle}>Cruce de: {f.sources.join(' + ')}</Text>
                  ) : null}
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {/* Recommendations */}
        {recommendations.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recomendaciones ({recommendations.length})</Text>
            <View style={styles.card}>
              {recommendations.map((r, i) => (
                <View key={i} style={styles.listItem}>
                  <Text
                    style={[
                      styles.badge,
                      {
                        backgroundColor: priorityColor[r.priority] ?? COLORS.gray,
                        marginRight: 6,
                      },
                    ]}
                  >
                    {priorityLabel[r.priority] ?? r.priority}
                  </Text>
                  <View style={styles.listBody}>
                    <Text style={styles.finding}>{r.action}</Text>
                    <Text style={styles.subtle}>{r.reason}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {/* Questions for seller */}
        {questions.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Preguntas para el vendedor ({questions.length})
            </Text>
            <View style={styles.card}>
              {questions.map((q, i) => (
                <View key={i} style={styles.listItem}>
                  <Text style={[styles.bullet, { color: COLORS.primary }]}>{i + 1}.</Text>
                  <Text style={styles.listBody}>{q}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {/* Sources table */}
        {report.sources.length > 0 ? (
          <View style={styles.section} wrap={false}>
            <Text style={styles.sectionTitle}>
              Fuentes consultadas ({report.sources.length})
            </Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.th, styles.colName]}>Fuente</Text>
                <Text style={[styles.th, styles.colStatus]}>Estado</Text>
                <Text style={[styles.th, styles.colCountry]}>País</Text>
              </View>
              {report.sources.map((s, i) => (
                <View key={i} style={styles.tableRow}>
                  <Text style={[styles.td, styles.colName]}>{s.name ?? s.sourceKey}</Text>
                  <Text style={[styles.td, styles.colStatus]}>
                    {s.cached ? 'CACHE' : (statusLabel[s.status] ?? s.status)}
                  </Text>
                  <Text style={[styles.td, styles.colCountry]}>
                    {(s.country ?? '—').toUpperCase()}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {/* Footer */}
        <Text style={styles.footer} fixed>
          Generado por CarCheck · carcheckmx.com · No expone datos del propietario (LFPDPPP)
        </Text>
      </Page>
    </Document>
  );
}
