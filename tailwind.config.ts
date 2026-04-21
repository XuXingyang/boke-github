import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: '#0d1117',
          secondary: '#161b22',
          tertiary: '#21262d',
        },
        border: {
          DEFAULT: '#30363d',
          purple: 'rgba(139,92,246,0.3)',
          'purple-glow': 'rgba(139,92,246,0.6)',
        },
        purple: {
          DEFAULT: '#a78bfa',
          dark: '#7c3aed',
        },
        blue: {
          accent: '#60a5fa',
          code: '#2563eb',
        },
        text: {
          primary: '#e6edf3',
          secondary: '#c9d1d9',
          muted: '#8b949e',
        },
        green: { accent: '#34d399' },
        yellow: { accent: '#fbbf24' },
      },
      backgroundImage: {
        'gradient-purple-blue': 'linear-gradient(135deg, #7c3aed, #2563eb)',
        'gradient-nav': 'linear-gradient(90deg, rgba(139,92,246,0.1), rgba(96,165,250,0.06))',
      },
    },
  },
  plugins: [],
}
export default config
