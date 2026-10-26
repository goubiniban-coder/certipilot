/**
 * One colour and one pictogram per CACES® recommendation family, as on the
 * posters of the trade. Pictograms are provisional (48x48 viewBox, stroked).
 */
export interface FamilyStyle {
  label: string;
  color: string;
  ink: string;
  picto: string;
}

const FAMILIES: Record<string, FamilyStyle> = {
  "R.482": {
    label: "Engins de chantier",
    color: "#EAB308",
    ink: "#1C1917",
    picto: "M8 34h22a4 4 0 0 1 0 8H8a4 4 0 0 1 0-8zM10 34V22h12v12M22 26l10-14 10 7M42 19l1 7h-6l5-7",
  },
  "R.483": {
    label: "Grues mobiles",
    color: "#15803D",
    ink: "#FFFFFF",
    picto: "M4 34h30v6H4zM34 30h8l2 4v6H34zM10 34L36 8M36 8v14M34 22h4",
  },
  "R.484": {
    label: "Ponts roulants et portiques",
    color: "#EA580C",
    ink: "#1C1917",
    picto: "M4 10h40M8 10v32M40 10v32M20 10v4h8v-4M24 14v14M20 28h8l-1 6h-6z",
  },
  "R.485": {
    label: "Gerbeurs à conducteur accompagnant",
    color: "#B91C1C",
    ink: "#FFFFFF",
    picto: "M32 6v34M32 40h12M12 24h20v16H12zM12 24L5 13M8 40a3 3 0 1 0 6 0a3 3 0 1 0-6 0",
  },
  "R.486": {
    label: "Plates-formes élévatrices (PEMP)",
    color: "#7C3AED",
    ink: "#FFFFFF",
    picto:
      "M6 8h30v6H6zM10 14l22 8M32 14l-22 8M10 22l22 8M32 22l-22 8M6 30h30v6H6zM10 40a2.5 2.5 0 1 0 5 0a2.5 2.5 0 1 0-5 0M28 40a2.5 2.5 0 1 0 5 0a2.5 2.5 0 1 0-5 0",
  },
  "R.487": {
    label: "Grues à tour",
    color: "#D97706",
    ink: "#1C1917",
    picto: "M16 44V8M8 44h16M6 10h38M16 8l-6 2M16 4v4M38 10v16M35 26h6M38 26v4",
  },
  "R.489": {
    label: "Chariots automoteurs",
    color: "#CA8A04",
    ink: "#1C1917",
    picto:
      "M34 6v34M34 40h10M6 40V26h16l6 6v8M12 26V14h9l3 12M9 40a4 4 0 1 0 8 0a4 4 0 1 0-8 0M23 40a4 4 0 1 0 8 0a4 4 0 1 0-8 0",
  },
  "R.490": {
    label: "Grues de chargement",
    color: "#1D4ED8",
    ink: "#FFFFFF",
    picto:
      "M4 32h40v6H4zM30 32V20M30 20l10-8M40 12v12M38 24h4M8 32V24h12v8M8 42a3 3 0 1 0 6 0a3 3 0 1 0-6 0M32 42a3 3 0 1 0 6 0a3 3 0 1 0-6 0",
  },
};

const FALLBACK: FamilyStyle = {
  label: "Autre",
  color: "#64748B",
  ink: "#FFFFFF",
  picto: "M6 40h36M10 40V16h28v24M18 16V8h12v8",
};

export function familyStyle(code: string): FamilyStyle {
  return FAMILIES[code] ?? FALLBACK;
}
