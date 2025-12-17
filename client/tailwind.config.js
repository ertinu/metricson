// Tailwind CSS konfigürasyon dosyası - Stil ayarlarını yapılandırır
/** @type {import('tailwindcss').Config} */
export default {
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
        "border-light": "#e2e8f0",
        "input-light": "#ffffff",
        "text-light": "#1a202c",
        "text-secondary-light": "#4a5568",
      },
      fontFamily: {
        "display": ["Spline Sans", "sans-serif"],
        "body": ["Noto Sans", "sans-serif"],
      },
      borderRadius: {
        "DEFAULT": "0.25rem",
        "lg": "0.5rem",
        "xl": "0.75rem",
        "full": "9999px",
      },
    },
  },
  plugins: [],
}

