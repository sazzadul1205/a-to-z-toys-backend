import mongoose from "mongoose";
import {
  closeSqliteDb,
  setSqlitePath,
  createSqliteRepository,
} from "../../models/engines/sqliteRepository.js";

const WidgetSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  qty: { type: Number, default: 0 },
  active: { type: Boolean, default: true },
  meta: { type: mongoose.Schema.Types.Mixed, default: {} },
  categoryId: { type: mongoose.Schema.Types.ObjectId, required: true },
  createdAt: { type: Date, default: Date.now },
});
const Widget = mongoose.model("SqliteWidget", WidgetSchema);

beforeEach(async () => {
  await closeSqliteDb();
  setSqlitePath(":memory:");
});

afterAll(async () => {
  await closeSqliteDb();
});

function makeRepo() {
  return createSqliteRepository("widgets", Widget);
}

describe("SqliteRepository (engine parity with the BaseRepository contract)", () => {
  it("treats an empty table as [] and a missing id as null", async () => {
    const repo = makeRepo();
    await expect(repo.findAll()).resolves.toEqual([]);
    await expect(repo.findById("nope")).resolves.toBeNull();
  });

  it("round-trips records with schema-derived columns", async () => {
    const repo = makeRepo();
    const created = await repo.create({
      name: "A",
      qty: 3,
      active: false,
      meta: { color: "red", tags: ["a", "b"] },
      categoryId: "507f1f77bcf86cd799439011",
      createdAt: new Date("2020-01-02T00:00:00.000Z"),
    });

    expect(typeof created._id).toBe("string");
    expect(created.name).toBe("A");
    expect(created.qty).toBe(3);
    expect(created.active).toBe(false);
    expect(created.meta).toEqual({ color: "red", tags: ["a", "b"] });
    expect(created.categoryId).toBe("507f1f77bcf86cd799439011");
    expect(created.createdAt).toBe("2020-01-02T00:00:00.000Z");

    const byId = await repo.findById(created._id);
    expect(byId).toMatchObject({ name: "A", qty: 3, active: false });
    expect(byId.meta).toEqual({ color: "red", tags: ["a", "b"] });
    expect(byId.createdAt).toBe("2020-01-02T00:00:00.000Z");
  });

  it("find, findOne and exists apply the predicate", async () => {
    const repo = makeRepo();
    await repo.create({ name: "A", qty: 1, categoryId: "cat", active: true, createdAt: new Date(0), meta: {} });
    await repo.create({ name: "B", qty: 2, categoryId: "cat", active: false, createdAt: new Date(0), meta: {} });

    expect(await repo.find((r) => r.name === "A")).toHaveLength(1);
    expect(await repo.findOne((r) => r.name === "Z")).toBeNull();
    expect(await repo.exists((r) => r.name === "A")).toBe(true);
    expect(await repo.exists((r) => r.name === "Z")).toBe(false);
  });

  it("updateById merges and returns null when missing", async () => {
    const repo = makeRepo();
    const created = await repo.create({ name: "A", qty: 1, categoryId: "cat", active: true, createdAt: new Date(0), meta: {} });
    const updated = await repo.updateById(created._id, { qty: 9 });
    expect(updated.qty).toBe(9);
    expect(updated.name).toBe("A");
    expect(await repo.findById(created._id)).toMatchObject({ qty: 9 });
    await expect(repo.updateById("missing", { qty: 1 })).resolves.toBeNull();
  });

  it("deleteById removes and reports whether it did", async () => {
    const repo = makeRepo();
    const created = await repo.create({ name: "A", qty: 1, categoryId: "cat", active: true, createdAt: new Date(0), meta: {} });
    expect(await repo.deleteById(created._id)).toBe(true);
    expect(await repo.findAll()).toHaveLength(0);
    expect(await repo.deleteById(created._id)).toBe(false);
  });

  it("does not share mutable state between reads", async () => {
    const repo = makeRepo();
    await repo.create({ name: "A", qty: 1, categoryId: "cat", active: true, createdAt: new Date(0), meta: {} });
    const all = await repo.findAll();
    all.push({ _id: "leaked" });
    await expect(repo.findAll()).resolves.toHaveLength(1);
  });
});
