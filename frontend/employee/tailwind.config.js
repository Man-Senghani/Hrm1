/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "../shared/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#005ab6",
        "primary-container": "#1672df",
        secondary: "#475f89",
        tertiary: "#934700",
        error: "#ba1a1a",
        background: "#f7f9fb",
        "on-surface": "#191c1e",
        "on-surface-variant": "#414753",
        "surface-container-high": "#e6e8ea",
        "surface-container-highest": "#e0e3e5",
      },
      fontFamily: {
        headline: ["Manrope", "sans-serif"],
        body: ["Inter", "sans-serif"],
      },
      boxShadow: {
        'soft': '0 12px 32px rgba(25, 28, 30, 0.06)',
      }
    },
  },
  plugins: [],
}
