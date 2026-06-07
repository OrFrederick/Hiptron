import type { CSSProperties, ReactNode } from "react";

import { HIP, type IconName } from "./theme";

type PathFn = (col: string, sw: number, fill?: string) => ReactNode;

const IC_PATHS: Record<IconName, PathFn> = {
  settings: (col, sw) => (
    <g fill="none" stroke={col} strokeWidth={sw} strokeLinecap="round">
      <line x1="4" y1="7" x2="20" y2="7" />
      <circle cx="9" cy="7" r="2.4" fill="#fff0" />
      <line x1="4" y1="13" x2="20" y2="13" />
      <circle cx="15" cy="13" r="2.4" />
      <line x1="4" y1="19" x2="20" y2="19" />
      <circle cx="8" cy="19" r="2.4" />
    </g>
  ),
  person: (col, sw) => (
    <g fill="none" stroke={col} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8.5" r="3.6" />
      <path d="M5.5 19.5c1.1-3.6 4-5.2 6.5-5.2s5.4 1.6 6.5 5.2" />
    </g>
  ),
  phone: (col, sw) => (
    <path
      fill="none"
      stroke={col}
      strokeWidth={sw}
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M6.5 4.5h3l1.4 4-2 1.4a11 11 0 005.2 5.2l1.4-2 4 1.4v3a1.6 1.6 0 01-1.7 1.6A15.5 15.5 0 014.9 6.2 1.6 1.6 0 016.5 4.5z"
    />
  ),
  bulb: (col, sw) => (
    <g fill="none" stroke={col} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 14.5a5.5 5.5 0 116 0c-.7.6-1 1.3-1 2.2v.3h-4v-.3c0-.9-.3-1.6-1-2.2z" />
      <line x1="10" y1="20" x2="14" y2="20" />
    </g>
  ),
  house: (col, sw, fill) => (
    <g fill={fill || "none"} stroke={col} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 11.5L12 5l8 6.5" />
      <path d="M6 10.5V19h12v-8.5" />
    </g>
  ),
  pin: (col, sw, fill) => (
    <g fill={fill || "none"} stroke={col} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 21c4-4.2 6-7.2 6-10a6 6 0 10-12 0c0 2.8 2 5.8 6 10z" />
      <circle cx="12" cy="11" r="2.3" fill={fill ? "#fff" : "none"} stroke={fill ? "#fff" : col} />
    </g>
  ),
  bars: (col, sw) => (
    <g fill="none" stroke={col} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
      <line x1="6.5" y1="20" x2="6.5" y2="13" />
      <line x1="12" y1="20" x2="12" y2="8" />
      <line x1="17.5" y1="20" x2="17.5" y2="15" />
    </g>
  ),
  shield: (col, sw, fill) => (
    <path
      fill={fill || "none"}
      stroke={col}
      strokeWidth={sw}
      strokeLinejoin="round"
      d="M12 3.5l6.5 2.3v5.4c0 4.2-2.8 7.3-6.5 8.8-3.7-1.5-6.5-4.6-6.5-8.8V5.8L12 3.5z"
    />
  ),
  check: (col, sw) => (
    <path fill="none" stroke={col} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" d="M5.5 12.5l4 4 9-9.5" />
  ),
  chevron: (col, sw) => (
    <path fill="none" stroke={col} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" d="M9.5 5.5l6.5 6.5-6.5 6.5" />
  ),
  caret: (col, sw) => (
    <path fill="none" stroke={col} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" d="M6 9.5l6 6 6-6" />
  ),
  walk: (col, sw) => (
    <g fill="none" stroke={col} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="13" cy="4.6" r="1.7" fill={col} stroke="none" />
      <path d="M13 8l-1.5 5 .8 6M11.5 13l3 2 1.2 4M11.5 10l-3 1.5" />
    </g>
  ),
  sun: (col, sw) => (
    <g fill="none" stroke={col} strokeWidth={sw} strokeLinecap="round">
      <circle cx="12" cy="12" r="4" />
      <g>
        {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => {
          const r1 = 7;
          const r2 = 9.4;
          const rad = (a * Math.PI) / 180;
          return (
            <line
              key={a}
              x1={12 + r1 * Math.cos(rad)}
              y1={12 + r1 * Math.sin(rad)}
              x2={12 + r2 * Math.cos(rad)}
              y2={12 + r2 * Math.sin(rad)}
            />
          );
        })}
      </g>
    </g>
  ),
  heart: (col, sw, fill) => (
    <path
      fill={fill || "none"}
      stroke={col}
      strokeWidth={sw}
      strokeLinejoin="round"
      d="M12 20s-7-4.4-7-9.5A3.8 3.8 0 0112 7a3.8 3.8 0 017 3.5C19 15.6 12 20 12 20z"
    />
  ),
  route: (col, sw) => (
    <g fill="none" stroke={col} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="6" cy="18" r="2.2" />
      <circle cx="18" cy="6" r="2.2" />
      <path d="M8 17c5-1 8-3 8-9" strokeDasharray="0.5 3.2" />
    </g>
  ),
};

interface Props {
  name: IconName;
  size?: number;
  color?: string;
  sw?: number;
  fill?: string;
  style?: CSSProperties;
}

export function Ic({ name, size = 22, color = HIP.c.textDark, sw = 1.9, fill, style }: Props) {
  const render = IC_PATHS[name];
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" style={{ display: "block", ...style }}>
      {render(color, sw, fill)}
    </svg>
  );
}
