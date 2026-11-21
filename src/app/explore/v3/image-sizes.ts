// `sizes` of the v3 images: the width an image really takes at each position, measured on the built app at 1440 and
// 390 px and completed from the CSS for the widths in between (table "vị trí → sizes" in docs/build/build-log.md).
// object-fit: cover scales a landscape 4:3 image to the frame's height, so a frame taller than 3/4 of its width asks
// for height × 4/3 (the 02 result card; the large village tile). Between the two measured widths the values round up,
// so the browser never picks a variant smaller than it needs. Gallery tiles: gallerySizes() in Gallery.tsx.

/** 01/21 experience card and 24 similar-experience card: .v3-xgrid / .v3p-simgrid, auto-fill minmax(260px, 1fr) in 1100 px:
 *  258 px at 1440 (4 columns), 340 px at 390 (1 column). */
export const CARD_SIZES = '(min-width: 1140px) 260px, (min-width: 868px) 36vw, (min-width: 600px) 50vw, 100vw'
/** 01/21 village grid, large tile (356 × 340 px at 1440, 342 × 340 at 390): the 340 px height needs 453 px of image. */
export const VILLAGE_BIG_SIZES = '460px'
/** 01/21 village grid, other tiles (356 × 162 px at 1440, 342 × 162 at 390). */
export const VILLAGE_TILE_SIZES = '(min-width: 1140px) 360px, (min-width: 600px) 50vw, 100vw'
/** 03a village card: 3 columns from 900 px, 2 from 600 px (349 × 218 px at 1440, 340 × 212 at 390). */
export const VILLAGE_CARD_SIZES = '(min-width: 1140px) 350px, (min-width: 900px) 34vw, (min-width: 600px) 50vw, 100vw'
/** 02 result card, also used on 03 and 24: 220 px wide × 260–384 px high from 768 px (the height needs up to 512 px of
 *  image); below 768 px the image stays on the left, 112 × 180 px (frame 5/8): the w400 variant. */
export const RESULT_SIZES = '(min-width: 768px) 520px, 112px'
/** 21 hold banner: fixed 96 px wide. */
export const BANNER_SIZES = '96px'
