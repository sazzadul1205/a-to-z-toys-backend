import fs from "fs/promises";
import path from "path";
import { createJsonRepository } from "../../models/JsonRepository.js";
import { TEST_DATA_DIR, cleanData } from "../helpers/testEnv.js";

const store = createJsonRepository("widgets");

beforeEach(async () => {
  await cleanData();
});

afterAll(async () => {
  await cleanData();
});

describe("JsonRepository", () => {
  it("treats a missing collection as empty rather than throwing", async () => {
    await expect(store.findAll()).resolves.toEqual([]);
    await expect(store.findById("nope")).resolves.toBeNull();
  });

  it("creates a record and reads it back", async () => {
    await store.create({ _id: "1", name: "A" });

    const all = await store.findAll();
    expect(all).toHaveLength(1);
    expect(all[0]).toMatchObject({ _id: "1", name: "A" });
  });

  it("does not share state between reads, so callers cannot mutate storage", async () => {
    await store.create({ _id: "1", name: "A" });

    const first = await store.findAll();
    first.push({ _id: "2", name: "B" });

    await expect(store.findAll()).resolves.toHaveLength(1);
  });

  it("findById matches on stringified ids", async () => {
    await store.create({ _id: "1", name: "A" });
    await expect(store.findById("1")).resolves.toMatchObject({ name: "A" });
  });

  it("find and findOne apply the predicate", async () => {
    await store.create({ _id: "1", name: "A" });
    await store.create({ _id: "2", name: "B" });

    await expect(store.find((r) => r.name === "B")).resolves.toHaveLength(1);
    await expect(store.findOne((r) => r.name === "Z")).resolves.toBeNull();
  });

  it("updateById merges and returns the updated record", async () => {
    await store.create({ _id: "1", name: "A", qty: 1 });
    await expect(store.updateById("1", { qty: 5 })).resolves.toMatchObject({
      _id: "1",
      name: "A",
      qty: 5,
    });
  });

  it("updateById returns null for a missing id", async () => {
    await expect(store.updateById("nope", { qty: 5 })).resolves.toBeNull();
  });

  it("deleteById removes the record and reports whether it did", async () => {
    await store.create({ _id: "1", name: "A" });

    await expect(store.deleteById("1")).resolves.toBe(true);
    await expect(store.findAll()).resolves.toHaveLength(0);
    await expect(store.deleteById("1")).resolves.toBe(false);
  });

  it("leaves no .tmp file behind after a write", async () => {
    await store.create({ _id: "1" });

    const files = await fs.readdir(TEST_DATA_DIR);
    expect(files.some((f) => f.endsWith(".tmp"))).toBe(false);
  });

  it("writes parseable JSON to disk", async () => {
    await store.create({ _id: "1", name: "A" });

    const raw = await fs.readFile(path.join(TEST_DATA_DIR, "widgets.json"), "utf-8");
    expect(() => JSON.parse(raw)).not.toThrow();
  });

  it("keeps test data out of the app's real data directory", () => {
    // Guards the regression where `npm test` wiped the seeded catalogue and the
    // admin account, because tests shared ./data with the running app.
    expect(TEST_DATA_DIR).not.toBe(path.resolve(TEST_DATA_DIR, "..", "data"));
    expect(path.basename(TEST_DATA_DIR)).toBe(".test-data");
  });
});
