# Warehouse Slotting Lab

A small browser tool connecting software with warehouse operations.

It classifies SKUs by pick activity, computes a simplified current weighted travel score, assigns the highest-frequency SKUs to the nearest available slots, and compares the before/after score.

## Model

- depot: aisle 1, shelf 1
- distance: Manhattan distance
- one round trip per pick
- ABC classification based on cumulative pick activity
- optimization: highest pick frequency to shortest available slot distance

This deliberately leaves out many real constraints, including product dimensions, weight, incompatibilities, replenishment, congestion, material-handling equipment, one-way aisles, labor policies, and facility-specific geometry. It should be treated as a transparent teaching model, not a warehouse execution recommendation.

## Input

```csv
sku,picks_per_day,aisle,shelf
A101,125,9,4
B204,74,7,2
```

## Run

```bash
python3 serve.py
```

## Test

```bash
npm test
```

## License

MIT. Maintainer: Shikhar Singh.
