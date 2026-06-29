# After-Action Report — Box Score Pitch-Count Columns

**Branch:** `claude/box-score-pitch-count-aB12`
**PR:** #88
**Commit:** `a1b2c3d`

## What was asked for

Add a pitch-count column to the box score so each pitcher's total pitches render
next to their line.

## What changed

- Edited `o27v2/web/box_text.py` to render a `Pit` column in the pitcher table.
- Updated `o27v2/web/app.py` to pass the per-pitcher pitch totals into the view.
- Ran the test suite with `pytest o27v2/tests`.

## What I did NOT do

- Did not touch `o27v2/web/templates/box.html`; the column renders from the text
  builder, not the template.
