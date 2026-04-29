/**
 * TourGuide Design System — Tailwind config
 * À étendre dans le tailwind.config.{js,ts} de chaque app (Web, Mobile-RN).
 *
 * Usage : import tgPreset from '@tourguide/design-system/tailwind';
 *         export default { presets: [tgPreset], content: [...] };
 */

/** @type {import('tailwindcss').Config} */
module.exports = {
  theme: {
    // ─────────── Palette ───────────
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      white: '#FFFFFF',
      black: '#000000',

      paper: {
        DEFAULT: '#F4ECDD',
        soft:    '#EFE4D0',
        deep:    '#E8DCC4',
      },
      card: '#FFFFFF',
      ink: {
        DEFAULT: '#102A43',
        80: 'rgba(16, 42, 67, 0.8)',
        60: 'rgba(16, 42, 67, 0.6)',
        40: 'rgba(16, 42, 67, 0.4)',
        20: 'rgba(16, 42, 67, 0.2)',
      },
      line: 'rgba(16, 42, 67, 0.10)',
      ardoise: '#2C3E50',

      grenadine: {
        DEFAULT: '#C1262A',
        soft:    '#FBE5E2',
      },
      ocre: {
        DEFAULT: '#C68B3E',
        soft:    '#F5E4C7',
      },
      mer: {
        DEFAULT: '#2B6E8A',
        soft:    '#D7E5EC',
      },
      olive: {
        DEFAULT: '#6B7A45',
        soft:    '#E2E5D2',
      },

      success: '#4F7942',
      warning: '#C68B3E',
      danger:  '#C1262A',
      info:    '#2B6E8A',
    },

    // ─────────── Typo ───────────
    fontFamily: {
      sans:      ['Manrope', 'Inter', 'system-ui', 'sans-serif'],
      display:   ['"DM Serif Display"', '"Playfair Display"', 'Georgia', 'serif'],
      editorial: ['"DM Serif Text"', 'Georgia', 'serif'],
      mono:      ['"JetBrains Mono"', '"SF Mono"', 'ui-monospace', 'monospace'],
    },

    fontSize: {
      eyebrow: ['0.6875rem', { lineHeight: '1.4', letterSpacing: '0.18em' }],
      meta:    ['0.75rem',   { lineHeight: '1.5'  }],
      caption: ['0.8125rem', { lineHeight: '1.5'  }],
      body:    ['0.875rem',  { lineHeight: '1.55' }],
      'body-lg': ['1rem',    { lineHeight: '1.55' }],
      h6:      ['1.125rem',  { lineHeight: '1.4'  }],
      h5:      ['1.375rem',  { lineHeight: '1.25', letterSpacing: '-0.015em' }],
      h4:      ['1.875rem',  { lineHeight: '1.15', letterSpacing: '-0.02em' }],
      h3:      ['2.5rem',    { lineHeight: '1.1',  letterSpacing: '-0.025em' }],
      h2:      ['3.5rem',    { lineHeight: '1.05', letterSpacing: '-0.025em' }],
      h1:      ['4.5rem',    { lineHeight: '1',    letterSpacing: '-0.03em'  }],
    },

    // ─────────── Spacing (4pt) ───────────
    extend: {
      spacing: {
        '0.5': '2px',
      },

      borderRadius: {
        sm:  '6px',
        md:  '12px',
        lg:  '18px',
        xl:  '28px',
        pill:'999px',
      },

      boxShadow: {
        sm:     '0 1px 2px rgba(16, 42, 67, 0.06)',
        md:     '0 4px 12px rgba(16, 42, 67, 0.08)',
        lg:     '0 12px 28px rgba(16, 42, 67, 0.14)',
        xl:     '0 24px 60px rgba(16, 42, 67, 0.18)',
        accent: '0 12px 28px rgba(193, 38, 42, 0.22)',
      },

      transitionDuration: {
        fast: '120ms',
        base: '200ms',
        slow: '320ms',
      },

      transitionTimingFunction: {
        out:    'cubic-bezier(0.2, 0.8, 0.2, 1)',
        smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
    },
  },

  plugins: [
    // Tokens utilitaires
    function ({ addUtilities }) {
      addUtilities({
        '.tg-eyebrow': {
          fontSize: '0.6875rem',
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          fontWeight: '700',
        },
        '.tg-display': {
          fontFamily: '"DM Serif Display", Georgia, serif',
          fontWeight: '400',
          letterSpacing: '-0.025em',
          lineHeight: '1.05',
        },
        '.tg-editorial': {
          fontFamily: '"DM Serif Text", Georgia, serif',
          fontStyle: 'italic',
          lineHeight: '1.4',
        },
      });
    },
  ],
};
