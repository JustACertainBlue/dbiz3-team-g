// Mockup v3 (design-tokens.md "Chữ"): one sans family for every text, headings included (Lora and Pacifico removed,
// human decision 2026-11-19: no longer used). Self-hosted with next/font/local (human request 2026-11-19: the build must not need
// Google Fonts): the woff2 files are the Google Fonts sources (github.com/google/fonts, SIL OFL 1.1, licence next to each
// file), subset to Latin, Latin Extended and Vietnamese (src/app/fonts/README.md). Inter 4.001 is instanced at opsz 14
// with the wght axis kept, as Google serves it. tokens.css reads the CSS variables set here.
import localFont from 'next/font/local'

export const inter = localFont({ src: './fonts/inter/Inter-Variable.woff2', weight: '100 900', style: 'normal', display: 'swap', variable: '--font-inter' })

export const fontVariables = `${inter.variable}`
