import fs from "fs/promises";
import path from "path";
import * as store from "../../config/jsonStore.js";
import { TEST_DATA_DIR, cleanData } from "../helpers/testEnv.js";

beforeEach(async () => {
  await cleanData();
});

afterAll(async () => {
  await cleanData();
});

describe("jsonStore", () => {
  it("readAll returns [] when file doesn't exist", async () => {
    const records = await store.readAll("missing");
    expect(records).toEqual([]);
  });

  it("insert persists a record and readAll retrieves it", async () => {
    await store.insert("items", { _id: "1", name: "A" });
    const all = await store.readAll("items");
    expect(all).toHaveLength(1);
    expect(all[0]).toMatchObject({ _id: "1", name: "A" });
  });

  it("find filters records by predicate", async () => {
    await store.insert("items", { _id: "1", name: "A" });
    await store.insert("items", { _id: "2", name: "B" });
    const found = await store.find("items", (r) => r.name === "B");
    expect(found).toHaveLength(1);
    expect(found[0]._id).toBe("2");
  });

  it("findOne returns null when nothing matches", async () => {
    await store.insert("items", { _id: "1", name: "A" });
    const rec = await store.findOne("items", (r) => r.name === "Z");
    expect(rec).toBeNull();
  });

  it("updateById merges updates", async () => {
    await store.insert("items", { _id: "1", name: "A", qty: 1 });
    const updated = await store.updateById("items", "1", { qty: 5 });
    expect(updated).toMatchObject({ _id: "1", name: "A", qty: 5 });
  });

  it("updateById returns null for missing id", async () => {
    const updated = await store.updateById("items", "nope", { qty: 5 });
    expect(updated).toBeNull();
  });

  it("deleteById removes record and returns true", async () => {
    await store.insert("items", { _id: "1", name: "A" });
    const ok = await store.deleteById("items", "1");
    expect(ok).toBe(true);
    const all = await store.readAll("items");
    expect(all).toHaveLength(0);
  });

  it("deleteById returns false for missing id", async () => {
    const ok = await store.deleteById("items", "nope");
    expect(ok).toBe(false);
  });

  it("writeAll is atomic (no .tmp leftover)", async () => {
    await store.writeAll("items", [{ _id: "1" }]);
    const files = await fs.readdir(TEST_DATA_DIR);
    expect(files.some((f) => f.endsWith(".tmp"))).toBe(false);
  });

  it("persists valid JSON to disk", async () => {
    await store.insert("items", { _id: "1", name: "A" });
    const raw = await fs.readFile(path.join(TEST_DATA_DIR, "items.json"), "utf-8");
    expect(() => JSON.parse(raw)).not.toThrow();
  });
});