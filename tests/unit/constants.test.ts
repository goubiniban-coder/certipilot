import { describe, expect, it } from "vitest";
import { APP_NAME } from "@/lib/constants";

describe("APP_NAME", () => {
  it("ne contient jamais la marque CACES", () => {
    expect(APP_NAME.toUpperCase()).not.toContain("CACES");
  });
});
