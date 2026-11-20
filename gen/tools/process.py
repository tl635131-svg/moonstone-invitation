# Post-process Codex raw images -> web assets.  python -I process.py [only-substring]
import sys, os, glob
from PIL import Image
import os as _o; ROOT = _o.environ['ROOT']
RAW = os.path.join(ROOT, 'gen', 'raw')
OUT = os.path.join(ROOT, 'assets')
only = sys.argv[1] if len(sys.argv) > 1 else ''
_session = None

def cutout(im):
    global _session
    from rembg import remove, new_session
    if _session is None:
        _session = new_session('isnet-general-use')
    im.thumbnail((1024, 1024)); o = remove(im, session=_session, post_process_mask=True)
    bbox = o.getchannel('A').point(lambda a: 255 if a > 10 else 0).getbbox()
    if bbox:
        o = o.crop(bbox)
    w, h = o.size
    pad = int(max(w, h) * 0.04)
    canvas = Image.new('RGBA', (w + pad * 2, h + pad * 2), (0, 0, 0, 0))
    canvas.paste(o, (pad, pad))
    return canvas

for raw in sorted([g for g in glob.glob(os.path.join(RAW, '**', '*.png'), recursive=True) if '-v1' not in g]):
    rel = os.path.relpath(raw, RAW).replace('\\', '/')
    if only and only not in rel:
        continue
    folder = rel.split('/')[0]
    cut = folder in ('orn', 'icons')
    dst = os.path.join(OUT, rel[:-4] + '.webp')
    if os.path.exists(dst) and os.path.getmtime(dst) > os.path.getmtime(raw) and not os.environ.get('FORCE'):
        continue
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    im = Image.open(raw).convert('RGB')
    if cut:
        o = cutout(im)
        o.thumbnail((900, 900), Image.LANCZOS)
        o=o.convert('RGBA')
        try:
            o.save(dst, 'WEBP', quality=86, method=4)
        except Exception as ex:
            print('webp retry', ex); o.copy().save(dst, 'WEBP', quality=90, method=0, exact=True)
    else:
        if False:
            dx, dy = int(im.width*0.035), int(im.height*0.03)
            im = im.crop((dx, dy, im.width-dx, im.height-dy))
        maxw = 1200 if folder == 'tex' else 1000
        if im.width > maxw:
            im = im.resize((maxw, round(im.height * maxw / im.width)), Image.LANCZOS)
        im.save(dst, 'WEBP', quality=82, method=6)
    print('wrote', rel, '->', os.path.relpath(dst, ROOT), os.path.getsize(dst) // 1024, 'KB')
