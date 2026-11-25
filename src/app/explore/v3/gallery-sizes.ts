// Tile `sizes` of the shared gallery (see Gallery.tsx).

// Share of the gallery width of each tile, per number of tiles (CSS: .v3g--nN in explore-v3.css).
const SHARE: Record<number, number[]> = { 1: [1], 2: [0.5, 0.5], 3: [2 / 3, 1 / 3, 1 / 3], 4: [0.5, 0.5, 0.25, 0.25], 5: [0.5, 0.25, 0.25, 0.25, 0.25] }
const vw = (share: number) => `${Number((share * 100).toFixed(2))}vw`

/**
 * `sizes` of one tile. object-fit: cover scales a landscape (4:3) image to the tile's height, so a tile needs an image at
 * least height × 4/3 wide however narrow it is: tall tiles (the large one; both tiles of 1–2 images) are 440 px high from
 * 900 px and 280 px below, the others 216 / 136 px. Otherwise the tile's real width: its share of the gallery, which is
 * `maxWidth` px at the widest layout (1100 on 03, 804 on 04/24) and the viewport on narrow screens.
 */
export function gallerySizes(count: number, index: number, maxWidth: number): string {
  const share = SHARE[Math.min(count, 5)][index] ?? 0.25
  const tall = index === 0 || count <= 2
  const [desktopHeight, mobileHeight] = tall ? [440, 280] : [216, 136]
  const desktop = `max(${Math.round(desktopHeight * 4 / 3)}px, min(${Math.round(share * maxWidth)}px, ${vw(share)}))`
  const mobile = `max(${Math.round(mobileHeight * 4 / 3)}px, ${vw(share)})`
  return `(min-width: 900px) ${desktop}, ${mobile}`
}
