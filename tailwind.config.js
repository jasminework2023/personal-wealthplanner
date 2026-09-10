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
