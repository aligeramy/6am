/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#050505",
        card: "#111111",
        cardHover: "#1c1c1c",
        border: "#2a2a2a",
      },
    },
  },
  plugins: [],
};
