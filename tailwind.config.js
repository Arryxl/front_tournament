/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        void: '#0C0C0E',
        'void-2': '#131316',
        ink: '#F3F0E9',
        mute: '#76747C',
        ignite: '#FF4D17',
        green: '#9DD66B',
        line: 'rgba(243,240,233,.12)',
        'line-2': 'rgba(243,240,233,.06)',
      },
      fontFamily: {
        display: ['"Bricolage Grotesque"', 'system-ui', 'sans-serif'],
        serif: ['"Fraunces"', 'Georgia', 'serif'],
        mono: ['"Space Mono"', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        sm: '4px',
        md: '8px',
        lg: '14px',
      },
    },
  },
  plugins: [],
};
