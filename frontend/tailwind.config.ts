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
        good: v("good"), // status: improved / met / done (always with an icon or word, never colour alone)
        series: { 1: v("series-1"), 2: v("series-2") }, // chart series, validated for colour-blind separation
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        sans: ["var(--font-body)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      boxShadow: {
        glow: "0 0 0 1px rgb(var(--accent-400) / .25), 0 18px 50px -12px rgb(var(--accent-500) / .35)",
      },
      keyframes: {
        float: { "0%,100%": { transform: "translateY(0)" }, "50%": { transform: "translateY(-8px)" } },
        // Main: the scanner line over the hero photo and the tracking reticle's pulse.
        sweep: { "0%": { transform: "translateY(-10%)", opacity: "0" }, "10%,90%": { opacity: "1" }, "100%": { transform: "translateY(1000%)", opacity: "0" } },
        lock: { "0%,100%": { transform: "scale(1)", opacity: "1" }, "50%": { transform: "scale(1.06)", opacity: ".75" } },
        rise: { from: { transform: "translateY(12px)", opacity: "0" }, to: { transform: "translateY(0)", opacity: "1" } },
      },
      animation: {
        float: "float 6s ease-in-out infinite",
        sweep: "sweep 4.5s cubic-bezier(.4,0,.2,1) infinite",
        lock: "lock 2.4s ease-in-out infinite",
        rise: "rise .6s cubic-bezier(.2,.8,.2,1) both",
      },
    },
  },
  plugins: [],
};
export default config;
