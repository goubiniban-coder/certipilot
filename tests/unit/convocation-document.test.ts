import { renderToBuffer } from "@react-pdf/renderer";
import { describe, expect, it } from "vitest";
import { ConvocationDocument } from "@/lib/convocations/document";

describe("ConvocationDocument", () => {
  it("renders one PDF with a page per candidate", async () => {
    const pdf = await renderToBuffer(
      ConvocationDocument({
        data: {
          organizationName: "Centre Démo",
          organizationSiret: "12345678901234",
          sessionName: "Session chariots",
          startsOn: "2026-11-10",
          endsOn: "2026-11-12",
          location: "Lyon",
          candidates: [
            { firstName: "Jeanne", lastName: "Martin", company: "BTP Sud", tests: ["R.489 cat. 3"] },
            { firstName: "Karim", lastName: "Benali", company: null, tests: [] },
          ],
        },
      }),
    );
    expect(pdf.subarray(0, 4).toString()).toBe("%PDF");
    expect(pdf.toString("latin1").match(/\/Type \/Page\b/g)?.length).toBe(2);
  });
});
