import { Document, Font, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { pdfText } from "@/lib/certificates/document";
import { APP_NAME } from "@/lib/constants";
import { billingTotals, type BillingLine } from "./totals";

export interface BillingPdfData {
  kind: "quote" | "invoice";
  number: string;
  title: string;
  issuedOn: string;
  dueOn: string | null;
  vatRate: number;
  lines: BillingLine[];
  notes: string | null;
  issuer: { name: string; siret: string; address: string | null; vatNumber: string | null };
  client: { name: string; siret: string | null } | null;
}

Font.registerHyphenationCallback((word) => [word]);

const INK = "#0b1f3a";
const ACCENT = "#1e3a8a";
const styles = StyleSheet.create({
  page: { padding: 44, fontSize: 10, color: INK, fontFamily: "Helvetica", lineHeight: 1.4 },
  band: { height: 6, backgroundColor: "#facc15", marginBottom: 18 },
  top: { flexDirection: "row", justifyContent: "space-between" },
  org: { fontSize: 13, fontFamily: "Helvetica-Bold" },
  muted: { color: "#4a5568", fontSize: 9 },
  title: { fontSize: 22, fontFamily: "Helvetica-Bold", color: ACCENT, textAlign: "right" },
  right: { textAlign: "right" },
  client: { marginTop: 24, padding: 10, borderWidth: 1, borderColor: "#cbd5e0", width: "55%" },
  subject: { marginTop: 20, fontSize: 12, fontFamily: "Helvetica-Bold" },
  head: { flexDirection: "row", marginTop: 16, paddingVertical: 5, backgroundColor: ACCENT, color: "#ffffff", fontFamily: "Helvetica-Bold" },
  row: { flexDirection: "row", paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: "#e2e8f0" },
  cLabel: { width: "52%", paddingLeft: 6 },
  cQty: { width: "12%", textAlign: "right" },
  cUnit: { width: "18%", textAlign: "right" },
  cTotal: { width: "18%", textAlign: "right", paddingRight: 6 },
  totals: { marginTop: 14, marginLeft: "auto", width: "42%" },
  tRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 },
  tBold: { fontFamily: "Helvetica-Bold", fontSize: 12, borderTopWidth: 1, borderTopColor: INK, marginTop: 4, paddingTop: 4 },
  notes: { marginTop: 22 },
  legal: { marginTop: "auto", fontSize: 8, color: "#4a5568" },
});

function frDate(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}
const euros = (cents: number) =>
  `${(cents / 100).toFixed(2).replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, " ")} EUR`;

export function BillingDocument({ data }: { data: BillingPdfData }) {
  const t = billingTotals(data.lines, data.vatRate);
  const isInvoice = data.kind === "invoice";
  return (
    <Document title={`${isInvoice ? "Facture" : "Devis"} ${data.number}`} author={pdfText(data.issuer.name)} creator={APP_NAME} language="fr">
      <Page size="A4" style={styles.page}>
        <View style={styles.band} />
        <View style={styles.top}>
          <View>
            <Text style={styles.org}>{pdfText(data.issuer.name)}</Text>
            {data.issuer.address ? <Text style={styles.muted}>{pdfText(data.issuer.address)}</Text> : null}
            <Text style={styles.muted}>SIRET {data.issuer.siret}</Text>
            {data.issuer.vatNumber ? <Text style={styles.muted}>TVA {data.issuer.vatNumber}</Text> : null}
          </View>
          <View>
            <Text style={styles.title}>{isInvoice ? "FACTURE" : "DEVIS"}</Text>
            <Text style={styles.right}>N° {data.number}</Text>
            <Text style={styles.right}>Date : {frDate(data.issuedOn)}</Text>
            {data.dueOn ? (
              <Text style={styles.right}>{isInvoice ? "Échéance" : "Valable jusqu'au"} : {frDate(data.dueOn)}</Text>
            ) : null}
          </View>
        </View>

        {data.client ? (
          <View style={styles.client}>
            <Text style={styles.muted}>{isInvoice ? "Facturé à" : "Destinataire"}</Text>
            <Text style={{ fontFamily: "Helvetica-Bold" }}>{pdfText(data.client.name)}</Text>
            {data.client.siret ? <Text style={styles.muted}>SIRET {data.client.siret}</Text> : null}
          </View>
        ) : null}

        <Text style={styles.subject}>{pdfText(data.title)}</Text>

        <View style={styles.head}>
          <Text style={styles.cLabel}>Désignation</Text>
          <Text style={styles.cQty}>Qté</Text>
          <Text style={styles.cUnit}>PU HT</Text>
          <Text style={styles.cTotal}>Total HT</Text>
        </View>
        {data.lines.map((l, i) => (
          <View key={i} style={styles.row} wrap={false}>
            <Text style={styles.cLabel}>{pdfText(l.label)}</Text>
            <Text style={styles.cQty}>{String(l.quantity).replace(".", ",")}</Text>
            <Text style={styles.cUnit}>{euros(l.unit_price_cents)}</Text>
            <Text style={styles.cTotal}>{euros(Math.round(l.quantity * l.unit_price_cents))}</Text>
          </View>
        ))}

        <View style={styles.totals}>
          <View style={styles.tRow}><Text>Total HT</Text><Text>{euros(t.htCents)}</Text></View>
          <View style={styles.tRow}><Text>TVA {String(data.vatRate).replace(".", ",")} %</Text><Text>{euros(t.vatCents)}</Text></View>
          <View style={[styles.tRow, styles.tBold]}><Text>Total TTC</Text><Text>{euros(t.ttcCents)}</Text></View>
        </View>

        {data.notes ? <Text style={styles.notes}>{pdfText(data.notes)}</Text> : null}

        <Text style={styles.legal}>
          {isInvoice
            ? "En cas de retard de paiement, une pénalité égale à trois fois le taux d'intérêt légal sera appliquée, ainsi qu'une indemnité forfaitaire de 40 EUR pour frais de recouvrement. Pas d'escompte pour paiement anticipé."
            : "Devis valable pour la durée indiquée. Pour l'accepter, retournez-le daté et signé avec la mention « Bon pour accord »."}
        </Text>
      </Page>
    </Document>
  );
}
