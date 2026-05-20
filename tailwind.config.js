/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        oranit: {
          midnight: "#0b1020",
          navy: "#121a33",
          purple: "#5b2d8a",
          violet: "#7c3aed",
          blue: "#2563eb",
          cyan: "#38bdf8",
        },
      },
      fontFamily: {
        display: ["Rubik", "Segoe UI", "sans-serif"],
      },
      boxShadow: {
        glow: "0 0 24px rgba(124, 58, 237, 0.35)",
      },
    },
  },
  plugins: [],
};
