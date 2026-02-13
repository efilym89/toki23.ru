#!/usr/bin/env python3
"""Prepare static bundle for GitHub Pages."""

from __future__ import annotations

import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / "dist"


def copy_path(relative: str) -> None:
    src = ROOT / relative
    dst = DIST / relative
    if src.is_dir():
        shutil.copytree(src, dst, dirs_exist_ok=True)
    else:
        dst.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(src, dst)


def main() -> int:
    if DIST.exists():
        shutil.rmtree(DIST)
    DIST.mkdir(parents=True, exist_ok=True)

    for item in [
        "index.html",
        "admin.html",
        "404.html",
        "assets",
        "data",
    ]:
        copy_path(item)

    (DIST / "config.js").write_text(
        "window.APP_CONFIG = { DATA_PROVIDER: 'local', ADMIN_LOGIN: 'admin', ADMIN_PASSWORD: 'admin123' };\n",
        encoding="utf-8",
    )
    (DIST / ".nojekyll").write_text("", encoding="utf-8")

    print(f"Prepared {DIST}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
