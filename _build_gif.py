"""Build an idle-animation GIF from frames 0..50 of IdleLeft (51 frames)."""
from PIL import Image
from collections import deque
import os

SRC = r"D:/deskbud/Png/IdleLeft"
OUT_DIR = r"D:/deskbud/website/assets/img"
os.makedirs(OUT_DIR, exist_ok=True)

def load_rgba(path):
    im = Image.open(path).convert("RGBA")
    W, H = im.size
    px = im.load()
    visited = [[False] * W for _ in range(H)]
    def is_bg(x, y):
        r, g, b, _ = px[x, y]
        return r == 0 and g == 0 and b == 0
    q = deque()
    for cx, cy in [(0, 0), (W - 1, 0), (0, H - 1), (W - 1, H - 1)]:
        if is_bg(cx, cy):
            q.append((cx, cy)); visited[cy][cx] = True
    while q:
        x, y = q.popleft()
        px[x, y] = (0, 0, 0, 0)
        for dx, dy in ((-1,0),(1,0),(0,-1),(0,1)):
            nx, ny = x+dx, y+dy
            if 0<=nx<W and 0<=ny<H and not visited[ny][nx] and is_bg(nx, ny):
                visited[ny][nx] = True
                q.append((nx, ny))
    return im

frames = []
n = 51
for i in range(n):
    p = os.path.join(SRC, f"{i:03d}.png")
    frames.append(load_rgba(p))

# Compute union bbox of non-transparent content across all frames
def nontrans_bbox(ims):
    minx, miny = 10**9, 10**9
    maxx, maxy = -1, -1
    for im in ims:
        W, H = im.size
        px = im.load()
        for y in range(H):
            for x in range(W):
                if px[x, y][3] > 0:
                    if x < minx: minx = x
                    if y < miny: miny = y
                    if x > maxx: maxx = x
                    if y > maxy: maxy = y
    return minx, miny, maxx, maxy

bx0, by0, bx1, by1 = nontrans_bbox(frames)
print("union bbox:", bx0, by0, bx1, by1, "w x h:", bx1-bx0+1, by1-by0+1)

pad = 4
bx0 = max(0, bx0-pad); by0 = max(0, by0-pad)
bx1 = bx1+pad; by1 = by1+pad
sw = bx1 - bx0 + 1
sh = by1 - by0 + 1
side = max(sw, sh)
print("square side:", side)

# Crop each frame to that area, paste onto square transparent canvas
cropped = []
for im in frames:
    c = im.crop((bx0, by0, bx1+1, by1+1))
    canvas = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    canvas.paste(c, ((side - c.size[0]) // 2, (side - c.size[1]) // 2))
    cropped.append(canvas)

# Resize to 80x80 (high-res for retina at 28px display)
size = 80
resized = [c.resize((size, size), Image.LANCZOS) for c in cropped]

# Build GIF (P mode for palette + transparent index)
gif_frames = [r.convert("RGBA").convert("P", palette=Image.ADAPTIVE, colors=128) for r in resized]
duration_ms = 100  # 100ms per frame -> ~10 fps
gif_path = os.path.join(OUT_DIR, "brand-panda.gif")
gif_frames[0].save(
    gif_path, save_all=True, append_images=gif_frames[1:],
    duration=duration_ms, loop=0, optimize=True, disposal=2
)
print("GIF saved:", gif_path, os.path.getsize(gif_path), "bytes")

# Also a smaller fps + smaller size for fallback if needed (not used now)
# Save resized frames count for info
print("frames:", len(resized), "@", size, "px,", duration_ms, "ms each")
