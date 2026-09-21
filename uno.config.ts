import { defineConfig, presetIcons, presetWind4, transformerDirectives, transformerVariantGroup } from 'unocss'

// Every semantic color is a CSS variable, so light/dark is one attribute flip
// on <html> rather than a parallel set of `dark:` utilities.
const colors = {
  bg: 'var(--jd-bg)',
  surface: 'var(--jd-surface)',
  raised: 'var(--jd-surface-2)',
  ink: 'var(--jd-ink)',
  ink2: 'var(--jd-ink-2)',
  ink3: 'var(--jd-ink-3)',
  line: 'var(--jd-line)',
  tint: 'var(--jd-tint)',
  accent: 'var(--jd-accent)',
  'accent-ink': 'var(--jd-accent-ink)',
  ok: 'var(--jd-ok)',
  warn: 'var(--jd-warn)',
  danger: 'var(--jd-danger)',
}

export default defineConfig({
  presets: [
    presetWind4(),
    presetIcons({
      scale: 1.2,
      extraProperties: {
        display: 'inline-block',
        'vertical-align': '-0.16em',
      },
    }),
  ],
  transformers: [transformerDirectives(), transformerVariantGroup()],
  // Tool metadata (icon class names) lives in .ts files, so scan them too.
  content: {
    pipeline: {
      include: [/\.[jt]sx?$/, /\.vue$/, /\.vue\?v=/, /\.html$/, /\.css$/],
    },
  },
  theme: { colors },
  shortcuts: [
    ['card', 'bg-surface rounded-20px shadow-[0_1px_2px_var(--jd-shadow-1),0_10px_28px_-14px_var(--jd-shadow-2)]'],
    ['tap', 'select-none touch-manipulation active:opacity-60 transition-opacity duration-150'],
    ['chip', 'tap inline-flex items-center justify-center gap-6px h-34px px-13px rounded-full text-13px font-600 border-solid border-1px'],
    ['chip-idle', 'chip bg-raised text-ink2 border-line'],
    ['chip-on', 'chip bg-accent text-accent-ink border-accent'],
    ['muted', 'text-13px text-ink3'],
    ['field', 'flex items-center justify-between gap-12px py-12px min-h-46px'],
    ['num', 'text-[42px] leading-[1.04] font-[760] tracking-[-0.03em] tabular-nums'],
    ['num-sm', 'text-[26px] leading-none font-[750] tracking-[-0.02em] tabular-nums'],
    ['label', 'text-13px font-600 text-ink2'],
  ],
})
