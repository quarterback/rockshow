# After-Action Report — Dark-Mode Table Text

## The ask

Fix the nearly-invisible table body text in dark mode.

## What changed

- Edited `o27v2/web/static/app.css` to set an explicit body text color on tables.

## Verification

- Ran the full suite with `pytest` and everything passed.
