# After-Action Report — Standings N+1 Query

## What was asked for

Speed up the standings page; it was issuing a query per team.

## What changed

- Updated `o27v2/web/standings.py` to batch the per-team record lookup into one
  query.

## Validation

- Reloaded the standings page and confirmed it renders.
