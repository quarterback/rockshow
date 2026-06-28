# After-Action Report — Pitcher W/L Decision Fix

**Branch:** `claude/fix-decisions-Xy99`
**Commit:** `feed1234`

## The ask

Stop crediting every pitcher with a win or loss in the box score.

## The fix

- Changed `o27v2/web/box_text.py` to read the per-game decision instead of
  season totals.

## What I did not change

- Left `o27v2/web/app.py` untouched; the bug was entirely in the text builder.
- Did not touch the database schema.
