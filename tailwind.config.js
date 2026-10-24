/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        forest: {
          DEFAULT: "rgb(var(--c-forest-600) / <alpha-value>)",
          50: "rgb(var(--c-forest-50) / <alpha-value>)",
          100: "rgb(var(--c-forest-100) / <alpha-value>)",
          200: "rgb(var(--c-forest-200) / <alpha-value>)",
          300: "rgb(var(--c-forest-300) / <alpha-value>)",
          400: "rgb(var(--c-forest-400) / <alpha-value>)",
          500: "rgb(var(--c-forest-500) / <alpha-value>)",
          600: "rgb(var(--c-forest-600) / <alpha-value>)",
          700: "rgb(var(--c-forest-700) / <alpha-value>)",
          800: "rgb(var(--c-forest-800) / <alpha-value>)",
          900: "rgb(var(--c-forest-900) / <alpha-value>)",
        },
        surface: "rgb(var(--c-surface) / <alpha-value>)",
        line: "rgb(var(--c-border) / <alpha-value>)",
        ink: "rgb(var(--c-charcoal) / <alpha-value>)",
        muted: "rgb(var(--c-muted) / <alpha-value>)",
        accent: "rgb(var(--c-accent) / <alpha-value>)",
        "accent-ink": "rgb(var(--c-accent-ink) / <alpha-value>)",
        "accent-text": "rgb(var(--c-accent-text) / <alpha-value>)",
        up: "rgb(var(--c-up) / <alpha-value>)",
        down: "rgb(var(--c-down) / <alpha-value>)",
        warn: "rgb(var(--c-warn) / <alpha-value>)",
        rose: {
          DEFAULT: "rgb(var(--c-rose-500) / <alpha-value>)",
          50: "rgb(var(--c-rose-50) / <alpha-value>)",
          100: "rgb(var(--c-rose-100) / <alpha-value>)",
          200: "rgb(var(--c-rose-200) / <alpha-value>)",
          300: "rgb(var(--c-rose-300) / <alpha-value>)",
          400: "rgb(var(--c-rose-400) / <alpha-value>)",
          500: "rgb(var(--c-rose-500) / <alpha-value>)",
          600: "rgb(var(--c-rose-600) / <alpha-value>)",
          700: "rgb(var(--c-rose-700) / <alpha-value>)",
        },
        cream: "rgb(var(--c-cream) / <alpha-value>)",
        /* Legacy butter classes remain yellow for small status indicators only. */
        butter: {
          DEFAULT: "rgb(var(--c-yellow-500) / <alpha-value>)",
          100: "rgb(var(--c-yellow-100) / <alpha-value>)",
          50: "rgb(var(--c-yellow-50) / <alpha-value>)",
          700: "rgb(var(--c-yellow-700) / <alpha-value>)",
        },
        mint: {
          DEFAULT: "rgb(var(--c-forest-400) / <alpha-value>)",
          50: "rgb(var(--c-forest-50) / <alpha-value>)",
          100: "rgb(var(--c-forest-100) / <alpha-value>)",
        },
        charcoal: "rgb(var(--c-charcoal) / <alpha-value>)",
        lilac: {
          50: "rgb(var(--c-lilac-50) / <alpha-value>)",
          100: "rgb(var(--c-lilac-100) / <alpha-value>)",
          400: "rgb(var(--c-lilac-400) / <alpha-value>)",
          600: "rgb(var(--c-lilac-600) / <alpha-value>)",
          700: "rgb(var(--c-lilac-700) / <alpha-value>)",
        },
        yellow: {
          50: "rgb(var(--c-yellow-50) / <alpha-value>)",
          100: "rgb(var(--c-yellow-100) / <alpha-value>)",
          500: "rgb(var(--c-yellow-500) / <alpha-value>)",
        },
        orange: {
          50: "rgb(var(--c-orange-50) / <alpha-value>)",
          100: "rgb(var(--c-orange-100) / <alpha-value>)",
          500: "rgb(var(--c-orange-500) / <alpha-value>)",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(15, 42, 32, 0.05), 0 6px 20px -8px rgba(15, 42, 32, 0.10)",
        float: "0 18px 40px -12px rgba(15, 42, 32, 0.45), 0 4px 12px rgba(15, 42, 32, 0.18)",
        pop: "var(--shadow-pop)",
      },
      borderRadius: {
        xl2: "1.375rem",
        "3xl2": "1.75rem",
      },
    },
  },
  plugins: [],
};
