// Navy / white / green design tokens for the iOS reskin.
// Single source of truth for the kit components. Existing warm-cream
// Tailwind tokens stay for the not-yet-redesigned deeper pages.

export const HIP = {
  c: {
    appBg: "#F4F6F9",
    navy900: "#0E2A47",
    navy700: "#163B66",
    navy600: "#1D4E86",
    textDark: "#1A2230",
    textMuted: "#525C6B",
    green500: "#34A853",
    green600: "#1E8E3E",
    green700: "#157A30",
    green50: "#E6F4EA",
    amber500: "#F2B705",
    amber600: "#8A6400",
    amber50: "#FCF3D6",
    blue600: "#1F5FE0",
    blue50: "#E8EFFB",
    white: "#FFFFFF",
    line: "#E6EAF1",
    chip: "#EEF1F6",
    onNavy70: "rgba(255,255,255,0.84)",
    onNavy55: "rgba(255,255,255,0.66)",
    navyGlass: "rgba(255,255,255,0.16)",
  },
  radius: { card: 24, chip: 16, sm: 12, pill: 9999 },
  shadow: {
    card: "0 6px 20px rgba(16,32,60,0.06)",
    soft: "0 2px 8px rgba(16,32,60,0.05)",
    hero: "0 16px 34px rgba(14,42,71,0.26)",
    btn: "0 4px 12px rgba(16,32,60,0.10)",
  },
  space: { side: 16, gap: 16, pad: 18, padLg: 20 },
  font: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, Roboto, sans-serif',
  heroGradient: "linear-gradient(165deg, #0E2A47 0%, #163B66 100%)",
} as const;

export type IconName =
  | "settings"
  | "person"
  | "phone"
  | "bulb"
  | "house"
  | "pin"
  | "bars"
  | "shield"
  | "check"
  | "chevron"
  | "caret"
  | "walk"
  | "sun"
  | "heart"
  | "route";
