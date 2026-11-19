// Design System v9 §3 / §9: Lora (headings), Inter (UI, tabular numbers), Pacifico (one hero script line only).
// Self-hosted with next/font/local (human request 2026-11-19: the build must not need Google Fonts). The woff2 files are
// the Google Fonts sources (github.com/google/fonts, SIL OFL 1.1, licence next to each file): Inter 4.001 instanced at
// opsz 14 with the wght axis kept, as Google serves it; Lora 3.008 variable; Pacifico 3.001. Full glyph sets, Vietnamese
// included. tokens.css reads the CSS variables set here.
import localFont from 'next/font/local'

export const lora = localFont({ src: './fonts/lora/Lora-Variable.woff2', weight: '400 700', style: 'normal', display: 'swap', variable: '--font-lora' })
export const inter = localFont({ src: './fonts/inter/Inter-Variable.woff2', weight: '100 900', style: 'normal', display: 'swap', variable: '--font-inter' })
export const pacifico = localFont({ src: './fonts/pacifico/Pacifico-Regular.woff2', weight: '400', style: 'normal', display: 'swap', variable: '--font-pacifico' })

export const fontVariables = `${lora.variable} ${inter.variable} ${pacifico.variable}`
