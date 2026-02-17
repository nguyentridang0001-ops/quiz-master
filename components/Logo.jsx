// components/Logo.jsx
import React from "react";

export default function Logo({ size = 56 }) {
  return (
    <svg
      className="logoSvg"
      width={size}
      height={size}
      viewBox="0 0 64 64"
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="g1" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="#7c5cff" />
          <stop offset="100%" stopColor="#06b6d4" />
        </linearGradient>

        <filter id="f1" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow
            dx="0"
            dy="6"
            stdDeviation="12"
            floodColor="#0a1220"
            floodOpacity="0.6"
          />
        </filter>
      </defs>

      {/* circle with drop shadow */}
      <g filter="url(#f1)">
        <circle cx="32" cy="32" r="28" fill="url(#g1)" />
      </g>

      <g>
        {/* Q (outer + hole) */}
        <path
          d="M27 22c-4 0-7.2 3.4-7.2 7.6S23 37.2 27 37.2 34.2 33.8 34.2 29.6 31 22 27 22zm0 12.2c-2.6 0-4.6-2.2-4.6-4.6S24.4 25 27 25s4.6 2.2 4.6 4.6S29.6 34.2 27 34.2z"
          fill="#fff"
          opacity="0.98"
        />

        {/* tail of Q */}
        <rect
          x="33.8"
          y="33.5"
          width="3.6"
          height="1.6"
          transform="rotate(30 35.6 34.3)"
          fill="#fff"
        />

        {/* M (stylized) */}
        <path
          d="M40 22h2.2l4.8 10.8L51 22h2.4v18h-2.2V28.6l-4.6 10.4h-0.2L41 28.6V40h-1V22z"
          fill="#fff"
          opacity="0.98"
        />
      </g>
    </svg>
  );
}
