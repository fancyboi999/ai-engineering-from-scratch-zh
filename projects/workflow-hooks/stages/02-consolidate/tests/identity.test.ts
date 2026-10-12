import test from "node:test";
import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import path from "node:path";
const m = await import(
  pathToFileURL(path.join(process.env.PROJECT_WORKSPACE!, "main.ts")).href
);
const correction = {
  id: "a",
  session: "s1",
  scope: "repo",
  rule: "Keep API_KEY uppercase",
  source: "Config reads API_KEY",
};
test("correction identity ignores property insertion order", () => {
  const reordered = Object.fromEntries(Object.entries(correction).reverse());
  assert.deepEqual(m.consolidate([correction, reordered]), m.consolidate([correction]));
});
test("omitted locator and its explicit default identify the same correction", () => {
  const explicit = { ...correction, locator: "session:s1#a" };
  assert.deepEqual(m.consolidate([correction, explicit]), m.consolidate([explicit]));
});
for (const [field, value] of Object.entries({
  session: "s2",
  scope: "other",
  rule: "Keep api_key uppercase",
  source: "Different source evidence",
  locator: "config.py:2",
})) {
  test(`changed ${field} still conflicts with an existing correction id`, () => {
    assert.throws(
      () => m.consolidate([correction, { ...correction, [field]: value }]),
      /conflicting correction id/,
    );
  });
}
