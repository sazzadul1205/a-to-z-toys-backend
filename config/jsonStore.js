import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// All JSON "collections" live in /data
const DATA_DIR = path.join(__dirname, "..", "data");

// Make sure the data folder exists
async function ensureDir() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch (err) {
    if (err.code !== "EEXIST") throw err;
  }
}

// Path to a collection file, e.g. "toys" -> data/toys.json
function filePath(collection) {
  return path.join(DATA_DIR, `${collection}.json`);
}

// Read all records from a collection
export async function readAll(collection) {
  await ensureDir();
  try {
    const raw = await fs.readFile(filePath(collection), "utf-8");
    return JSON.parse(raw || "[]");
  } catch (err) {
    if (err.code === "ENOENT") return []; // file doesn't exist yet
    throw err;
  }
}

// Overwrite a collection with the given array
export async function writeAll(collection, records) {
  await ensureDir();
  await fs.writeFile(filePath(collection), JSON.stringify(records, null, 2));
}

// Append one record
export async function insert(collection, record) {
  const records = await readAll(collection);
  records.push(record);
  await writeAll(collection, records);
  return record;
}

// Find records matching a predicate
export async function find(collection, predicate = () => true) {
  const records = await readAll(collection);
  return records.filter(predicate);
}

// Find a single record
export async function findOne(collection, predicate) {
  const records = await readAll(collection);
  return records.find(predicate) || null;
}

// Update a record by id, returns updated record or null
export async function updateById(collection, id, updates) {
  const records = await readAll(collection);
  const idx = records.findIndex((r) => r._id === id);
  if (idx === -1) return null;
  records[idx] = { ...records[idx], ...updates };
  await writeAll(collection, records);
  return records[idx];
}

// Delete a record by id, returns true/false
export async function deleteById(collection, id) {
  const records = await readAll(collection);
  const next = records.filter((r) => r._id !== id);
  if (next.length === records.length) return false;
  await writeAll(collection, next);
  return true;
}