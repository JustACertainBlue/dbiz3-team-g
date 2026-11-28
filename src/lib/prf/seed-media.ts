// Seed placeholder images. The seed `stored_files` rows keep a key `seed/YYYY/MM/<file_id>.<ext>` and no object in storage;
// 32 of them are showcase photographs and have a licensed demo picture in assets/demo-media/ (see its README).
// Data only, no server imports: media-urls.ts (client-safe) uses it too. Seed files that are not in this map
// (chat attachments, PDF documents) are never images and never get a stand-in picture.
// Reviewed on PR #306: this is a change of the 2026-11-19 / 2026-11-21 rule "key seed/... is not an image", pending Khanh Linh.

const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
/** The exact form of a seed key; any other `seed/...` key (e.g. with `..`) is refused. */
export const SEED_STORAGE_KEY = new RegExp(`^seed/\\d{4}/\\d{2}/${UUID}\\.[a-z0-9]+$`, 'i')

/** Any `seed/` object key that is safe to hand to a path or to storage: segments of [A-Za-z0-9._-] only, and never "..". */
export const isSafeSeedKey = (key: string) => /^seed\/[A-Za-z0-9._-]+(?:\/[A-Za-z0-9._-]+)*$/.test(key) && !key.includes('..')

export const SEED_FILE_DEMO_SLUGS: Record<string, string> = {
  '0b0a4ca0-7493-54d2-aa86-36da0eae7ca5': 'silk',
  '113f70fa-5880-5863-b3d3-b00a8e91aae9': 'silk',
  '126d0c59-f2c0-580b-a51b-82864e688b1e': 'ceramics',
  '1af3d7f0-8f8f-5a23-84cf-c7a284fd7564': 'bamboo',
  '29a18608-e870-5768-9b6a-0725f7c6127d': 'bamboo',
  '35fa9e03-059f-5a13-9152-0203b77a5a72': 'silk',
  '4456e72c-d953-5e1c-94f2-fd459d99f8a6': 'water-puppets',
  '471f1147-acf0-5655-87e9-f9c0374e00ae': 'wood-carving',
  '4c273c05-3f81-5c7d-a87b-e0ab4a8e9f14': 'water-puppets',
  '4eb65fc8-0dab-5609-9314-73822311aa47': 'lacquer',
  '54663e12-2712-5736-85e1-30f9f7d63895': 'embroidery',
  '5490f8fa-4b8e-5b64-bc55-2315b949a8d4': 'lacquer',
  '64a9e816-11b6-552b-b704-b2fc62b52ce2': 'silk',
  '65f429db-01a7-58e9-8bb6-c80cd8d48e87': 'water-puppets',
  '6698a1ac-581c-5b1b-9995-79b8c940618c': 'ceramics',
  '6a517c7a-81ab-5aa8-816a-c3006afdb315': 'wood-carving',
  '6c6215e7-76cb-50c0-b7ff-7f4c8a7bbe67': 'lacquer',
  '6f899cb2-eead-50bc-9dd9-aa96fc36b82b': 'ceramics',
  '791f2241-2f3b-5cd4-84fd-8151d7224f52': 'conical-hats',
  '8a2ef71b-19ff-5862-8e30-1d3402374549': 'bamboo',
  '8b2f8019-e755-5921-aef6-0b1040801e1f': 'wood-carving',
  '8ed11bbf-aa44-5c3f-a9c1-c158b5e527d3': 'conical-hats',
  '9140849e-4aab-5a34-8e12-9325ad37732e': 'bamboo',
  '9ce69642-b06c-52c8-ac6f-53dfa10251e7': 'wood-carving',
  'a12bfc5a-6ba5-580d-955e-ecfcb4edee10': 'lacquer',
  'aaf34139-85fc-58a5-a5e3-2ca9f219da2d': 'embroidery',
  'bb673534-f702-5187-b1d8-c403ca5bf466': 'conical-hats',
  'bdfab530-2097-5dbd-ad6d-13fca233286c': 'ceramics',
  'c76fc431-9295-5767-8a61-3fcf6ffe6dd0': 'embroidery',
  'cafd3b09-6d8d-5b20-8c53-35555c602123': 'water-puppets',
  'e65402fd-c96c-5a57-89cf-027ad74e9662': 'embroidery',
  'e8fc5e73-04d7-50b9-a779-ab369a32356b': 'conical-hats',
}

/** Demo picture slug (assets/demo-media/<slug>.webp|jpg) of a seed file, or null when the file has none. */
export function demoSlugForSeedFile(file: { file_id: string; storage_key: string }): string | null {
  if (!SEED_STORAGE_KEY.test(file.storage_key) || !file.storage_key.toLowerCase().includes(`/${file.file_id.toLowerCase()}.`)) return null
  return Object.prototype.hasOwnProperty.call(SEED_FILE_DEMO_SLUGS, file.file_id.toLowerCase()) ? SEED_FILE_DEMO_SLUGS[file.file_id.toLowerCase()] : null
}
