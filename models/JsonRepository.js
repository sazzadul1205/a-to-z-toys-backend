import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { createBaseRepository } from "./BaseRepository.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Overridable so the test suite can work on a throwaway directory. Without this
// the tests share ./data with the running app, and `npm test` wipes the seeded
// catalogue and the admin account out from under the developer.
const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(__dirname, "..", "data");

async function ensureDir() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch (err) {
    if (err.code !== "EEXIST") throw err;
  }
}

function filePath(collection) {
  return path.join(DATA_DIR, `${collection}.json`);
}

async function readAll(collection) {
  await ensureDir();
  try {
    const raw = await fs.readFile(filePath(collection), "utf-8");
    return JSON.parse(raw || "[]");
  } catch (err) {
    if (err.code === "ENOENT") return [];
    throw err;
  }
}

async function writeAll(collection, records) {
  await ensureDir();
  const target = filePath(collection);
  const tmp = `${target}.tmp`;
  const data = JSON.stringify(records, null, 2);

  const handle = await fs.open(tmp, "w");
  try {
    await handle.writeFile(data);
    await handle.sync();
  } finally {
    await handle.close();
  }
  await fs.rename(tmp, target);
}

export function createJsonRepository(collectionName) {
  const base = createBaseRepository(collectionName);

  return {
    ...base,
    async findAll() {
      return readAll(collectionName);
    },
    async findById(id) {
      const records = await readAll(collectionName);
      return records.find((r) => String(r._id) === String(id)) || null;
    },
    async findOne(predicate) {
      const records = await readAll(collectionName);
      return records.find(predicate) || null;
    },
    async find(predicate) {
      const records = await readAll(collectionName);
      return records.filter(predicate);
    },
    async create(data) {
      const records = await readAll(collectionName);
      records.push(data);
      await writeAll(collectionName, records);
      return data;
    },
    async updateById(id, updates) {
      const records = await readAll(collectionName);
      const idx = records.findIndex((r) => String(r._id) === String(id));
      if (idx === -1) return null;
      records[idx] = { ...records[idx], ...updates };
      await writeAll(collectionName, records);
      return records[idx];
    },
    async deleteById(id) {
      const records = await readAll(collectionName);
      const next = records.filter((r) => String(r._id) !== String(id));
      if (next.length === records.length) return false;
      await writeAll(collectionName, next);
      return true;
    },
  };
}