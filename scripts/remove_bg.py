"""Remove o fundo verde gradiente da logo via flood-fill a partir das bordas.

O preenchimento avanca por pixels verdes/escuros do fundo e para nos contornos
claros (branco/cinza) da logo. Gera assets/logo.png com fundo transparente.
"""
import sys
from collections import deque

from PIL import Image, ImageFilter

SRC = sys.argv[1] if len(sys.argv) > 1 else "logo.png"
DST = sys.argv[2] if len(sys.argv) > 2 else "assets/logo.png"


def is_background(r, g, b):
    mx, mn = max(r, g, b), min(r, g, b)
    # branco/cinza claro (contorno da logo) -> nao e fundo
    if mn > 150 and (mx - mn) < 60:
        return False
    # verde dominante (fundo gradiente) ou pixel escuro (cantos do fundo)
    greenish = g >= r and g >= b and (mx - mn) > 15
    dark = mx < 90
    return greenish or dark


def main():
    img = Image.open(SRC).convert("RGBA")
    w, h = img.size
    px = img.load()

    visited = [[False] * w for _ in range(h)]
    q = deque()
    for x in range(w):
        q.append((x, 0))
        q.append((x, h - 1))
    for y in range(h):
        q.append((0, y))
        q.append((w - 1, y))

    while q:
        x, y = q.popleft()
        if x < 0 or y < 0 or x >= w or y >= h or visited[y][x]:
            continue
        visited[y][x] = True
        r, g, b, a = px[x, y]
        if not is_background(r, g, b):
            continue
        px[x, y] = (r, g, b, 0)
        q.extend(((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)))

    # suaviza a borda do recorte
    alpha = img.getchannel("A").filter(ImageFilter.GaussianBlur(0.6))
    img.putalpha(alpha)

    img.save(DST)
    print(f"OK: {DST} ({w}x{h})")


if __name__ == "__main__":
    main()
