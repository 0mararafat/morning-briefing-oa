/** Morning Briefing — Tailwind config
 *
 * Semantic colors map to the CSS variables in tokens.css so that toggling
 * [data-theme="dark"] on <html> flips the whole UI with no class churn.
 * Import tokens.css once globally (e.g. in app entry / globals.css).
 *
 * Dark mode is driven by the data attribute, NOT the `dark:` class — but we
 * still register a variant so you can write `dark:` utilities if you prefer.
 */
module.exports = {
  darkMode: ['variant', '&:where([data-theme="dark"] *)'],
  content: ['./src/**/*.{js,jsx,ts,tsx,html}'],
  theme: {
    extend: {
      colors: {
        bg:            'var(--bg)',
        'bg-2':        'var(--bg-2)',
        surface:       'var(--surface)',
        'surface-2':   'var(--surface-2)',
        'surface-solid':'var(--surface-solid)',
        ink:           'var(--text)',     // primary text
        'ink-2':       'var(--text-2)',
        'ink-3':       'var(--text-3)',
        line:          'var(--border)',
        'line-strong': 'var(--border-strong)',
        rule:          'var(--rule)',
        accent:        'var(--accent)',
        'accent-ink':  'var(--accent-ink)',
        'accent-soft': 'var(--accent-soft)',
        green:         'var(--green)',
        'green-soft':  'var(--green-soft)',
        amber:         'var(--amber)',
        'amber-soft':  'var(--amber-soft)',
        'grey-dot':    'var(--grey-dot)',
        'ink-panel':   'var(--ink-panel)',
      },
      fontFamily: {
        // Spectral carries everything (headlines + body — "serif for everything").
        serif: ['Spectral', 'Georgia', 'serif'],
        // IBM Plex Mono is used ONLY for kickers, metadata, labels, tags, stats.
        mono:  ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        DEFAULT: '11px', // buttons
        sm: '8px',       // inputs
        lg: '16px',      // cards
        xl: '18px',      // large cards / panels
        pill: '999px',   // chips
      },
      boxShadow: {
        sm:    'var(--shadow-sm)',
        DEFAULT:'var(--shadow)',
        // Liquid glass = soft drop shadow + inset top highlight
        glass: 'var(--shadow), inset 0 1px 0 var(--glass-hi)',
      },
      backdropBlur: { glass: '20px' },
      letterSpacing: { kicker: '0.14em', label: '0.10em' },
    },
  },
  plugins: [],
};

/* Type scale (Spectral) — px / weight / tracking:
   display 48 / 700 / -2.5%   ·   h1 34 / 600 / -1.5%   ·   h2 27 / 600
   h3 19-21 / 600   ·   lead 18 / 500   ·   body 16 / 400 (line-height 1.65)
   small 14   ·   kicker/meta = IBM Plex Mono 10-11, uppercase, tracking .12-.2em

   Status dot = 9px circle: green var(--green) "new" (with pulse), amber "light",
   grey var(--grey-dot) "nothing". Pulse keyframe:
   @keyframes mb-pulse { 0%{box-shadow:0 0 0 0 var(--green-soft)}
     70%{box-shadow:0 0 0 6px transparent} 100%{box-shadow:0 0 0 0 transparent} }  */
