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
          500: "#D89B4A",
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
