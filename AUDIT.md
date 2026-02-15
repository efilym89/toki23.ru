# UI/UX Audit - 2026-02-15

## Public (index/404)
- Header on mobile grows to ~178px height; grid stacks into 3 rows, pushing content below the fold.
- Hero on mobile >1000px tall; banner grid 2x3 plus long copy - catalog not visible on first screen.
- Catalog toolbar: search input 44px vs checkbox label 19px - misaligned controls.
- Category chips overflow container on all breakpoints; horizontal scroll not masked -> page wide scroll.
- Product cards: height variance ~50-60px from long descriptions, causing "ripped" grid rows.
- Product modal: image collapses to 0x0 when network blocks asset; no aspect-ratio/fallback placeholder.
- Floating cart button overlaps hero on mobile due to excessive hero height.
- Images rely on external CDN; no loading placeholders/fallbacks - blank blocks when blocked.
- Footer block missing; content not editable or rendered.
- 404 page is copy of home without 404 messaging - wrong template/UX.

## Admin
- Layout on mobile: width ~728px -> constant horizontal scroll; nav + content exceed viewport.
- Product table on mobile: min-width 640px, no responsive styles -> spills off screen.
- Product form: single long column (~3200px height) without grouping/collapse - heavy scrolling.
- Mixed UI tokens: buttons/inputs/radius/spacing differ from public; duplicate ad-hoc values.

## Assets collected
- Screenshots: audits/shot-desktop.png, audits/shot-tablet.png, audits/shot-mobile.png, audits/admin-desktop.png.
- Probe scripts/metrics kept in audits/ for reference.
