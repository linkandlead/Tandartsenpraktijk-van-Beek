import sys, os
from PIL import Image, ImageChops
a_dir, b_dir = sys.argv[1], sys.argv[2]
uit = []
for f in sorted(os.listdir(a_dir)):
    if not f.endswith('.png'): continue
    a = Image.open(os.path.join(a_dir, f)).convert('RGB'); b = Image.open(os.path.join(b_dir, f)).convert('RGB')
    if a.size != b.size:
        uit.append(f"{f}: ANDERE MAAT {a.size} -> {b.size}"); continue
    d = ImageChops.difference(a, b); bbox = d.getbbox()
    if not bbox: uit.append(f"{f}: identiek ({a.size[0]}x{a.size[1]})")
    else:
        n = sum(1 for p in d.getdata() if p != (0,0,0))
        uit.append(f"{f}: {n} pixels verschillen, gebied {bbox}")
print("\n".join(uit))
