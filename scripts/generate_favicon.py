import os
from PIL import Image

src_path = r"C:/Users/Sudhir/.gemini/antigravity/brain/36b132c1-0b4b-4030-b220-c6fe48a9e681/.user_uploaded/media_1789983031519.jpg"
out_dir = r"d:/Games/birthday project/public"
root_dir = r"d:/Games/birthday project"

print(f"Loading source image from: {src_path}")
img = Image.open(src_path).convert("RGBA")

# 1. Generate 512x512 favicon.png in public/
favicon_512 = img.resize((512, 512), Image.Resampling.LANCZOS)
pub_png_path = os.path.join(out_dir, "favicon.png")
favicon_512.save(pub_png_path, "PNG", optimize=True)
print(f"Saved: {pub_png_path} (512x512 PNG)")

# Also save to root directory
root_png_path = os.path.join(root_dir, "favicon.png")
favicon_512.save(root_png_path, "PNG", optimize=True)
print(f"Saved: {root_png_path} (512x512 PNG)")

# 2. Generate multi-size favicon.ico
ico_sizes = [(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]
pub_ico_path = os.path.join(out_dir, "favicon.ico")
img.save(pub_ico_path, format="ICO", sizes=ico_sizes)
print(f"Saved: {pub_ico_path} (Multi-resolution ICO)")

root_ico_path = os.path.join(root_dir, "favicon.ico")
img.save(root_ico_path, format="ICO", sizes=ico_sizes)
print(f"Saved: {root_ico_path} (Multi-resolution ICO)")

# 3. Generate 180x180 apple-touch-icon.png
apple_touch = img.resize((180, 180), Image.Resampling.LANCZOS)
pub_apple_path = os.path.join(out_dir, "apple-touch-icon.png")
apple_touch.save(pub_apple_path, "PNG", optimize=True)
print(f"Saved: {pub_apple_path} (180x180 PNG)")

root_apple_path = os.path.join(root_dir, "apple-touch-icon.png")
apple_touch.save(root_apple_path, "PNG", optimize=True)
print(f"Saved: {root_apple_path} (180x180 PNG)")

print("Favicon generation completed successfully!")
