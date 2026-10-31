import type { Config } from "tailwindcss";

// Colours are CSS variables (RGB channels) set per edition in app/globals.css, so one set of class names gives
// Lite its night-match navy + pitch green and Main its warm black + gold. `<alpha-value>` keeps /20-style opacity.
const v = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: { 950: v("ink-950"), 900: v("ink-900"), 800: v("ink-800"), 700: v("ink-700"), 600: v("ink-600"), 500: v("ink-500") },
        accent: { 200: v("accent-200"), 300: v("accent-300"), 400: v("accent-400"), 500: v("accent-500"), 600: v("accent-600") },
        glow: v("glow"), // second colour for gradients (Main: violet)
        chalk: v("chalk"), // body text on dark surfaces
        flare: v("flare"), // warnings only (quality issues)
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        sans: ["var(--font-body)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        glow: "0 0 0 1px rgb(var(--accent-400) / .25), 0 18px 50px -12px rgb(var(--accent-500) / .35)",
      },
      keyframes: {
        float: { "0%,100%": { transform: "translateY(0)" }, "50%": { transform: "translateY(-8px)" } },
      },
      animation: { float: "float 6s ease-in-out infinite" },
    },
  },
  plugins: [],
};
export default config;
