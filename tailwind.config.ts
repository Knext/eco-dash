import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Pinterest brand & accent
        brand: {
          DEFAULT: '#e60023',
          pressed: '#cc001f',
        },
        // Pinterest chrome / ink / surfaces (warm-cream neutrals)
        canvas: '#ffffff',
        'surface-soft': '#fbfbf9',
        'surface-card': '#f6f6f3',
        'surface-card-deep': '#e5e5e0',
        'surface-dark': '#262622',
        hairline: '#dadad3',
        'hairline-soft': '#e5e5e0',
        ink: '#000000',
        'ink-soft': '#211922',
        body: '#33332e',
        charcoal: '#262622',
        mute: '#62625b',
        ash: '#91918c',
        stone: '#c8c8c1',
        // Domain — signal severity (preserved)
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
        // Pin Sans is proprietary — Inter is the closest open-source substitute.
        sans: [
          'var(--font-inter)',
          '-apple-system',
          'system-ui',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      fontSize: {
        // Pinterest typography scale
        'display-xl': ['70px', { lineHeight: '1.1', letterSpacing: '-1.2px', fontWeight: '600' }],
        'display-lg': ['44px', { lineHeight: '1.15', letterSpacing: '-0.8px', fontWeight: '700' }],
        'heading-xl': ['28px', { lineHeight: '1.2', letterSpacing: '-1.2px', fontWeight: '700' }],
        'heading-lg': ['22px', { lineHeight: '1.25', fontWeight: '600' }],
        'heading-md': ['18px', { lineHeight: '1.3', fontWeight: '600' }],
        'body-md': ['16px', { lineHeight: '1.4', fontWeight: '400' }],
        'body-strong': ['16px', { lineHeight: '1.4', fontWeight: '600' }],
        'body-sm': ['14px', { lineHeight: '1.4', fontWeight: '400' }],
        'body-sm-strong': ['14px', { lineHeight: '1.4', fontWeight: '700' }],
        'caption-md': ['12px', { lineHeight: '1.5', fontWeight: '500' }],
        'caption-sm': ['12px', { lineHeight: '1.4', fontWeight: '400' }],
      },
      borderRadius: {
        // Pinterest two-radius system + pill
        none: '0px',
        sm: '8px',
        md: '16px',
        lg: '32px',
        full: '9999px',
      },
      spacing: {
        section: '64px',
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
        'conflict-stripe':
          'repeating-linear-gradient(45deg, rgba(245,158,11,0.25), rgba(245,158,11,0.25) 8px, rgba(168,85,247,0.25) 8px, rgba(168,85,247,0.25) 16px)',
      },
      boxShadow: {
        // Pinterest uses essentially no shadow on content surfaces.
        // The only documented elevation is the 16px ambient under modal-card.
        modal: '0 16px 32px rgba(0,0,0,0.12)',
      },
    },
  },
  plugins: [],
}

export default config
