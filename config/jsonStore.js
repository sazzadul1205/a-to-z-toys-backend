import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, "..", "data");

async function ensureDir() {
  try { await fs.mkdir(DATA_DIR, { recursive: true }); }
  catch (err) { if (err.code !== "EEXIST") throw err; }
}

function filePath(collection) {
  return path.join(DATA_DIR, `${collection}.json`);
}

export async function readAll(collection) {
  await ensureDir();
  try {
    const raw = await fs.readFile(filePath(collection), "utf-8");
    return JSON.parse(raw || "[]");
  } catch (err) {
    if (err.code === "ENOENT") return [];
    throw err;
  }
}

// Atomic + durable write: write to .tmp, fsync, rename over target
export async function writeAll(collection, records) {
  await ensureDir();
  const target = filePath(collection);
  const tmp = `${target}.tmp`;
  const data = JSON.stringify(records, null, 2);

  const handle = await fs.open(tmp, "w");
  try {
    await handle.writeFile(data);
    await handle.sync();       // force flush to disk
  } finally {
    await handle.close();
  }
  await fs.rename(tmp, target); // atomic on same volume
}

export async function insert(collection, record) {
  const records = await readAll(collection);
  records.push(record);
  await writeAll(collection, records);
  return record;
}

export async function find(collection, predicate = () => true) {
  const records = await readAll(collection);
  return records.filter(predicate);
}

export async function findOne(collection, predicate) {
  const records = await readAll(collection);
  return records.find(predicate) || null;
}

export async function updateById(collection, id, updates) {
  const records = await readAll(collection);
  const idx = records.findIndex((r) => r._id === id);
  if (idx === -1) return null;
  records[idx] = { ...records[idx], ...updates };
  await writeAll(collection, records);
  return records[idx];
}

export async function deleteById(collection, id) {
  const records = await readAll(collection);
  const next = records.filter((r) => r._id !== id);
  if (next.length === records.length) return false;
  await writeAll(collection, next);
  return true;
}