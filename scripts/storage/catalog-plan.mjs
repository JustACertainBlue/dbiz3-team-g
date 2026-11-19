// Pure planning step of scripts/storage/bootstrap-catalog.mjs, kept apart so it can be unit tested without a database.
// The eight seed experiences whose gallery photos are the licensed catalog photos in assets/demo-media (slug = manifest slug).
export const CATALOG_CRAFTS = {
 'c9f9faf7-2987-5ae4-b1ed-95c095fcce69':'ceramics','c8281688-2dc1-5cb1-9ff6-139df04ba562':'silk',
 'd95bc77b-5e7b-53a6-a8af-5ccaabb485d8':'bamboo','b70bd0fa-6a81-5aec-9ff6-5303210b2fad':'conical-hats',
 'bad51dc8-1529-506a-8302-cb0b1d95954c':'embroidery','67a2cbab-850c-5f69-b496-59f2e9a5f594':'wood-carving',
 '800b5192-03c7-5953-849b-32a321e12a47':'lacquer','8e485337-5a2c-5703-9fbf-5e0c6492cd87':'water-puppets',
}

// rows: one row per (stored file, experience that shows it), as selected by bootstrap-catalog.mjs. A seed file can also be
// shown by experiences outside the catalog (copied galleries, sibling experiences of the provider). Each file gets the photo of
// its one original catalog experience and is planned once; the other experiences are reported, not used. A file with no or with
// more than one original catalog experience is "unmapped" and blocks --apply.
// experiences: Map experience_id -> { name, craft_type } (craft of the provider's published version) for the mismatch report.
/** @param {{ rows: any[], photos: Map<string, any>, crafts?: Record<string, string>, experiences?: Map<string, { name: string | null, craft_type: string | null }> }} input */
export function buildCatalogPlan({ rows, photos, crafts = CATALOG_CRAFTS, experiences = new Map() }) {
 const byFile=new Map()
 for(const row of rows){
  if(!byFile.has(row.file_id))byFile.set(row.file_id,{row,subjects:new Set()})
  if(row.subject_experience)byFile.get(row.file_id).subjects.add(row.subject_experience)
 }
 const plan=[],unresolved=[],missing=new Set()
 for(const [fileId,{row,subjects}]of byFile){
  const originals=[...subjects].filter(id=>crafts[id])
  if(originals.length!==1){unresolved.push(fileId);missing.add('unmapped');continue}
  const [original]=originals,slug=crafts[original],photo=photos.get(slug)
  if(!photo){missing.add(slug);continue}
  const shared=[...subjects].filter(id=>id!==original).sort()
  const photoCraft=experiences.get(original)?.craft_type??null
  const mismatched=shared.map(id=>({experience_id:id,name:experiences.get(id)?.name??null,craft_type:experiences.get(id)?.craft_type??null}))
   .filter(item=>item.craft_type!==photoCraft)
  plan.push({row,photo,original,photoCraft,shared,mismatched})
 }
 return { plan, missingCrafts:[...missing], unresolved }
}
