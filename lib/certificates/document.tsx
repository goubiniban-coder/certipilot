import { Document, Font, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { APP_NAME } from "@/lib/constants";

export interface CertificatePdfData {
  organizationName: string;
  organizationSiret: string;
  number: string;
  holderLastName: string;
  holderFirstName: string;
  holderBirthDate: string;
  /** JPEG data URI, or null when the candidate has no photo. */
  photo: string | null;
  recommendationCode: string;
  recommendationLabel: string;
  categories: { code: string; label: string }[];
  issuedOn: string;
  expiresOn: string;
  verificationUrl: string;
  /** PNG data URI of the QR code pointing to verificationUrl. */
  qrCode: string;
}

// Words are never cut with a hyphen on a certificate.
Font.registerHyphenationCallback((word) => [word]);

/** The built-in PDF fonts only cover Latin-1: spell out the few symbols used in labels. */
export function pdfText(value: string): string {
  return value
    .replace(/≤\s*/g, "jusqu'à ")
    .replace(/≥\s*/g, "à partir de ")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"');
}

const INK = "#0b1f3a";
const ACCENT = "#0b3d91";

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 11, color: INK, fontFamily: "Helvetica" },
  frame: { borderWidth: 3, borderColor: ACCENT, padding: 28, flexGrow: 1 },
  header: { flexDirection: "row", justifyContent: "space-between", marginBottom: 24 },
  org: { fontSize: 13, fontFamily: "Helvetica-Bold" },
  muted: { color: "#4a5568" },
  title: { fontSize: 24, fontFamily: "Helvetica-Bold", color: ACCENT, textAlign: "center" },
  subtitle: { fontSize: 14, textAlign: "center", marginTop: 6 },
  number: { fontSize: 12, textAlign: "center", marginTop: 10, fontFamily: "Helvetica-Bold" },
  holder: { flexDirection: "row", marginTop: 28, gap: 20, alignItems: "center" },
  photo: { width: 110, height: 140, objectFit: "cover", borderWidth: 1, borderColor: "#cbd5e0" },
  noPhoto: { width: 110, height: 140, borderWidth: 1, borderColor: "#cbd5e0", justifyContent: "center", alignItems: "center" },
  label: { fontSize: 9, color: "#4a5568", textTransform: "uppercase", marginTop: 8 },
  value: { fontSize: 15, fontFamily: "Helvetica-Bold" },
  section: { marginTop: 28 },
  sectionTitle: { fontSize: 12, fontFamily: "Helvetica-Bold", marginBottom: 8 },
  row: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#cbd5e0", paddingVertical: 6 },
  code: { width: 80, fontFamily: "Helvetica-Bold" },
  dates: { flexDirection: "row", gap: 40, marginTop: 24 },
  footer: { flexDirection: "row", marginTop: "auto", alignItems: "center", gap: 16 },
  qr: { width: 90, height: 90 },
  small: { fontSize: 8, color: "#4a5568" },
});

function frDate(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

/** The certificate shows only the categories obtained. */
export function CertificateDocument({ data }: { data: CertificatePdfData }) {
  return (
    <Document title={`Certificat ${data.number}`} author={pdfText(data.organizationName)} creator={APP_NAME} language="fr">
      <Page size="A4" style={styles.page}>
        <View style={styles.frame}>
          <View style={styles.header}>
            <View>
              <Text style={styles.org}>{pdfText(data.organizationName)}</Text>
              <Text style={styles.muted}>Organisme testeur certifié · SIRET {data.organizationSiret}</Text>
            </View>
          </View>

          <Text style={styles.title}>CERTIFICAT CACES®</Text>
          <Text style={styles.subtitle}>
            Recommandation {data.recommendationCode} · {pdfText(data.recommendationLabel)}
          </Text>
          <Text style={styles.number}>N° {data.number}</Text>

          <View style={styles.holder}>
            {data.photo ? (
              // eslint-disable-next-line jsx-a11y/alt-text
              <Image src={data.photo} style={styles.photo} />
            ) : (
              <View style={styles.noPhoto}>
                <Text style={styles.small}>Photo absente</Text>
              </View>
            )}
            <View>
              <Text style={styles.label}>Nom</Text>
              <Text style={styles.value}>{pdfText(data.holderLastName.toUpperCase())}</Text>
              <Text style={styles.label}>Prénom</Text>
              <Text style={styles.value}>{pdfText(data.holderFirstName)}</Text>
              <Text style={styles.label}>Date de naissance</Text>
              <Text style={styles.value}>{frDate(data.holderBirthDate)}</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Catégories obtenues</Text>
            {data.categories.map((category) => (
              <View key={category.code} style={styles.row}>
                <Text style={styles.code}>Cat. {category.code}</Text>
                <Text>{pdfText(category.label)}</Text>
              </View>
            ))}
          </View>

          <View style={styles.dates}>
            <View>
              <Text style={styles.label}>Délivré le</Text>
              <Text style={styles.value}>{frDate(data.issuedOn)}</Text>
            </View>
            <View>
              <Text style={styles.label}>Valable jusqu&apos;au</Text>
              <Text style={styles.value}>{frDate(data.expiresOn)}</Text>
            </View>
          </View>

          <View style={styles.footer}>
            {/* eslint-disable-next-line jsx-a11y/alt-text */}
            <Image src={data.qrCode} style={styles.qr} />
            <View style={{ flexShrink: 1 }}>
              <Text style={{ fontFamily: "Helvetica-Bold" }}>Vérifier ce certificat</Text>
              <Text style={styles.small}>Scannez le QR code ou ouvrez :</Text>
              <Text style={styles.small}>{data.verificationUrl}</Text>
              <Text style={[styles.small, { marginTop: 8 }]}>
                Ce certificat ne mentionne que les catégories obtenues. Document généré avec {APP_NAME}.
              </Text>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
}
