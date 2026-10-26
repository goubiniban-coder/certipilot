import { familyStyle } from "@/lib/families";

export function FamilyPicto({ code, size = 48 }: { code: string; size?: number }) {
  const f = familyStyle(code);
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-xl"
      style={{ width: size, height: size, backgroundColor: f.color, color: f.ink }}
      title={`${code} · ${f.label}`}
    >
      <svg
        width={size * 0.72}
        height={size * 0.72}
        viewBox="0 0 48 48"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d={f.picto} />
      </svg>
    </span>
  );
}
