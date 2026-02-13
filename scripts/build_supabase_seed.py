#!/usr/bin/env python3
"""Build Supabase SQL seed from data/kgsushi.seed.json."""

from __future__ import annotations

import json
from pathlib import Path

SEED_JSON = Path("data/kgsushi.seed.json")
OUT_SQL = Path("supabase/seed.sql")


def sql_literal(value):
  if value is None:
    return "null"
  if isinstance(value, bool):
    return "true" if value else "false"
  if isinstance(value, (int, float)):
    return str(value)
  if isinstance(value, (list, dict)):
    text = json.dumps(value, ensure_ascii=False).replace("'", "''")
    return f"'{text}'::jsonb"
  text = str(value).replace("'", "''")
  return f"'{text}'"


def main() -> int:
  if not SEED_JSON.exists():
    raise SystemExit(f"Missing {SEED_JSON}")

  source = json.loads(SEED_JSON.read_text(encoding="utf-8"))

  lines: list[str] = []
  lines.append("-- Generated from data/kgsushi.seed.json")
  lines.append("-- Load after supabase/schema.sql")
  lines.append("")

  for key in ["site", "banners", "theme"]:
    value = source.get(key if key != "site" else "site") if key == "site" else source.get(key, [])
    lines.append(
      "insert into public.settings (key, value) values "
      f"('{key}', {sql_literal(value)}) "
      "on conflict (key) do update set value = excluded.value, updated_at = now();"
    )

  lines.append("")

  for category in source.get("categories", []):
    lines.append(
      "insert into public.categories (code, name, description, sort_order, is_active, cover_image) values "
      f"({sql_literal(category.get('code'))}, {sql_literal(category.get('name'))}, {sql_literal(category.get('description') or '')}, "
      f"{sql_literal(category.get('sortOrder') or 999)}, {sql_literal(category.get('isActive', True))}, {sql_literal(category.get('coverImage') or '')}) "
      "on conflict (code) do update set "
      "name = excluded.name, description = excluded.description, sort_order = excluded.sort_order, "
      "is_active = excluded.is_active, cover_image = excluded.cover_image, updated_at = now();"
    )

  lines.append("")

  for product in source.get("products", []):
    lines.append(
      "insert into public.products "
      "(code, name, description, category_code, price, old_price, weight, calories, volume, image_url, images, media, is_available, sort_order, tags, modifications, topping_groups) values "
      f"({sql_literal(product.get('code'))}, {sql_literal(product.get('name'))}, {sql_literal(product.get('description') or '')}, "
      f"{sql_literal(product.get('categoryCode'))}, {sql_literal(product.get('price') or 0)}, {sql_literal(product.get('oldPrice'))}, "
      f"{sql_literal(product.get('weight'))}, {sql_literal(product.get('calories'))}, {sql_literal(product.get('volume'))}, "
      f"{sql_literal(product.get('imageUrl') or '')}, {sql_literal(product.get('images') or [])}, {sql_literal(product.get('media') or [])}, "
      f"{sql_literal(product.get('isAvailable', True))}, {sql_literal(product.get('sortOrder') or 999)}, "
      f"{sql_literal(product.get('tags') or [])}, {sql_literal(product.get('modifications') or [])}, {sql_literal(product.get('toppingGroups') or [])}) "
      "on conflict (code) do update set "
      "name = excluded.name, description = excluded.description, category_code = excluded.category_code, "
      "price = excluded.price, old_price = excluded.old_price, weight = excluded.weight, calories = excluded.calories, "
      "volume = excluded.volume, image_url = excluded.image_url, images = excluded.images, media = excluded.media, "
      "is_available = excluded.is_available, sort_order = excluded.sort_order, tags = excluded.tags, "
      "modifications = excluded.modifications, topping_groups = excluded.topping_groups, updated_at = now();"
    )

  OUT_SQL.parent.mkdir(parents=True, exist_ok=True)
  OUT_SQL.write_text("\n".join(lines) + "\n", encoding="utf-8")
  print(f"Wrote {OUT_SQL}")
  return 0


if __name__ == "__main__":
  raise SystemExit(main())
