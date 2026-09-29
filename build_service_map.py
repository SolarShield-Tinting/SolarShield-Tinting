import math
import json
import urllib.request
import io
import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter

def build_map():
    with open('florida_3counties.geojson', 'r', encoding='utf-8') as f:
        geo_data = json.load(f)

    zoom = 11
    min_x, max_x = 552, 557  # 6 tiles
    min_y, max_y = 850, 857  # 8 tiles

    tile_w, tile_h = 256, 256
    full_w = (max_x - min_x + 1) * tile_w
    full_h = (max_y - min_y + 1) * tile_h

    print(f"Stitching {full_w}x{full_h} background tiles...")
    stitched = Image.new('RGB', (full_w, full_h), color=(10, 16, 26))

    for x in range(min_x, max_x + 1):
        for y in range(min_y, max_y + 1):
            url = f"https://a.basemaps.cartocdn.com/dark_all/{zoom}/{x}/{y}.png"
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
            try:
                with urllib.request.urlopen(req, timeout=10) as resp:
                    tile_img = Image.open(io.BytesIO(resp.read()))
                    px = (x - min_x) * tile_w
                    py = (y - min_y) * tile_h
                    stitched.paste(tile_img, (px, py))
            except Exception as e:
                print(f"Warning tile {x},{y}: {e}")

    # Coordinate transformation
    def latlon_to_xy(lat, lon):
        n = 2.0 ** zoom
        x = (lon + 180.0) / 360.0 * n
        lat_rad = math.radians(lat)
        y = (1.0 - math.asinh(math.tan(lat_rad)) / math.pi) / 2.0 * n
        px = (x - min_x) * 256.0
        py = (y - min_y) * 256.0
        return (px, py)

    # Crop bounds to center on the 3 counties cleanly
    crop_x1 = 200
    crop_y1 = 320
    crop_x2 = 1450
    crop_y2 = 1920

    # Fonts
    try:
        font_huge = ImageFont.truetype('arialbd.ttf', 38)
        font_large = ImageFont.truetype('arialbd.ttf', 28)
        font_sub = ImageFont.truetype('arialbd.ttf', 20)
        font_body = ImageFont.truetype('arialbd.ttf', 16)
        font_small = ImageFont.truetype('arialbd.ttf', 13)
        font_water = ImageFont.truetype('ariali.ttf', 22)
    except:
        font_huge = font_large = font_sub = font_body = font_small = font_water = ImageFont.load_default()

    # Create RGBA layer for county overlays
    overlay = Image.new('RGBA', (full_w, full_h), (0, 0, 0, 0))
    draw_ov = ImageDraw.Draw(overlay)

    # Draw Counties
    for feat in geo_data['features']:
        name = feat['properties']['NAME']
        coords = feat['geometry']['coordinates']
        
        # Determine styling
        if 'Hernando' in name:
            fill_color = (255, 208, 0, 48)     # Brand Yellow translucent
            border_color = (255, 208, 0, 240)   # Bright Gold
            border_w = 4
        elif 'Citrus' in name:
            fill_color = (13, 98, 217, 40)     # Brand Blue translucent
            border_color = (0, 210, 255, 220)   # Cyan / Electric Blue
            border_w = 3
        else: # Pasco
            fill_color = (13, 98, 217, 40)     # Brand Blue translucent
            border_color = (0, 210, 255, 220)   # Cyan / Electric Blue
            border_w = 3

        for ring in coords:
            pts = [latlon_to_xy(lat, lon) for lon, lat in ring]
            if len(pts) > 2:
                draw_ov.polygon(pts, fill=fill_color)
                draw_ov.line(pts + [pts[0]], fill=border_color, width=border_w)

    # Composite overlay onto stitched
    base_img = Image.alpha_composite(stitched.convert('RGBA'), overlay)
    
    # Now draw crisp badges, markers, highways and text on top
    draw = ImageDraw.Draw(base_img)

    # Gulf of Mexico text along coast
    water_pts = (240, 1000)
    draw.text(water_pts, "GULF OF MEXICO", fill=(30, 80, 130, 220), font=font_water)

    # County Name Banners / Labels
    # 1. Citrus County
    citrus_badge = (650, 480, 1000, 535)
    draw.rounded_rectangle(citrus_badge, radius=8, fill=(8, 16, 29, 230), outline=(0, 210, 255, 240), width=2)
    draw.text((825, 495), "CITRUS COUNTY", fill=(255, 255, 255), font=font_sub, anchor="mt")
    draw.text((825, 517), "NORTH SERVICE ZONE", fill=(0, 210, 255), font=font_small, anchor="mt")

    # 2. Hernando County (HUB)
    hernando_badge = (650, 1040, 1050, 1110)
    draw.rounded_rectangle(hernando_badge, radius=10, fill=(10, 12, 16, 245), outline=(255, 208, 0, 255), width=3)
    draw.text((850, 1058), "★ HERNANDO COUNTY ★", fill=(255, 208, 0), font=font_large, anchor="mt")
    draw.text((850, 1088), "PRIMARY MOBILE DISPATCH HUB", fill=(255, 255, 255), font=font_small, anchor="mt")

    # 3. Pasco County
    pasco_badge = (650, 1530, 990, 1585)
    draw.rounded_rectangle(pasco_badge, radius=8, fill=(8, 16, 29, 230), outline=(0, 210, 255, 240), width=2)
    draw.text((820, 1545), "PASCO COUNTY", fill=(255, 255, 255), font=font_sub, anchor="mt")
    draw.text((820, 1567), "SOUTH SERVICE ZONE", fill=(0, 210, 255), font=font_small, anchor="mt")

    # Cities and Dispatch Pins
    cities = [
        # Citrus
        ("Crystal River", 28.90, -82.59, False, "tl"),
        ("Inverness", 28.84, -82.33, False, "tr"),
        ("Homosassa", 28.78, -82.61, False, "bl"),
        # Hernando
        ("Spring Hill", 28.48, -82.53, True, "br"), # HQ
        ("Brooksville", 28.55, -82.39, False, "tr"),
        ("Weeki Wachee", 28.52, -82.57, False, "tl"),
        # Pasco
        ("Hudson", 28.36, -82.69, False, "tl"),
        ("New Port Richey", 28.25, -82.72, False, "bl"),
        ("Trinity", 28.18, -82.67, False, "br"),
        ("Land O' Lakes", 28.22, -82.46, False, "tr"),
        ("Wesley Chapel", 28.24, -82.33, False, "tr"),
    ]

    for name, lat, lon, is_hq, pos in cities:
        cx, cy = latlon_to_xy(lat, lon)
        if is_hq:
            # Major HQ Pin with pulsing rings
            draw.ellipse((cx - 24, cy - 24, cx + 24, cy + 24), fill=(255, 208, 0, 60), outline=(255, 208, 0, 180), width=2)
            draw.ellipse((cx - 14, cy - 14, cx + 14, cy + 14), fill=(255, 208, 0, 255), outline=(0, 0, 0, 255), width=3)
            # Star / HQ label
            label_box = (cx + 20, cy - 16, cx + 240, cy + 18)
            draw.rounded_rectangle(label_box, radius=6, fill=(0, 0, 0, 230), outline=(255, 208, 0, 255), width=2)
            draw.text((cx + 28, cy - 10), "SPRING HILL", fill=(255, 208, 0), font=font_body)
            draw.text((cx + 28, cy + 3), "DISPATCH BASE", fill=(255, 255, 255), font=font_small)
        else:
            # Standard City Pin
            draw.ellipse((cx - 8, cy - 8, cx + 8, cy + 8), fill=(0, 210, 255, 255), outline=(0, 0, 0, 255), width=2)
            draw.ellipse((cx - 3, cy - 3, cx + 3, cy + 3), fill=(255, 255, 255, 255))
            
            # Text position offset
            if pos == "tl":
                tx, ty = cx - 12, cy - 10
                anchor = "ra"
            elif pos == "tr":
                tx, ty = cx + 12, cy - 10
                anchor = "la"
            elif pos == "bl":
                tx, ty = cx - 12, cy + 6
                anchor = "ra"
            else: # br
                tx, ty = cx + 12, cy + 6
                anchor = "la"

            # Draw text shadow then text
            bbox = font_body.getbbox(name)
            tw = bbox[2] - bbox[0]
            th = bbox[3] - bbox[1]
            if "r" in anchor:
                bx1, bx2 = tx - tw - 6, tx + 6
            else:
                bx1, bx2 = tx - 4, tx + tw + 6
            by1, by2 = ty - 2, ty + th + 4

            draw.rounded_rectangle((bx1, by1, bx2, by2), radius=4, fill=(0, 0, 0, 210))
            draw.text((tx, ty), name, fill=(240, 245, 255), font=font_body, anchor=anchor)

    # Crop to focus area
    cropped = base_img.crop((crop_x1, crop_y1, crop_x2, crop_y2))
    cw, ch = cropped.size

    # Add stylish framing and header/footer overlays
    final_img = Image.new('RGB', (cw, ch), (6, 12, 22))
    final_img.paste(cropped, (0, 0))
    draw_final = ImageDraw.Draw(final_img)

    # Outer border
    draw_final.rectangle((0, 0, cw - 1, ch - 1), outline=(255, 208, 0, 220), width=4)

    # Top Header Banner
    top_box = (0, 0, cw, 90)
    draw_final.rectangle(top_box, fill=(5, 10, 18, 245))
    draw_final.line([(0, 90), (cw, 90)], fill=(255, 208, 0, 240), width=3)
    draw_final.text((cw // 2, 22), "SOLARSHIELD MOBILE TINTING", fill=(255, 208, 0), font=font_huge, anchor="mt")
    draw_final.text((cw // 2, 60), "OFFICIAL GULF COAST SERVICE AREA • 100% DRIVEWAY DISPATCH", fill=(220, 235, 255), font=font_body, anchor="mt")

    # Bottom Footer Banner
    bot_box = (0, ch - 75, cw, ch)
    draw_final.rectangle(bot_box, fill=(5, 10, 18, 245))
    draw_final.line([(0, ch - 75), (cw, ch - 75)], fill=(255, 208, 0, 240), width=3)
    draw_final.text((cw // 2, ch - 58), "CITRUS COUNTY • HERNANDO COUNTY • PASCO COUNTY", fill=(255, 255, 255), font=font_sub, anchor="mt")
    draw_final.text((cw // 2, ch - 30), "CALL OR TEXT (727) 598-TINT • SAME-DAY & NEXT-DAY DISPATCH", fill=(255, 208, 0), font=font_small, anchor="mt")

    # Save to disk
    os.makedirs('images', exist_ok=True)
    out_2x = 'images/service_map@2x.png'
    out_1x = 'images/service_map.png'
    
    final_img.save(out_2x, quality=95)
    final_img.resize((cw // 2, ch // 2), Image.Resampling.LANCZOS).save(out_1x, quality=92)
    print(f"Successfully generated crystal-clear authentic service maps: {out_2x} ({cw}x{ch}) and {out_1x}!")

if __name__ == '__main__':
    build_map()
