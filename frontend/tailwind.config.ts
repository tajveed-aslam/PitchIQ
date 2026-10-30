import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Night-match navy: surfaces from darkest to lightest.
        ink: {
          950: "#050a14",
          900: "#08101f",
          800: "#0e1a2e",
          700: "#15233b",
          600: "#1f3150",
          500: "#2c4166",
        },
        // Pitch green: the one accent (actions, highlights, good results).
        pitch: {
          200: "#c8f7d4",
          300: "#94eeab",
          400: "#5be07f",
          500: "#2fc65c",
          600: "#1fa148",
        },
        chalk: "#e8eef7", // body text on navy
        flare: "#ffb547", // warnings only (quality issues)
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        sans: ["var(--font-body)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(91,224,127,.25), 0 18px 50px -12px rgba(47,198,92,.35)",
      },
    },
  },
  plugins: [],
};
export default config;
