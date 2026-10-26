import { Document, Font, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { APP_NAME } from "@/lib/constants";
import { pdfText } from "@/lib/certificates/document";

export interface ConvocationData {
  organizationName: string;
  organizationSiret: string;
  sessionName: string;
  startsOn: string;
  endsOn: string;
  location: string;
  candidates: { firstName: string; lastName: string; company: string | null; tests: string[] }[];
}

Font.registerHyphenationCallback((word) => [word]);

const INK = "#0b1f3a";
const ACCENT = "#1e3a8a";

const styles = StyleSheet.create({
  page: { padding: 48, fontSize: 11, color: INK, fontFamily: "Helvetica", lineHeight: 1.4 },
  band: { height: 8, backgroundColor: "#facc15", marginBottom: 20 },
  org: { fontSize: 13, fontFamily: "Helvetica-Bold" },
  muted: { color: "#4a5568", fontSize: 9 },
  title: { fontSize: 24, fontFamily: "Helvetica-Bold", color: ACCENT, marginTop: 28 },
  to: { marginTop: 18, fontSize: 13 },
  box: { marginTop: 22, padding: 14, borderWidth: 2, borderColor: ACCENT },
  label: { fontSize: 9, color: "#4a5568", textTransform: "uppercase", marginTop: 8 },
  value: { fontSize: 13, fontFamily: "Helvetica-Bold" },
  h2: { fontSize: 12, fontFamily: "Helvetica-Bold", marginTop: 22, marginBottom: 6 },
  li: { marginBottom: 3 },
  small: { fontSize: 8, color: "#4a5568", marginTop: "auto" },
});

function frDate(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

/** One convocation page per candidate of the session. */
export function ConvocationDocument({ data }: { data: ConvocationData }) {
  const when =
    data.startsOn === data.endsOn ? `Le ${frDate(data.startsOn)}` : `Du ${frDate(data.startsOn)} au ${frDate(data.endsOn)}`;
  return (
    <Document title={`Convocations ${pdfText(data.sessionName)}`} author={pdfText(data.organizationName)} creator={APP_NAME} language="fr">
      {data.candidates.map((c, i) => (
        <Page key={i} size="A4" style={styles.page}>
          <View style={styles.band} />
          <Text style={styles.org}>{pdfText(data.organizationName)}</Text>
          <Text style={styles.muted}>Organisme testeur certifié · SIRET {data.organizationSiret}</Text>

          <Text style={styles.title}>CONVOCATION</Text>
          <Text style={styles.to}>
            {pdfText(c.firstName)} {pdfText(c.lastName.toUpperCase())}
            {c.company ? ` · ${pdfText(c.company)}` : ""}
          </Text>

          <View style={styles.box}>
            <Text style={styles.label}>Session</Text>
            <Text style={styles.value}>{pdfText(data.sessionName)}</Text>
            <Text style={styles.label}>Date</Text>
            <Text style={styles.value}>{when}</Text>
            <Text style={styles.label}>Lieu</Text>
            <Text style={styles.value}>{pdfText(data.location)}</Text>
            {c.tests.length ? (
              <>
                <Text style={styles.label}>Épreuves</Text>
                <Text style={styles.value}>{pdfText(c.tests.join(" · "))}</Text>
              </>
            ) : null}
          </View>

          <Text style={styles.h2}>À apporter le jour du test</Text>
          <Text style={styles.li}>• Une pièce d&apos;identité en cours de validité (obligatoire, vérifiée avant toute épreuve).</Text>
          <Text style={styles.li}>• Vos chaussures de sécurité et vos équipements de protection individuelle.</Text>
          <Text style={styles.li}>• Votre ancien CACES® s&apos;il s&apos;agit d&apos;un renouvellement.</Text>
          <Text style={styles.li}>• Votre convocation (cette page).</Text>

          <Text style={styles.h2}>Bon à savoir</Text>
          <Text style={styles.li}>Merci d&apos;arriver 15 minutes avant l&apos;heure de début. En cas d&apos;empêchement, prévenez-nous au plus vite.</Text>

          <Text style={styles.small}>Document généré par {APP_NAME}.</Text>
        </Page>
      ))}
    </Document>
  );
}
