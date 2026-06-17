/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Velocidad de Escape (GRV-03) — negro pista + brasa naranja + marfil.
        // Se conservan los nombres de token; cambian los valores.
        void: '#0A0A0B', // fondo base, asfalto nocturno
        'void-2': '#121214', // superficies elevadas / cards
        'void-3': '#1A1A1D', // hover de superficie
        ink: '#F1ECDF', // texto principal / marca (el marfil de la G)
        mute: '#84847E', // texto secundario
        ignite: '#EC571E', // acento de marca (scoreboard / acción / estela)
        'ignite-h': '#FF6A2B', // brillo / hover del naranja
        ember: '#B23E12', // naranja profundo (sombras del acento)
        green: '#5FE3A1', // estado positivo (aprobado / gratis)
        cyan: '#46E8FF', // secundario raro (en vivo)
        line: 'rgba(241,236,223,.12)',
        'line-2': 'rgba(241,236,223,.06)',
      },
      fontFamily: {
        // Display condensada itálica (velocidad racing) + grotesque de apoyo.
        display: ['"Saira Condensed"', '"Archivo"', 'system-ui', 'sans-serif'],
        grotesk: ['"Archivo"', 'system-ui', 'sans-serif'],
        serif: ['"Archivo"', 'system-ui', 'sans-serif'],
        mono: ['"Space Mono"', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        sm: '3px',
        md: '7px',
        lg: '12px',
      },
    },
  },
  plugins: [],
};
