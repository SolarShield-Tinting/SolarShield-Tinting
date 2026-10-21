"""Refresh the Google rating, review count and review cards on index.html.

Runs once a day from .github/workflows/update-reviews.yml (about 30 Google
calls a month, well inside the Places API free monthly allowance).

Needs GOOGLE_PLACES_API_KEY. GOOGLE_PLACE_ID is optional: without it the
business is looked up by name and the ID is printed so it can be saved.
"""
import html
import json
import os
import re
import sys
import urllib.request

INDEX = os.path.join(os.path.dirname(__file__), "..", "index.html")
SEARCH_NAME = "SolarShield Mobile Tinting"
CARDS = 3


def google(url, field_mask, body=None):
    req = urllib.request.Request(
        url,
        data=json.dumps(body).encode() if body else None,
        headers={
            "X-Goog-Api-Key": os.environ["GOOGLE_PLACES_API_KEY"],
            "X-Goog-FieldMask": field_mask,
            "Content-Type": "application/json",
        },
    )
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.load(r)


def place_id():
    pid = os.environ.get("GOOGLE_PLACE_ID", "").strip()
    if pid:
        return pid
    found = google("https://places.googleapis.com/v1/places:searchText",
                   "places.id,places.displayName,places.formattedAddress",
                   {"textQuery": SEARCH_NAME})
    places = found.get("places") or []
    if not places:
        sys.exit(f"No Google listing found for {SEARCH_NAME!r}")
    p = places[0]
    print(f"Using {p['displayName']['text']} ({p.get('formattedAddress', '')})")
    print(f"Save this as the GOOGLE_PLACE_ID secret: {p['id']}")
    return p["id"]


def short_name(full):
    parts = full.split()
    if len(parts) < 2:
        return full
    return f"{parts[0]} {parts[-1][0]}."


def card(review):
    text = (review.get("originalText") or review.get("text") or {}).get("text", "").strip()
    text = html.escape(re.sub(r"\s+", " ", text), quote=False)
    name = html.escape(short_name(review["authorAttribution"]["displayName"]), quote=False)
    return f"""        <figure class="flex flex-col rounded-2xl bg-black/30 border border-blue-900/60 p-5 sm:p-6">
          <div class="text-brand-yellow text-lg tracking-wide" aria-label="5 out of 5 stars">★★★★★</div>
          <blockquote class="mt-3 text-zinc-200 text-sm sm:text-base leading-relaxed flex-1 line-clamp-6">&ldquo;{text}&rdquo;</blockquote>
          <figcaption class="mt-4 flex items-center gap-2 text-sm">
            <span class="font-racing font-bold text-white tracking-wide">{name}</span>
            <span class="text-zinc-500">&bull; Google review</span>
          </figcaption>
        </figure>
"""


def main():
    data = google(f"https://places.googleapis.com/v1/places/{place_id()}",
                  "rating,userRatingCount,reviews")
    rating = data.get("rating")
    count = data.get("userRatingCount")
    if not rating or not count:
        sys.exit(f"Google returned no rating/count: {data}")

    with open(INDEX, encoding="utf-8", newline="") as f:
        page = f.read()

    page = re.sub(r"<!--RATING-->.*?<!--/RATING-->", f"<!--RATING-->{rating:.1f}<!--/RATING-->", page)
    page = re.sub(r"<!--COUNT-->.*?<!--/COUNT-->", f"<!--COUNT-->{count}<!--/COUNT-->", page)

    # Newest 5 star reviews that actually say something. Google only hands back
    # 5 reviews, so if fewer than 3 qualify the current cards are left alone.
    good = [r for r in data.get("reviews", [])
            if r.get("rating") == 5
            and len((r.get("originalText") or r.get("text") or {}).get("text", "")) >= 40]
    good.sort(key=lambda r: r.get("publishTime", ""), reverse=True)
    if len(good) >= CARDS:
        grid = ('<!-- REVIEWS:START -->\n'
                '      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">\n'
                + "".join(card(r) for r in good[:CARDS]) +
                '      </div>\n'
                '      <!-- REVIEWS:END -->')
        page = re.sub(r"<!-- REVIEWS:START -->.*?<!-- REVIEWS:END -->", lambda _: grid, page, flags=re.S)

    with open(INDEX, "w", encoding="utf-8", newline="") as f:
        f.write(page)
    print(f"Rating {rating:.1f}, {count} reviews, {len(good)} usable review cards")


if __name__ == "__main__":
    main()
