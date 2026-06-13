import type { Config } from 'tailwindcss';
import animate from 'tailwindcss-animate';

const config: Config = {
  darkMode: 'class',
  content: [
    './src/app/**/*.{ts,tsx}',
    './src/components/**/*.{ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: '1.25rem',
      screens: { '2xl': '1400px' },
    },
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        // Semantic fishing-condition tokens (visual only in Phase 1).
        condition: {
          excellent: 'hsl(var(--condition-excellent))',
          good: 'hsl(var(--condition-good))',
          moderate: 'hsl(var(--condition-moderate))',
          poor: 'hsl(var(--condition-poor))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        // Fluid-ish typographic scale.
        'display-lg': ['3.5rem', { lineHeight: '1.05', letterSpacing: '-0.02em', fontWeight: '700' }],
        'display': ['2.75rem', { lineHeight: '1.1', letterSpacing: '-0.02em', fontWeight: '700' }],
        'h1': ['2rem', { lineHeight: '1.15', letterSpacing: '-0.01em', fontWeight: '600' }],
        'h2': ['1.5rem', { lineHeight: '1.2', letterSpacing: '-0.01em', fontWeight: '600' }],
        'h3': ['1.25rem', { lineHeight: '1.3', fontWeight: '600' }],
        'body-lg': ['1.125rem', { lineHeight: '1.6' }],
        'body': ['1rem', { lineHeight: '1.6' }],
        'caption': ['0.8125rem', { lineHeight: '1.4', letterSpacing: '0.01em' }],
      },
      boxShadow: {
        premium: '0 1px 2px rgba(0,0,0,0.4), 0 12px 40px -12px rgba(2,18,34,0.7)',
        glow: '0 0 0 1px hsl(var(--ring) / 0.25), 0 8px 30px -8px hsl(var(--primary) / 0.45)',
      },
      backgroundImage: {
        'ocean-radial':
          'radial-gradient(120% 120% at 50% 0%, hsl(var(--ocean-glow) / 0.18) 0%, transparent 55%)',
        'card-sheen':
          'linear-gradient(135deg, hsl(var(--card) / 0.9) 0%, hsl(var(--card) / 0.6) 100%)',
      },
      keyframes: {
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
        'float-slow': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
      },
      animation: {
        shimmer: 'shimmer 1.6s infinite',
        'float-slow': 'float-slow 6s ease-in-out infinite',
      },
    },
  },
  plugins: [animate],
};

export default config;
