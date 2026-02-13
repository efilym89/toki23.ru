#!/usr/bin/env python3
"""Fetches public data from kgsushi.ru and writes normalized seed JSON."""

from __future__ import annotations

import json
import re
import sys
from collections import OrderedDict
from datetime import datetime, timezone
from pathlib import Path
from urllib.request import Request, urlopen

SOURCE_URL = "https://kgsushi.ru"
OUT_FILE = Path("data/kgsushi.seed.json")


def fetch_html(url: str) -> str:
    req = Request(url, headers={"User-Agent": "Mozilla/5.0 (compatible; kgsushi-clone-seed/1.0)"})
    with urlopen(req, timeout=60) as resp:
        return resp.read().decode("utf-8")


def extract_next_data(html: str) -> dict:
    match = re.search(
        r'<script id="__NEXT_DATA__" type="application/json">(.*?)</script>',
        html,
        re.S,
    )
    if not match:
        raise RuntimeError("Unable to find __NEXT_DATA__ in source HTML")
    return json.loads(match.group(1))


def clean_text(value: str | None) -> str:
    return (value or "").strip()


def parse_root_style_vars(html: str) -> dict[str, str]:
    match = re.search(r"<html\s+style=\"([^\"]+)\"", html)
    if not match:
        return {}
    style = match.group(1)
    out: dict[str, str] = {}
    for part in style.split(";"):
        piece = part.strip()
        if not piece or not piece.startswith("--"):
            continue
        key, _, value = piece.partition(":")
        out[key.strip()] = value.strip()
    return out


def extract_phone(html: str) -> str | None:
    match = re.search(r"tel:([+0-9]+)", html)
    if not match:
        return None
    raw = match.group(1)
    if raw.startswith("+7") and len(raw) == 12:
        return f"+7 ({raw[2:5]}) {raw[5:8]}-{raw[8:10]}-{raw[10:12]}"
    return raw


def normalize(data: dict, html: str) -> dict:
    state = data["props"]["pageProps"]["initialState"]
    categories_raw = state["category"]["_items"]
    meals_raw = state["meals"]["_list"]["items"]
    banners_raw = state["banners"]["_data"]
    shop_id = state["shops"].get("_current")
    shops = state["shops"].get("_list", [])

    shop = next((x for x in shops if x.get("id") == shop_id), shops[0] if shops else {})

    categories: list[dict] = []
    seen_category_codes: set[str] = set()
    for item in sorted(categories_raw, key=lambda c: (c.get("sortIndex") or 9999, c.get("name") or "")):
        code = clean_text(item.get("code"))
        if not code or code in seen_category_codes:
            continue
        seen_category_codes.add(code)
        categories.append(
            {
                "id": code,
                "code": code,
                "name": clean_text(item.get("name")),
                "description": clean_text(" ".join(item.get("description") or [])),
                "sortOrder": int(item.get("sortIndex") or 9999),
                "isActive": item.get("status") == "active",
                "coverImage": item.get("navigationImage") or item.get("logo"),
            }
        )

    products: list[dict] = []
    seen_product_codes: set[str] = set()
    for idx, meal in enumerate(sorted(meals_raw, key=lambda m: (m.get("sortIndex") or 9999, m.get("name") or ""))):
        code = clean_text(meal.get("code"))
        if not code or code in seen_product_codes:
            continue
        seen_product_codes.add(code)

        media = meal.get("media") or []
        images = meal.get("images") or []
        preview = meal.get("previewImage") or (images[0] if images else None)
        category_codes = meal.get("categories") or []

        products.append(
            {
                "id": code,
                "code": code,
                "name": clean_text(meal.get("name")),
                "description": clean_text(meal.get("description")),
                "price": int(meal.get("price") or 0),
                "oldPrice": int(meal.get("priceBeforeDiscount") or 0) or None,
                "weight": int(meal.get("weight") or 0) or None,
                "calories": int(meal.get("calories") or 0) or None,
                "volume": int(meal.get("volume") or 0) or None,
                "imageUrl": preview,
                "images": [x for x in images if isinstance(x, str)],
                "media": [x for x in media if isinstance(x, str)],
                "isAvailable": meal.get("status") == "active",
                "sortOrder": int(meal.get("sortIndex") or idx + 1),
                "categoryCode": category_codes[0] if category_codes else "rolly",
                "categoryCodes": category_codes,
                "tags": [
                    {
                        "code": clean_text(t.get("code")),
                        "text": clean_text(t.get("text")),
                    }
                    for t in meal.get("tags") or []
                    if isinstance(t, dict)
                ],
                "modifications": [
                    {
                        "mealCode": clean_text(m.get("mealCode")),
                        "name": clean_text(m.get("name")),
                        "sortOrder": int(m.get("sortIndex") or 0),
                    }
                    for m in meal.get("modifications") or []
                    if isinstance(m, dict)
                ],
                "toppingGroups": meal.get("toppingGroups") or [],
            }
        )

    banners = [
        {
            "id": clean_text(b.get("id")),
            "code": clean_text(b.get("urlCode")) or clean_text(b.get("title")) or "banner",
            "title": clean_text(b.get("title")),
            "image": b.get("verticalBackgroundImage") or b.get("backgroundImage") or b.get("image"),
            "textColor": b.get("colorText") or "#1c1c1c",
        }
        for b in banners_raw
    ]

    working_hours = shop.get("workingHours") or {}
    from_hour = int(working_hours.get("fromHour") or 11)
    from_min = int(working_hours.get("fromMinutes") or 0)
    to_hour = int(working_hours.get("toHour") or 22)
    to_min = int(working_hours.get("toMinutes") or 45)

    return {
        "source": SOURCE_URL,
        "generatedAt": datetime.now(tz=timezone.utc).isoformat(),
        "site": {
            "title": "Доставка роллов и суши — King Kong Sushi (Кинг Конг Суши)",
            "brand": "King Kong Sushi",
            "city": (shop.get("address") or {}).get("city") or "Краснодар",
            "phone": extract_phone(html) or "+7 (800) 200-65-59",
            "address": {
                "street": (shop.get("address") or {}).get("street") or "Бабушкина",
                "house": (shop.get("address") or {}).get("house") or "252",
            },
            "workingHours": {
                "from": f"{from_hour:02d}:{from_min:02d}",
                "to": f"{to_hour:02d}:{to_min:02d}",
            },
            "orderMethods": ["pickup", "delivery"],
            "currency": "RUB",
            "currencySymbol": "₽",
        },
        "theme": {
            "rootCssVariables": parse_root_style_vars(html),
        },
        "banners": banners,
        "categories": categories,
        "products": products,
    }


def main() -> int:
    html = fetch_html(SOURCE_URL)
    next_data = extract_next_data(html)
    normalized = normalize(next_data, html)

    OUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    OUT_FILE.write_text(
        json.dumps(normalized, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(f"Wrote {OUT_FILE} with {len(normalized['categories'])} categories and {len(normalized['products'])} products")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
