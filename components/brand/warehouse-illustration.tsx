/** Flat illustration of the warehouse and the site machines, same universe as the home page 3D scene. */
export function WarehouseIllustration({ className }: { className?: string }) {
  const pallets: [number, number, string][] = [
    [112, 158, "#2563eb"], [140, 158, "#f97316"], [168, 158, "#16a34a"],
    [112, 130, "#eab308"], [140, 130, "#2563eb"], [168, 130, "#f97316"],
  ];
  return (
    <svg viewBox="0 0 480 320" preserveAspectRatio="xMidYMax slice" className={className} role="img" aria-label="Un entrepôt avec un chariot élévateur, une grue et une pelle">
      <defs>
        <linearGradient id="wi-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7dd3fc" />
          <stop offset="1" stopColor="#fef3c7" />
        </linearGradient>
      </defs>
      <rect width="480" height="320" fill="url(#wi-sky)" />
      {/* clouds */}
      <g fill="#fff" opacity=".9">
        <rect x="40" y="36" width="64" height="16" rx="8" />
        <rect x="58" y="26" width="36" height="16" rx="8" />
        <rect x="330" y="52" width="80" height="16" rx="8" />
        <rect x="350" y="42" width="40" height="16" rx="8" />
      </g>
      {/* ground */}
      <rect y="228" width="480" height="92" fill="#84b56a" />
      <rect y="244" width="480" height="76" fill="#d6c7a1" />
      <rect y="292" width="480" height="28" fill="#475569" />
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <rect key={i} x={12 + i * 72} y="304" width="36" height="4" rx="2" fill="#fef08a" />
      ))}
      {/* tower crane */}
      <g>
        <rect x="408" y="70" width="10" height="174" fill="#d97706" />
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <rect key={i} x="408" y={78 + i * 24} width="10" height="12" fill="#fbbf24" />
        ))}
        <rect x="316" y="62" width="150" height="9" fill="#d97706" />
        <rect x="446" y="52" width="30" height="20" fill="#9ca3af" />
        <rect x="340" y="71" width="2" height="62" fill="#1f2937" />
        <rect x="330" y="133" width="22" height="14" fill="#facc15" />
      </g>
      {/* warehouse */}
      <g>
        <rect x="84" y="86" width="244" height="150" fill="#e5e7eb" />
        <rect x="76" y="68" width="260" height="22" fill="#1e3a8a" />
        <rect x="76" y="90" width="260" height="6" fill="#facc15" />
        <rect x="132" y="102" width="148" height="20" rx="3" fill="#facc15" />
        <text x="206" y="117" textAnchor="middle" fontFamily="var(--font-barlow-condensed), system-ui" fontWeight="700" fontSize="16" fill="#172554">
          CERTIPILOT
        </text>
        <rect x="104" y="128" width="204" height="108" fill="#cbd5e1" />
        <rect x="104" y="128" width="204" height="108" fill="#94a3b8" opacity=".35" />
        {/* racks */}
        <rect x="108" y="124" width="4" height="108" fill="#475569" />
        <rect x="196" y="124" width="4" height="108" fill="#475569" />
        {[0, 1, 2].map((i) => (
          <rect key={i} x="108" y={152 + i * 28} width="92" height="3" fill="#475569" />
        ))}
        {pallets.map(([x, y, c], i) => (
          <rect key={i} x={x - 24} y={y - 14} width="24" height="22" fill={c} />
        ))}
        <rect x="88" y="190" width="14" height="46" fill="#94a3b8" />
        <rect x="310" y="190" width="14" height="46" fill="#94a3b8" />
        {/* flag */}
        <rect x="318" y="30" width="3" height="40" fill="#e5e7eb" />
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <rect key={i} x={321 + i * 6} y={30 + (i % 2) * 2} width="6" height="12" fill={i % 2 ? "#facc15" : "#1e3a8a"} />
        ))}
      </g>
      {/* forklift */}
      <g transform="translate(210 188)">
        <rect x="14" y="14" width="42" height="26" fill="#ca8a04" />
        <rect x="46" y="2" width="4" height="40" fill="#374151" />
        <rect x="52" y="30" width="26" height="4" fill="#9ca3af" />
        <rect x="56" y="14" width="18" height="16" fill="#38bdf8" />
        <rect x="14" y="0" width="30" height="4" fill="#111827" />
        <rect x="16" y="2" width="3" height="14" fill="#111827" />
        <rect x="38" y="2" width="3" height="14" fill="#111827" />
        <circle cx="26" cy="44" r="10" fill="#1f2937" />
        <circle cx="52" cy="44" r="8" fill="#1f2937" />
      </g>
      {/* excavator */}
      <g transform="translate(18 188)">
        <rect x="6" y="40" width="64" height="12" rx="6" fill="#1f2937" />
        <rect x="14" y="22" width="46" height="18" fill="#facc15" />
        <rect x="14" y="6" width="22" height="18" fill="#facc15" />
        <rect x="18" y="10" width="14" height="10" fill="#7dd3fc" />
        <rect x="58" y="18" width="50" height="8" fill="#facc15" transform="rotate(-28 58 22)" />
        <rect x="100" y="-6" width="34" height="6" fill="#facc15" transform="rotate(40 100 -3)" />
        <rect x="122" y="14" width="14" height="14" fill="#111827" />
      </g>
      {/* workers + cones */}
      {[352, 372].map((x, i) => (
        <g key={x} transform={`translate(${x} ${i ? 204 : 200})`}>
          <rect x="0" y="12" width="6" height="14" fill="#1e3a8a" />
          <rect x="8" y="12" width="6" height="14" fill="#1e3a8a" />
          <rect x="-1" y="0" width="16" height="14" fill={i ? "#facc15" : "#f97316"} />
          <rect x="2" y="-9" width="10" height="9" fill="#f2c9a0" />
          <rect x="1" y="-13" width="12" height="5" fill="#facc15" />
        </g>
      ))}
      {[40, 66, 92, 118, 144].map((x) => (
        <polygon key={x} points={`${x},262 ${x + 7},262 ${x + 3.5},248`} fill="#f97316" />
      ))}
    </svg>
  );
}
