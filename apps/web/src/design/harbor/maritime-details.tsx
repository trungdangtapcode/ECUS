/** Decorative maritime artwork. No paths or marks represent live shipment data. */
export function CompassRose({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`compass-rose ${className}`}
      viewBox="0 0 160 160"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="80" cy="80" r="64" stroke="currentColor" strokeOpacity=".25" />
      <circle
        cx="80"
        cy="80"
        r="53"
        stroke="currentColor"
        strokeOpacity=".35"
        strokeDasharray="1 7"
      />
      <path
        d="M80 6V27M80 133V154M6 80H27M133 80H154M28 28L40 40M120 120L132 132M28 132L40 120M120 40L132 28"
        stroke="currentColor"
      />
      <path
        d="M80 27L90 70L133 80L90 90L80 133L70 90L27 80L70 70Z"
        fill="currentColor"
        fillOpacity=".08"
        stroke="currentColor"
        strokeOpacity=".5"
      />
      <path
        d="M80 27L80 80L70 70ZM133 80L80 80L90 70ZM80 133L80 80L90 90ZM27 80L80 80L70 90Z"
        fill="currentColor"
        fillOpacity=".4"
      />
      <circle cx="80" cy="80" r="5" fill="var(--secondary)" />
    </svg>
  );
}

export function RouteOrbits({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`route-orbits ${className}`}
      viewBox="0 0 600 360"
      fill="none"
      aria-hidden="true"
    >
      <g stroke="currentColor" strokeOpacity=".2">
        <ellipse cx="330" cy="180" rx="220" ry="118" transform="rotate(-22 330 180)" />
        <ellipse cx="330" cy="180" rx="250" ry="142" transform="rotate(-22 330 180)" />
        <path
          d="M48 294C114 124 273 305 539 47M137 24C198 193 395 90 552 283"
          strokeDasharray="3 7"
        />
        <path
          d="M28 183H42M35 176V190M529 93H543M536 86V100M487 299H501M494 292V306"
          strokeOpacity=".7"
        />
      </g>
      <path
        className="orbit-trace"
        d="M97 263C206 340 493 226 532 83"
        stroke="currentColor"
        strokeOpacity=".7"
        strokeDasharray="5 11"
      />
      <circle cx="97" cy="263" r="5" fill="var(--secondary)" />
      <circle className="orbit-beacon" cx="532" cy="83" r="6" fill="var(--secondary)" />
      <circle cx="532" cy="83" r="14" stroke="var(--secondary)" strokeOpacity=".4" />
    </svg>
  );
}
