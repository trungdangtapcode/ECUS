const containers = [
  { x: 129, y: 131, color: 'var(--secondary)' },
  { x: 207, y: 131, color: '#f0c677' },
  { x: 285, y: 131, color: '#82c9c0' },
  { x: 168, y: 87, color: '#d6ece1' },
  { x: 246, y: 87, color: 'var(--secondary)' },
];

/** Decorative vector illustration; not a shipment map or live status display. */
export function CargoArtwork() {
  return (
    <svg className="cargo-artwork" viewBox="0 0 480 280" fill="none" aria-hidden="true">
      <g className="cargo-harbor" stroke="currentColor" strokeWidth="1.3" opacity="0.2">
        <path d="M56 172V37H177M77 172V57H163M42 172H110M160 37V105M176 37V111M56 37L77 57L155 37M67 90H83M67 112H83M67 135H83" />
        <path d="M348 169V60H429M363 170V77H420M413 60V127M426 60V135M348 60L363 77L412 60" />
        <path d="M21 207H452M59 225H159M328 225H435M184 244H335" />
      </g>
      <ellipse cx="249" cy="216" rx="168" ry="20" fill="currentColor" opacity="0.07" />
      <g className="cargo-ship">
        <path
          d="M91 177L356 177L408 158L379 198Q373 208 358 208H136Q117 208 105 194Z"
          fill="#122f3c"
        />
        <path d="M100 186H397L386 196H112Z" fill="var(--secondary)" />
        <path d="M91 177L116 164H349L408 158L356 177Z" fill="#517b83" />
        <path d="M102 128H127V171H102Z" fill="#fff4df" />
        <path d="M97 124H132V133H97Z" fill="#fffaf2" />
        <path d="M106 137H113V144H106ZM118 137H125V144H118Z" fill="#325463" />
        <path d="M111 124V104M105 111H117" stroke="#fffaf2" strokeWidth="3" />
        {containers.map(({ x, y, color }) => (
          <g key={`${x}-${y}`}>
            <path d={`M${x} ${y}h72v39h-72Z`} fill={color} />
            <path d={`M${x} ${y}l12 -9h72l-12 9Z`} fill={color} />
            <path d={`M${x + 72} ${y}l12 -9v39l-12 9Z`} fill={color} />
            <path d={`M${x + 72} ${y}l12 -9v39l-12 9Z`} fill="#122f3c" opacity="0.18" />
            {[12, 24, 36, 48, 60].map((offset) => (
              <path
                key={offset}
                d={`M${x + offset} ${y + 5}v29`}
                stroke="#122f3c"
                strokeOpacity="0.18"
                strokeWidth="2"
              />
            ))}
          </g>
        ))}
        <circle cx="347" cy="187" r="3" fill="#fff4df" />
        <circle cx="359" cy="185" r="3" fill="#fff4df" />
      </g>
      <g stroke="currentColor" opacity="0.45" strokeLinecap="round">
        <path d="M60 216H107M361 222H410M136 230H195M254 222H311" />
        <path d="M354 95Q422 56 439 110Q451 160 416 187" strokeDasharray="4 6" />
      </g>
      <circle cx="354" cy="95" r="4" fill="var(--secondary)" />
      <circle cx="416" cy="187" r="4" fill="#82c9c0" />
    </svg>
  );
}
