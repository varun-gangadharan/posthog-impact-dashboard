/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: {
          950: "#0a0e1a",
          900: "#0f1629",
          800: "#151d35",
          700: "#1e2a4a",
          600: "#2a3a5c",
        },
        "indigo-accent": "#6366f1",
        "violet-accent": "#8b5cf6",
        "emerald-signal": "#34d399",
        "amber-signal": "#fbbf24",
        "rose-signal": "#f87171",
      },
      fontFamily: {
        sans: ["Inter", "DM Sans", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};
