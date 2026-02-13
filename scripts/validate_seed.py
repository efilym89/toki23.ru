#!/usr/bin/env python3
"""Simple validation checks for the scraped menu seed."""

from __future__ import annotations

import json
from pathlib import Path

SEED_PATH = Path("data/kgsushi.seed.json")


def main() -> int:
    if not SEED_PATH.exists():
        raise SystemExit(f"Missing seed file: {SEED_PATH}")

    data = json.loads(SEED_PATH.read_text(encoding="utf-8"))
    required_root = ["site", "categories", "products"]
    for key in required_root:
        if key not in data:
            raise SystemExit(f"Missing root key: {key}")

    categories = data["categories"]
    products = data["products"]

    if len(categories) < 5:
        raise SystemExit(f"Unexpected categories count: {len(categories)}")
    if len(products) < 50:
        raise SystemExit(f"Unexpected products count: {len(products)}")

    category_codes = {c["code"] for c in categories}
    missing_category = [p["code"] for p in products if p.get("categoryCode") not in category_codes]
    if missing_category:
        raise SystemExit(f"Products with unknown category: {missing_category[:5]}")

    bad_prices = [p["code"] for p in products if int(p.get("price") or 0) <= 0]
    if bad_prices:
        raise SystemExit(f"Products with invalid price: {bad_prices[:5]}")

    print(f"seed ok: {len(categories)} categories, {len(products)} products")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
