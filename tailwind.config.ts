import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        severity: {
          normal: '#10b981',
          info: '#6b7280',
          warning: '#f59e0b',
          'critical-sell': '#ef4444',
          'critical-buy': '#a855f7',
          stale: '#9ca3af',
        },
        regime: {
          goldilocks: '#10b981',
          'risk-on': '#22c55e',
          'risk-off': '#f59e0b',
          stagflation: '#f97316',
          recession: '#ef4444',
        },
      },
      fontFamily: {
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      keyframes: {
        'pulse-severity': {
          '0%, 100%': { boxShadow: '0 0 0 0 var(--pulse-color, rgba(239,68,68,0.6))' },
          '50%': { boxShadow: '0 0 0 8px rgba(239,68,68,0)' },
        },
        'conflict-stripe': {
          '0%': { backgroundPosition: '0 0' },
          '100%': { backgroundPosition: '20px 0' },
        },
      },
      animation: {
        'pulse-severity': 'pulse-severity 1.5s ease-in-out 1',
        'conflict-stripe': 'conflict-stripe 1.2s linear infinite',
      },
      backgroundImage: {
        'conflict-stripe': 'repeating-linear-gradient(45deg, rgba(245,158,11,0.25), rgba(245,158,11,0.25) 8px, rgba(168,85,247,0.25) 8px, rgba(168,85,247,0.25) 16px)',
      },
    },
  },
  plugins: [],
}

export default config
