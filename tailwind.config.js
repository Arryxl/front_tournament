/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Estadio nocturno — near-black frío + acento lima eléctrico.
        // Se conservan los nombres de token; cambian los valores.
        void: '#07080A',
        'void-2': '#0E1014',
        ink: '#F2F5F7',
        mute: '#7A7F88',
        ignite: '#CCFF33', // acento de marca (scoreboard / live / acción)
        green: '#5FE3A1', // estado positivo (aprobado / ganador)
        cyan: '#46E8FF', // secundario raro (en vivo / enlaces destacados)
        line: 'rgba(242,245,247,.10)',
        'line-2': 'rgba(242,245,247,.05)',
      },
      fontFamily: {
        display: ['"Archivo"', 'system-ui', 'sans-serif'],
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
