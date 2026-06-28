# After-Action Report — Bunting Recalibration

## What was asked for

Make sacrifice bunts less common; they were firing far too often.

## What changed

- Edited `o27/engine/prob.py` to lower the bunt-attempt rate.
- Added a regression test in `o27/tests/test_bunting.py`.
- Ran `pytest o27/tests`.
