#!/usr/bin/env python3
"""Extract the visible text of the account screens from the mockup .dc.html files, in document order.

  python3 scripts/local/extract-mockup-texts.py ~/Desktop/hab-mockup-v3/source > tests/fixtures/v3-account-mockup-texts.json

The tests in tests/unit/v3-account-mockup.test.ts compare the rendered pages with this file.
"""
import html, json, re, sys
from pathlib import Path

FILES = {'15': 'DangNhap', '16': 'MatKhau', '17': 'DangKyDaiLy', '17a': 'HoSoBoSung', '18': 'XacThucOTP', '18a': 'DangKyThanhCong',
         '18b': 'DangKyCanBoSung', '18c': 'DangKyTuChoi', '18d': 'LienHeSo', '19': 'TaiKhoanCuaToi', '19a': 'TaiKhoanChoDuyet', '28': 'HoSoCongTy'}

def texts(path: Path):
    h = path.read_text()
    h = re.sub(r'<(script|style)\b.*?</\1>', '', h, flags=re.S)
    h = re.sub(r'<br\s*/?>', ' ', h)
    return [t for t in (re.sub(r'\s+', ' ', html.unescape(p)).strip() for p in re.split(r'<[^>]+>', h)) if t]

src = Path(sys.argv[1]).expanduser()
print(json.dumps({k: texts(src / f'{v}.dc.html') for k, v in FILES.items()}, ensure_ascii=False, indent=1))
