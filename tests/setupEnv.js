import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Runs before the test framework and before any test file is imported, so this
// is in place before models/JsonRepository.js is evaluated and captures
// DATA_DIR. Tests then read and write here instead of the real ./data.
process.env.DATA_DIR = path.join(__dirname, "..", ".test-data");
process.env.LOG_LEVEL = "error";

// SQLite tests run against an in-memory database for full isolation between
// test files. Jest gives each test file its own module registry, so a file-
// backed SQLite database opened at app boot (ensureSchema) would be left
// locked by a connection Jest never closes on registry teardown, surfacing as
// EBUSY when the next file's cleanData() tries to unlink it. An in-memory
// database has no file to lock; table DDL is recreated on demand by
// ensureTable(), so each test still starts from a clean store.
if (
  (process.env.DATA_SOURCE || "").toLowerCase() === "sqlite" &&
  !process.env.DB_SQLITE_PATH
) {
  process.env.DB_SQLITE_PATH = ":memory:";
}
