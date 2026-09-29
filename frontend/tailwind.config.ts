import type { Config } from "tailwindcss";

// Colors are CSS variables (see globals.css) so light/dark can swap them.
const v = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: v("brand"), dark: v("brand-dark"), soft: v("brand-soft") },
        ink: { DEFAULT: v("ink"), muted: v("ink-muted") },
        mint: { DEFAULT: "#14b8a6", soft: v("mint-soft"), fg: v("mint-fg"), line: v("mint-line") },
        surface: v("surface"),
        page: { DEFAULT: v("page"), 2: v("page-2") },
        line: v("line"),
        subtle: v("subtle"),
        bubble: v("bubble"),
        faint: v("faint"),
      },
      fontFamily: { sans: ["Inter", "system-ui", "sans-serif"] },
      boxShadow: { card: "0 10px 40px -12px rgb(var(--shadow) / var(--shadow-a))" },
    },
  },
  plugins: [],
};
export default config;
