/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        forest: {
          DEFAULT: "#285C49",
          50: "#EAF2EF",
          100: "#CFE2DA",
          400: "#4C8570",
          600: "#285C49",
          700: "#1E4737",
          900: "#0F2A20",
        },
        rose: {
          DEFAULT: "#D44F76",
          50: "#FBEAF0",
          100: "#F5CBDA",
          400: "#E17E9B",
          600: "#D44F76",
          700: "#A93A5C",
        },
        cream: "#FBF8F3",
        charcoal: "#232323",
        lilac: { 50: "#F5EEFF", 100: "#E8D7FF", 400: "#B98AE8", 600: "#8E5CC7" },
        yellow: { 50: "#FFF8E1", 100: "#FFE8A3", 500: "#FFB800" },
        orange: { 50: "#FFF1E9", 100: "#FFD6C2", 500: "#FF9A6B" },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(15, 42, 32, 0.06), 0 1px 8px rgba(15, 42, 32, 0.04)",
      },
      borderRadius: {
        xl2: "1.25rem",
      },
    },
  },
  plugins: [],
};
