# Self-hosted fonts

Used by `src/app/fonts.ts` through `next/font/local`, so the build needs no network (human request 2026-11-19: CI macOS
failed when `next/font/google` could not reach Google Fonts). One file, licence (SIL OFL 1.1) next to it.

| File | Source (github.com/google/fonts, branch `main`) | Version | Axes | woff2 full → subset |
|---|---|---|---|---|
| `inter/Inter-Variable.woff2` | `ofl/inter/Inter[opsz,wght].ttf`, instanced at `opsz=14` | 4.001 | wght 100–900 | 236 480 → 131 568 bytes |

Inter is instanced at `opsz=14` because that is how Google Fonts serves it (wght axis only); the glyph shapes match the
Google-served files. UI v3 uses Inter only; Lora and Pacifico were removed (human decision 2026-11-19).

## How to rebuild

fonttools is used on the machine only (not a repo dependency):

```bash
python3 -m venv /tmp/fontenv && /tmp/fontenv/bin/pip install fonttools brotli
curl -sfLo Inter.ttf 'https://raw.githubusercontent.com/google/fonts/main/ofl/inter/Inter%5Bopsz,wght%5D.ttf'
/tmp/fontenv/bin/python -c "from fontTools.ttLib import TTFont; from fontTools.varLib import instancer; instancer.instantiateVariableFont(TTFont('Inter.ttf'), {'opsz': 14}).save('Inter-wght.ttf')"
```

Character set = the union of the Google Fonts `latin`, `latin-ext` and `vietnamese` unicode ranges. It includes Latin
Extended-A/B and Additional, the combining diacritics U+0300-036F, Vietnamese U+1EA0-1EF9 and the đồng sign ₫ U+20AB:

```bash
U='U+0000-00FF,U+0100-024F,U+0259,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0300-036F,U+1D00-1DBF,U+1E00-1EFF,U+2000-206F,U+20A0-20C0,U+2113,U+2122,U+2191,U+2193,U+2212,U+2215,U+2C60-2C7F,U+A720-A7FF,U+FEFF,U+FFFD'
/tmp/fontenv/bin/pyftsubset Inter-wght.ttf --unicodes="$U" --layout-features='*' --flavor=woff2 --output-file=inter/Inter-Variable.woff2
```

`--layout-features='*'` keeps every OpenType feature (kerning and mark positioning in GPOS, `tnum` for tabular numbers);
pyftsubset keeps the variation axes. Check after rebuilding: every Vietnamese letter, the combining marks the source has,
and ₫ are present (the subset loses no requested character the source has).
