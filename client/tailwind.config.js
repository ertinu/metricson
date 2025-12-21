// Tailwind CSS konfigürasyon dosyası - Stil ayarlarını yapılandırır
/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        "primary": "#ea2a33",
        "background-light": "#f0f2f5",
        "background-dark": "#211111",
        "sidebar-light": "#ffffff",
        "panel-light": "#ffffff",
        "surface-light": "#ffffff",
        "border-light": "#e2e8f0",
        "input-light": "#ffffff",
        "text-light": "#475569", // Daha koyu atrasit renk (slate-600) - rgb(148, 163, 184) yerine
        "text-medium": "#64748b",
        "text-dark": "#334155",
        "text-secondary-light": "#4a5568",
      },
      fontFamily: {
        "display": ["Spline Sans", "sans-serif"],
        "body": ["Noto Sans", "sans-serif"],
      },
      borderRadius: {
        "DEFAULT": "1rem",
        "lg": "2rem",
        "xl": "3rem",
        "full": "9999px",
      },
    },
  },
  plugins: [],
}

