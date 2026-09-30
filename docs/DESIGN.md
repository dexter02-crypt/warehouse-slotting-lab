# Design notes

Warehouse Slotting Lab is deliberately a transparent heuristic model.

## Distance model

Within one aisle, travel is shelf-to-shelf. Moving between aisles requires returning to the configured front cross aisle, crossing aisle spacing, then entering the destination aisle.

## Compatibility

A target slot is eligible only when:

- SKU size does not exceed slot capacity;
- SKU weight does not exceed the slot maximum;
- SKU zone matches the slot zone, unless the slot is `any`.

## Classification

ABC uses cumulative pick activity. XYZ uses supplied demand coefficient of variation:

- X: CV ≤ 0.5
- Y: 0.5 < CV ≤ 1.0
- Z: CV > 1.0

## Slotting heuristic

SKUs are considered by descending pick activity. Each SKU takes the nearest unused compatible slot. This is deterministic and inspectable, but it is not guaranteed to find a globally optimal constrained assignment.

## Pick-list simulation

A seeded generator creates the same order contents for current and suggested layouts. Each order is routed by repeatedly visiting the nearest remaining pick and returning to the depot. Results are model outputs, not observed warehouse performance.
