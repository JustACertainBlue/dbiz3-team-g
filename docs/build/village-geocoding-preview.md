# Village Geocoding Preview

`tools/preview_hanoi_geocoding.py` writes review CSVs for the seed and test datasets. It does
not edit `data/`, application fixtures, or the shared enrichment lookup.

## Run on Windows PowerShell

Run these two commands from the repository root, replacing the placeholder email:

```powershell
$env:HAB_PHOTON_USER_AGENT = 'Hanoi Artisan Bridge geocoding preview (contact: YOUR_EMAIL@example.com)'
python tools\preview_hanoi_geocoding.py --source csv --source json --output-dir "$HOME\Desktop"
```

`csv` selects `data/seed/villages.csv`. `json` selects the primary test fixture and the copy in
`src/data/ai-matching/`. A custom CSV or JSON source can be repeated as `--source
"C:\path\to\villages.json"`. Each source gets its own CSV in the selected output directory.
`--output` is allowed only with one source. The default manual-coordinate file is
`src/lib/matching/manual_village_coords.csv`.

The script uses Photon (komoot), requests up to five English-language results, biases searches
to latitude `21.03`, longitude `105.85`, and waits at least one second between uncached requests.
The fixed screening rectangle is `(south=20.55, north=21.45, west=105.25, east=106.05)`.
Only `countrycode=VN` results inside that rectangle with `osm_key=boundary` or `osm_key=place`
are eligible. Among up to five results, the script prefers a district/county/city
matching the seed; otherwise it selects the first and flags the district mismatch. The query
is `<district>, Hà Nội`, and results are cached by district outside the repository. Set
`HAB_PHOTON_CACHE` to override the default user cache path.

Existing fixture coordinates with status `from_plus_code` are retained without a Photon request.
When providers in one village have different Plus Code points, the village point is their
arithmetic mean and the CSV is flagged `plus_code_coordinates_differ`. `ai_estimated` and
`not_found` coordinates are not treated as known. A matching row in the manual CSV takes
priority over Plus Code and Photon data; its columns are `normalized_key,lat,lng,source`, with
`source=manual`. Enrichment entries preserve provenance in `geo.source` and
`geo.verified_status`.

## Shared runtime enrichment

`src/lib/matching/village-coordinate-lookup.json` is the ID-keyed enrichment read by both the
seed loader and test-dataset adapter. Approved seed and fixture coordinates are stored in its
`by_village_id` map. A record uses `{ "geo": { "lat": ..., "lng": ..., "precision": ..., "source": ...,
"verified_status": ... },
"attributes": { "field": { "value": ..., "source": ..., "verified_status": ... } } }`.
Use `precision=plus_code` for retained Plus Code coordinates and
`precision=district_centroid` for the district fallback. Their runtime sources are
`from_plus_code` and `district_fallback`; manual rows resolve to `manual_gmaps`.
Providers and activities inherit their village coordinate. A village with no coordinate stays
unlocated.

The attribute registry currently contains only `geo`; unknown attributes may be loaded but are
not filterable or added to model prompt attributes. The default origin for distance calculation
is Ho Guom, latitude `21.0285`, longitude `105.8542`; the UI labels this default. An explicit
origin not found in the Hanoi district lookup is left unresolved rather than guessed.

Distance uses Haversine without rounding before radius comparison. Plus Code and manual
coordinates use an exact radius boundary. Future `approximate` coordinates use a named 3 km
uncertainty: reject only when `estimate - 3 > radius`, confirm only when `estimate + 3 <= radius`,
and otherwise retain the candidate with `chưa xác nhận bán kính`. Approximate distances are
rounded to whole kilometres and labeled `tọa độ xấp xỉ`. District fallback uses a separate
named 10 km uncertainty with the same boundary rules. Displayed precise distances are rounded to
0.1 km; district estimates are rounded to whole kilometres and labeled `ước tính theo huyện`.

Photon GeoJSON coordinates are `[longitude, latitude]`; the output CSV writes separate `Lat`
and `Lng` columns and includes the Photon name, OSM key/value, and district/county/city for
review. Attribution: © OpenStreetMap contributors (ODbL), geocoding qua Photon (komoot).
