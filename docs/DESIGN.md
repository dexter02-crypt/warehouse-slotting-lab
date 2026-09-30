# Design notes

warehouse-slotting-lab separates deterministic core logic in `src/core.js` from DOM rendering in `src/app.js`.

Core functions are imported directly by Node's built-in test runner. The browser layer does not change the input semantics used by the tests.
