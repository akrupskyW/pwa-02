import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./state/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Mirrors DESIGN.md §1. Token names match the .pen variables 1:1.
        background: "var(--background)",
        "background-deep": "var(--background-deep)",
        surface: {
          DEFAULT: "var(--surface)",
          2: "var(--surface-2)",
          3: "var(--surface-3)",
          glass: "var(--surface-glass)",
        },
        card: {
          DEFAULT: "var(--card)",
          elevated: "var(--card-elevated)",
        },
        line: {
          DEFAULT: "var(--border)",
          subtle: "var(--border-subtle)",
          strong: "var(--border-strong)",
        },
        track: {
          DEFAULT: "var(--track)",
          subtle: "var(--track-subtle)",
        },
        ink: {
          bright: "var(--foreground-bright)",
          DEFAULT: "var(--foreground)",
          muted: "var(--muted-foreground)",
          faint: "var(--faint-foreground)",
          soft: "var(--ink-soft)",
        },
        accent: {
          gold: "var(--accent-gold)",
          amber: "var(--accent-amber)",
          emerald: "var(--accent-emerald)",
          teal: "var(--accent-teal)",
          rose: "var(--accent-rose)",
          magenta: "var(--accent-magenta)",
          cyan: "var(--accent-cyan)",
          violet: "var(--accent-violet)",
          blue: "var(--accent-blue)",
        },
        score: {
          excellent: "var(--score-excellent)",
          good: "var(--score-good)",
          fair: "var(--score-fair)",
          low: "var(--score-low)",
          poor: "var(--score-poor)",
        },
        // Legacy aliases — keep existing class references compiling while
        // components are migrated. New code should use the tokens above.
        stage: {
          900: "var(--background)",
          800: "var(--surface)",
          700: "var(--surface-2)",
        },
        screen: {
          bg: "var(--background)",
          card: "var(--card)",
          subtle: "var(--muted-foreground)",
          line: "var(--border)",
        },
      },
      borderRadius: {
        xs: "8px",
        s: "12px",
        m: "18px",
        l: "24px",
        xl: "32px",
        pill: "9999px",
      },
      fontFamily: {
        sans: [
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
        display: [
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "sans-serif",
        ],
        mono: [
          "JetBrains Mono",
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "monospace",
        ],
      },
      boxShadow: {
        // Colored shadows used on hero cards in DESIGN.md §1.
        "card-emerald":
          "0 12px 32px -8px rgba(52, 229, 166, 0.22), inset 0 1px 0 0 rgba(255,255,255,0.04)",
        "card-violet":
          "0 12px 32px -8px rgba(124, 124, 251, 0.22), inset 0 1px 0 0 rgba(255,255,255,0.04)",
        "card-rose":
          "0 12px 32px -8px rgba(255, 94, 146, 0.22), inset 0 1px 0 0 rgba(255,255,255,0.04)",
        "tab-pill":
          "0 12px 32px -6px rgba(0,0,0,0.66), inset 0 0 0 1px rgba(255,255,255,0.02)",
        "cta-emerald": "0 10px 28px -6px rgba(52, 229, 166, 0.53)",
        bezel:
          "0 30px 60px -10px rgba(0,0,0,0.66), 0 0 0 1px rgba(255,255,255,0.04)",
      },
      backgroundImage: {
        // Brand-level angular gradient used on the composite ring + halo.
        "score-arc":
          "conic-gradient(from -90deg, #34E5A6 0deg, #22D3C5 144deg, #5DCFFF 270deg, #7C7CFB 360deg)",
      },
      keyframes: {
        "pulse-dot": {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.6", transform: "scale(0.85)" },
        },
      },
      animation: {
        "pulse-dot": "pulse-dot 2.4s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
