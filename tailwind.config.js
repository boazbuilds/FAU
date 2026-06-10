/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{svelte,js}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Space Grotesk Variable"', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'],
        pixel: ['"Press Start 2P"', 'ui-monospace', 'SFMono-Regular', 'monospace']
      },
      keyframes: {
        flicker: {
          '0%,100%': { opacity: '1' },
          '92%': { opacity: '1' },
          '93%': { opacity: '0.55' },
          '94%': { opacity: '1' },
          '97%': { opacity: '0.7' },
          '98%': { opacity: '1' }
        },
        blink: { '0%,49%': { opacity: '1' }, '50%,100%': { opacity: '0.15' } },
        scan: { '0%': { transform: 'translateY(-100%)' }, '100%': { transform: 'translateY(100%)' } },
        pop: { '0%': { transform: 'scale(0.8)', opacity: '0' }, '100%': { transform: 'scale(1)', opacity: '1' } },
        floatup: { '0%': { transform: 'translateY(8px)', opacity: '0' }, '100%': { transform: 'translateY(0)', opacity: '1' } },
        bob: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-4px)' } },
        burst: { '0%': { transform: 'scale(0.4)', opacity: '0' }, '60%': { transform: 'scale(1.15)', opacity: '1' }, '100%': { transform: 'scale(1)', opacity: '1' } },
        wiggle: { '0%,100%': { transform: 'rotate(-6deg)' }, '50%': { transform: 'rotate(6deg)' } },
        shake: { '0%,100%': { transform: 'translateX(0)' }, '20%,60%': { transform: 'translateX(-5px)' }, '40%,80%': { transform: 'translateX(5px)' } }
      },
      animation: {
        pop: 'pop 0.25s ease-out',
        floatup: 'floatup 0.3s ease-out',
        bob: 'bob 2.6s ease-in-out infinite',
        burst: 'burst 0.4s ease-out',
        wiggle: 'wiggle 0.5s ease-in-out',
        shake: 'shake 0.4s ease-in-out',
        flicker: 'flicker 4s linear infinite',
        blink: 'blink 1.1s steps(1) infinite',
        scan: 'scan 6s linear infinite'
      }
    }
  },
  plugins: []
};
