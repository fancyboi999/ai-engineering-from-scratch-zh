import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
const execute = promisify(execFile);
const cli = path.join(process.env.PROJECT_WORKSPACE!, "cli.ts");
async function command(...args: string[]) {
  const result = await execute(process.execPath, ["--experimental-strip-types", cli, ...args]);
  return JSON.parse(result.stdout);
}
async function withStore(callback: (store: string, input: string) => Promise<void>) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "hooks-capture-"));
  try {
    await callback(path.join(root, "store.json"), path.join(root, "events.jsonl"));
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
}
async function writeEvents(input: string, events: object[]) {
  await fs.writeFile(input, events.map((event) => JSON.stringify(event)).join("\n"));
}
const events = ["a", "b"].map((id) => ({
  id,
  session: id,
  scope: "repo",
  rule: "Keep API_KEY uppercase",
  source: "Config reads API_KEY",
}));
test("CLI recaptures the original JSONL without duplicate support or changed digest", async () => {
  await withStore(async (store) => {
    const input = path.join(process.env.PROJECT_ROOT!, "examples", "corrections.jsonl");
    const first = await command("capture", store, input);
    const before = await fs.readFile(store, "utf8");
    assert.deepEqual(await command("capture", store, input), first);
    assert.equal(await fs.readFile(store, "utf8"), before);
    assert.deepEqual(first.rules[0].sourceIds, ["orchard-a", "orchard-b"]);
    assert.deepEqual(first.rules[0].sessions, ["review-a", "review-b"]);
  });
});
test("CLI recapture preserves approved and retired states with reordered properties", async () => {
  await withStore(async (store, input) => {
    const explicit = events.map((event) => ({ ...event, locator: "config.py:1" }));
    await writeEvents(input, explicit);
    const first = await command("capture", store, input);
    const digest = first.rules[0].approval_digest;
    await writeEvents(input, explicit.map((event) => Object.fromEntries(Object.entries(event).reverse())));
    for (const transition of ["approve", "retire"]) {
      const transitioned = await command(transition, store, digest);
      assert.equal(transitioned.rules[0].state, transition === "approve" ? "approved" : "retired");
      const before = await fs.readFile(store, "utf8");
      assert.deepEqual(await command("capture", store, input), transitioned);
      assert.equal(await fs.readFile(store, "utf8"), before);
      assert.equal(transitioned.rules[0].approval_digest, digest);
      assert.deepEqual(transitioned.rules[0].sourceIds, ["a", "b"]);
      assert.deepEqual(transitioned.rules[0].sessions, ["a", "b"]);
    }
  });
});
test("CLI treats omitted and explicit default locators alike across store reads", async () => {
  await withStore(async (store, input) => {
    await writeEvents(input, events);
    const first = await command("capture", store, input);
    const digest = first.rules[0].approval_digest;
    assert.deepEqual(await command("capture", store, input), first);
    const explicit = events.map((event) => ({
      ...event,
      locator: `session:${event.session}#${event.id}`,
    }));
    for (const transition of ["approve", "retire"]) {
      const transitioned = await command(transition, store, digest);
      assert.equal(transitioned.rules[0].state, transition === "approve" ? "approved" : "retired");
      await writeEvents(input, explicit);
      assert.deepEqual(await command("capture", store, input), transitioned);
      await writeEvents(input, events);
      assert.deepEqual(await command("capture", store, input), transitioned);
    }
  });
});
test("CLI rejects actual correction conflicts without modifying the approved store", async () => {
  await withStore(async (store, input) => {
    await writeEvents(input, events);
    const captured = await command("capture", store, input);
    await command("approve", store, captured.rules[0].approval_digest);
    const before = await fs.readFile(store, "utf8");
    for (const [field, value] of Object.entries({
      session: "another-session",
      scope: "another-scope",
      rule: "Keep api_key uppercase",
      source: "Changed evidence",
      locator: "config.py:2",
    })) {
      await writeEvents(input, [{ ...events[0], [field]: value }]);
      await assert.rejects(() => command("capture", store, input), /conflicting correction id/);
      assert.equal(await fs.readFile(store, "utf8"), before);
    }
  });
});
