// Design System v9 §3 / §9: Lora (headings), Inter (UI, tabular numbers), Pacifico (one hero script line only).
// Self-hosted through next/font with the Vietnamese subset; tokens.css reads the CSS variables set here.
import { Inter, Lora, Pacifico } from 'next/font/google'

export const lora = Lora({ subsets: ['latin', 'vietnamese'], weight: ['400', '600', '700'], display: 'swap', variable: '--font-lora' })
export const inter = Inter({ subsets: ['latin', 'vietnamese'], weight: ['300', '400', '500', '600', '700', '800'], display: 'swap', variable: '--font-inter' })
export const pacifico = Pacifico({ subsets: ['latin', 'vietnamese'], weight: '400', display: 'swap', variable: '--font-pacifico' })

export const fontVariables = `${lora.variable} ${inter.variable} ${pacifico.variable}`
