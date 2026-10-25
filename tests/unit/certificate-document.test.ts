import { writeFileSync } from "node:fs";
import { renderToBuffer } from "@react-pdf/renderer";
import QRCode from "qrcode";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { CertificateDocument, pdfText, type CertificatePdfData } from "@/lib/certificates/document";

async function data(photo: boolean): Promise<CertificatePdfData> {
  const jpeg = await sharp({ create: { width: 220, height: 280, channels: 3, background: "#7a9cc6" } }).jpeg().toBuffer();
  const url = "http://localhost:3000/verifier/abcdefghijklmnopqrstuvwx";
  return {
    organizationName: "Centre de test Démo",
    organizationSiret: "12345678900012",
    number: "DEMO-2026-000042",
    holderLastName: "Martin",
    holderFirstName: "Lucas",
    holderBirthDate: "1995-04-12",
    photo: photo ? `data:image/jpeg;base64,${jpeg.toString("base64")}` : null,
    recommendationCode: "R.489",
    recommendationLabel: "Chariots de manutention automoteurs à conducteur porté",
    categories: [
      { code: "1A", label: "Transpalettes à conducteur porté (levée ≤ 1,20 m)" },
      { code: "3", label: "Chariots élévateurs en porte-à-faux (capacité ≤ 6 t)" },
    ],
    issuedOn: "2026-10-25",
    expiresOn: "2031-10-25",
    verificationUrl: url,
    qrCode: await QRCode.toDataURL(url),
  };
}

describe("certificate PDF", () => {
  it("renders a one-page PDF, with or without photo", async () => {
    for (const photo of [true, false]) {
      const pdf = await renderToBuffer(CertificateDocument({ data: await data(photo) }));
      expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
      // CERTIFICATE_PDF_OUT=/tmp/x.pdf keeps the PDF with photo to look at it.
      if (photo && process.env.CERTIFICATE_PDF_OUT) writeFileSync(process.env.CERTIFICATE_PDF_OUT, pdf);
      expect(pdf.toString("latin1").match(/\/Type \/Page\b/g)).toHaveLength(1);
    }
  });

  it("spells out symbols the PDF fonts cannot draw", () => {
    expect(pdfText("capacité ≤ 6 t, ≥ 2 m, l’engin")).toBe("capacité jusqu'à 6 t, à partir de 2 m, l'engin");
  });
});
