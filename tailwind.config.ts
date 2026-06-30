import type { Config } from "tailwindcss";

// Semantic tokens map to the CSS variables in app/globals.css (from the Claude
// Design handoff). Toggling [data-theme="dark"] on <html> flips the whole UI.
const config: Config = {
  darkMode: ["variant", '&:where([data-theme="dark"] *)'],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        "bg-2": "var(--bg-2)",
        surface: "var(--surface)",
        "surface-2": "var(--surface-2)",
        "surface-solid": "var(--surface-solid)",
        ink: "var(--text)",
        "ink-2": "var(--text-2)",
        "ink-3": "var(--text-3)",
        muted: "var(--text-2)", // alias used by pre-handoff components
        border: "var(--border)",
        line: "var(--border)",
        "line-strong": "var(--border-strong)",
        rule: "var(--rule)",
        accent: "var(--accent)",
        "accent-ink": "var(--accent-ink)",
        "accent-soft": "var(--accent-soft)",
        green: "var(--green)",
        "green-soft": "var(--green-soft)",
        amber: "var(--amber)",
        "amber-soft": "var(--amber-soft)",
        "grey-dot": "var(--grey-dot)",
        "ink-panel": "var(--ink-panel)",
        // status aliases used by the renderer/components
        "signal-strong": "var(--green)",
        "signal-light": "var(--amber)",
        "signal-none": "var(--grey-dot)",
      },
      fontFamily: {
        // "Serif for everything" — Spectral carries headlines + body.
        serif: ["Spectral", "Georgia", "serif"],
        sans: ["Spectral", "Georgia", "serif"],
        // IBM Plex Mono only for kickers, metadata, labels, tags, stats.
        mono: ['"IBM Plex Mono"', "ui-monospace", "monospace"],
      },
      borderRadius: {
        DEFAULT: "11px",
        sm: "8px",
        lg: "16px",
        xl: "18px",
        pill: "999px",
      },
      boxShadow: {
        sm: "var(--shadow-sm)",
        DEFAULT: "var(--shadow)",
        glass: "var(--shadow), inset 0 1px 0 var(--glass-hi)",
      },
      backdropBlur: { glass: "20px" },
      letterSpacing: { kicker: "0.14em", label: "0.10em" },
      keyframes: {
        "mb-pulse": {
          "0%": { boxShadow: "0 0 0 0 var(--green-soft)" },
          "70%": { boxShadow: "0 0 0 6px transparent" },
          "100%": { boxShadow: "0 0 0 0 transparent" },
        },
      },
      animation: { "mb-pulse": "mb-pulse 2s infinite" },
    },
  },
  plugins: [],
};

export default config;
