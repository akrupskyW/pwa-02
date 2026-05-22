import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./state/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Phone-screen palette (matches the WISEintelligence prototype).
        stage: {
          900: "#05080f",
          800: "#0a1628",
          700: "#15243f",
        },
        screen: {
          bg: "#0e1726",
          card: "#15203a",
          subtle: "#6b7785",
          line: "#1f2c47",
        },
        accent: {
          gold: "#f5c14e",
        },
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};

export default config;
