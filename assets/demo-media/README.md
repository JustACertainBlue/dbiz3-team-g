# Licensed illustrative catalog photographs

These eight images illustrate crafts for synthetic development records. They do not identify or verify the named providers. Never use them as business registration certificates, personal avatars, or evidence of a real establishment.

`manifest.json` records each source page, creator, license, downloaded original URL, dimensions and exact byte count. Six photos (silk, ceramics, bamboo, conical-hats, wood-carving, water-puppets) come from Pexels under the Pexels License (replacing earlier CC BY-SA files, 19/11/2026); each was centre-cropped to 4:3, resized to 1280×960, saved as JPEG quality 82 and stripped of metadata. embroidery.jpg and lacquer.jpg are the 1280 px CC0 versions supplied by Wikimedia Commons. The application crops responsively and lists the credits at `/image-credits`.

`npm run storage:catalog` plans how these assets map to committed seed file IDs. It does not run during normal page requests. See `docs/env/supabase-storage.md` before applying to a development project. User uploads remain separate objects and are never replaced by this bootstrap.

Each photograph also has a WebP copy (`<slug>.webp`, added by PR #306) used as the local stand-in picture for seed files; it is described under `webp` in `manifest.json` and shares the source, author and licence of the original.
