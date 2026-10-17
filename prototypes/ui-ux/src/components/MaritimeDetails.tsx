import { useId } from 'react';
import { visualCopy } from '../lib/copy';

/** Decorative maritime artwork. No paths or marks represent live shipment data. */
export function CompassRose({ className = '' }: { className?: string }) {
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

export function RouteOrbits({ className = '' }: { className?: string }) {
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

export function DocumentSculpture() {
  const id = useId().replaceAll(':', '');
  return (
    <svg className="document-sculpture" viewBox="0 0 400 330" fill="none" aria-hidden="true">
      <defs>
        <linearGradient
          id={`${id}-paper`}
          x1="95"
          y1="50"
          x2="310"
          y2="290"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#fff" />
          <stop offset="1" stopColor="#dcdcff" />
        </linearGradient>
        <linearGradient id={`${id}-glass`} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#c9baff" stopOpacity=".58" />
          <stop offset="1" stopColor="#8070f1" stopOpacity=".05" />
        </linearGradient>
        <filter id={`${id}-shadow`} x="-50%" y="-50%" width="200%" height="220%">
          <feDropShadow dx="0" dy="16" stdDeviation="12" floodColor="#08082c" floodOpacity=".3" />
        </filter>
      </defs>
      <g className="sculpture-back" transform="rotate(15 237 158)">
        <rect
          x="169"
          y="48"
          width="166"
          height="216"
          rx="7"
          fill={`url(#${id}-glass)`}
          stroke="#cfbcff"
          strokeOpacity=".55"
        />
        <path
          d="M190 85H258M190 98H294M190 145H311M190 165H311M190 185H311M190 205H282"
          stroke="#d5ccff"
          strokeOpacity=".45"
        />
      </g>
      <g className="sculpture-front" filter={`url(#${id}-shadow)`} transform="rotate(-12 186 172)">
        <path
          d="M109 52H239L269 82V277Q269 283 263 283H109Q103 283 103 277V58Q103 52 109 52Z"
          fill={`url(#${id}-paper)`}
        />
        <path d="M239 52V82H269" fill="#b9b4ef" />
        <path d="M122 81H144M122 86H137" stroke="#7973b8" strokeWidth="2" />
        <text x="122" y="118" fill="#313254" fontSize="13" fontFamily="sans-serif" fontWeight="600">
          {visualCopy.invoice}
        </text>
        <path d="M122 132H189M122 139H172" stroke="#9792be" strokeWidth="2" />
        <path d="M122 156H251M122 177H251M122 198H251M122 219H251M211 156V239" stroke="#bbb8d4" />
        <path
          d="M124 168H173M223 168H245M124 189H188M223 189H245M124 210H158M223 210H245"
          stroke="#7e799c"
          strokeWidth="2"
        />
        <path d="M192 240H248" stroke="#6053c9" strokeWidth="4" />
        <path
          d="M125 253V268M130 253V268M137 253V268M142 253V268M146 253V268M154 253V268M159 253V268"
          stroke="#76718c"
          strokeWidth="2"
        />
      </g>
      <g className="sculpture-lens" transform="rotate(-12 278 209)">
        <rect
          x="211"
          y="170"
          width="130"
          height="68"
          rx="10"
          fill="#b5a7ff"
          fillOpacity=".22"
          stroke="#e2dbff"
          strokeOpacity=".6"
        />
        <path
          d="M225 193V184H234M318 184H327V193M225 216V225H234M318 225H327V216"
          stroke="#edeaff"
          strokeWidth="2"
        />
        <path className="scan-stroke" d="M239 204H313" stroke="#c9f5c9" strokeWidth="2" />
      </g>
      <path d="M70 194L76 208L90 214L76 220L70 234L64 220L50 214L64 208Z" fill="#d0edaa" />
      <path d="M318 66L321 74L329 77L321 80L318 88L315 80L307 77L315 74Z" fill="#e7b89f" />
      <circle cx="326" cy="271" r="4" fill="#d2c7ff" />
    </svg>
  );
}

export function ArchiveMark() {
  return (
    <div className="archive-mark" aria-hidden="true">
      <CompassRose />
      <span>{visualCopy.sampleStamp}</span>
    </div>
  );
}
