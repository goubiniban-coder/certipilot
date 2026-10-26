export function Logo({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" role="img" aria-label="Logo Certipilot">
      <rect width="40" height="40" rx="9" fill="#FACC15" />
      <path d="M27 13.5a9 9 0 1 0 0 13" fill="none" stroke="#172554" strokeWidth="4.5" strokeLinecap="round" />
      <path d="M19 20.5l3 3 6.5-7" fill="none" stroke="#172554" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
