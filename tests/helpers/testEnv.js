import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { DATA_SOURCE, SQLITE_DB_PATH } from "../../config/dataSource.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Same directory the data layer uses under test (see tests/setupEnv.js), which
// is deliberately not the app's real ./data.
export const TEST_DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(__dirname, "..", "..", "data");

// Wipe the throwaway test data between tests. JSON collection files are always
// cleared (the JsonRepository tests use JSON storage directly regardless of
// DATA_SOURCE), and when running against SQLite the database file is also
// reset so each test starts from a clean, schema-less store.
export async function cleanData() {
  try {
    const files = await fs.readdir(TEST_DATA_DIR);
    await Promise.all(
      files
        .filter((f) => f.endsWith(".json") || f.endsWith(".tmp"))
        .map((f) => fs.unlink(path.join(TEST_DATA_DIR, f))),
    );
  } catch (err) {
    if (err.code !== "ENOENT") throw err;
  }

  if (DATA_SOURCE === "sqlite") {
    await cleanSqliteData();
  }
}

// For the SQLite engine the store is a single database file (plus WAL/SHM
// sidecars). The engine holds a module-level connection; close it first so the
// WAL is checkpointed. A file-backed path is then deleted so the next access
// lazily opens a fresh database (table DDL is recreated on demand by
// ensureTable()). An in-memory database has no file to remove, so only the
// connection is closed.
async function cleanSqliteData() {
  const { closeSqliteDb } = await import(
    "../../models/engines/sqliteRepository.js"
  );
  closeSqliteDb();

  if (SQLITE_DB_PATH === ":memory:") return;

  const candidates = [
    SQLITE_DB_PATH,
    `${SQLITE_DB_PATH}-wal`,
    `${SQLITE_DB_PATH}-shm`,
  ];
  await Promise.all(
    candidates.map((f) =>
      fs.unlink(f).catch((err) => {
        if (err.code !== "ENOENT") throw err;
      }),
    ),
  );
}

export function validUser(overrides = {}) {
  return {
    name: "Alice Doe",
    email: "alice@example.com",
    password: "secret123",
    role: "Customer",
    ...overrides,
  };
}

export function validCategory(overrides = {}) {
  return {
    name: "Board Games",
    description: "Classic board games",
    ...overrides,
  };
}

export function validProduct(categoryId, overrides = {}) {
  return {
    name: "Chess Set",
    description: "Wooden chess set",
    price: 29.99,
    buyPrice: 15.00,
    stock: 10,
    sku: "CHESS-SET-001",
    categoryId,
    image: "",
    details: {},
    ...overrides,
  };
}