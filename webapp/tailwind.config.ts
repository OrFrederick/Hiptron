import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontSize: {
        hero: ["3rem", { lineHeight: "1.1" }],
      },
      colors: {
        warm: {
          50: "#FBF7F2",
          100: "#F4ECE2",
          200: "#E9D9C5",
          800: "#3D2F22",
        },
        moss: {
          400: "#7BA688",
          600: "#4F7E5E",
        },
        amber: {
          50: "#FCF3D6",
          500: "#D89B4A",
          600: "#8A6400",
        },
        // Navy / white / green iOS reskin tokens
        appbg: "#F4F6F9",
        navy: { 600: "#1D4E86", 700: "#163B66", 900: "#0E2A47" },
        ink: { DEFAULT: "#1A2230", muted: "#6B7686" },
        good: {
          50: "#E6F4EA",
          500: "#34A853",
          600: "#1E8E3E",
          700: "#157A30",
        },
        brand: { 50: "#E8EFFB", 600: "#1F5FE0" },
        line: "#E6EAF1",
      },
      boxShadow: {
        hipcard: "0 6px 20px rgba(16,32,60,0.06)",
        hipsoft: "0 2px 8px rgba(16,32,60,0.05)",
        hiphero: "0 16px 34px rgba(14,42,71,0.26)",
      },
    },
  },
  plugins: [],
} satisfies Config;
