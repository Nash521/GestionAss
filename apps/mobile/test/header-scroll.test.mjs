import test from "node:test";
import assert from "node:assert/strict";
import { initialHeaderScrollState, nextHeaderScrollState } from "../src/components/header-scroll.ts";

test("slow downward movement hides the header after accumulating the threshold", () => {
  let state = initialHeaderScrollState();
  for (const offset of [3, 6, 9, 12, 15, 18, 21]) state = nextHeaderScrollState(state, offset);
  assert.equal(state.visible, false);
});

test("upward movement reveals the header and small jitter leaves it hidden", () => {
  let state = nextHeaderScrollState(initialHeaderScrollState(), 100);
  for (const offset of [98, 100, 98, 96]) state = nextHeaderScrollState(state, offset);
  assert.equal(state.visible, false);
  for (const offset of [93, 90, 87]) state = nextHeaderScrollState(state, offset);
  assert.equal(state.visible, true);
});

test("returning to the top or overscrolling always shows the header", () => {
  const hidden = nextHeaderScrollState(initialHeaderScrollState(), 100);
  assert.equal(nextHeaderScrollState(hidden, 5).visible, true);
  assert.deepEqual(nextHeaderScrollState(hidden, -20), initialHeaderScrollState());
});
