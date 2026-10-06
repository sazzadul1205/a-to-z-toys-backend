import { SQLITE_DB_PATH } from "../../config/dataSource.js";
import { createBaseRepository } from "../BaseRepository.js";
import {
  schemaColumns,
  sqlType,
  serializeValue,
  rowToRecord,
  coerceId,
  generateId,
} from "./adapter.js";

let db = null;
let sqlitePath = SQLITE_DB_PATH;

export function setSqlitePath(p) {
  if (db) {
    try { db.close(); } catch { /* already closed */ }
    db = null;
  }
  sqlitePath = p;
}

export function resetSqliteConnection() {
  if (db) {
    try { db.close(); } catch { /* already closed */ }
    db = null;
  }
}

export function closeSqliteDb() {
  resetSqliteConnection();
}

export async function getSqliteDb() {
  if (db) return db;
  const betterSqlite3 = (await import("better-sqlite3")).default;
  db = new betterSqlite3(sqlitePath);
  if (sqlitePath !== ":memory:") {
    db.pragma("journal_mode = WAL");
  }
  return db;
}

export function createSqliteRepository(collectionName, model) {
  const base = createBaseRepository(collectionName);
  const columns = schemaColumns(model);

  const columnDdl = columns
    .map((c) => `"${c.name}" ${sqlType(c.instance)}`)
    .join(", ");

  async function ensureTable() {
    const d = await getSqliteDb();
    const ddl =
      columns.length === 0
        ? `CREATE TABLE IF NOT EXISTS "${collectionName}" (_id TEXT PRIMARY KEY)`
        : `CREATE TABLE IF NOT EXISTS "${collectionName}" (_id TEXT PRIMARY KEY, ${columnDdl})`;
    d.exec(ddl);
  }

  function toRow(data) {
    const row = { _id: coerceId(data && data._id) || generateId() };
    for (const c of columns) {
      row[c.name] = serializeValue(data && data[c.name], c.instance);
    }
    return row;
  }

  const colNames = ["_id", ...columns.map((c) => c.name)];

  return {
    ...base,
    collectionName,
    async ensureSchema() {
      await ensureTable();
    },
    async findAll() {
      await ensureTable();
      const d = await getSqliteDb();
      const rows = d.prepare(`SELECT * FROM "${collectionName}"`).all();
      return rows.map((r) => rowToRecord(r, columns));
    },
    async findById(id) {
      await ensureTable();
      const d = await getSqliteDb();
      const r = d
        .prepare(`SELECT * FROM "${collectionName}" WHERE _id = ?`)
        .get(coerceId(id));
      return r ? rowToRecord(r, columns) : null;
    },
    async findOne(predicate) {
      const all = await this.findAll();
      return all.find(predicate) || null;
    },
    async find(predicate) {
      const all = await this.findAll();
      return all.filter(predicate);
    },
    async create(data) {
      await ensureTable();
      const d = await getSqliteDb();
      const row = toRow(data);
      const cols = colNames.map((c) => `"${c}"`).join(", ");
      const placeholders = colNames.map(() => "?").join(", ");
      const vals = colNames.map((c) => (c === "_id" ? row._id : row[c]));
      d.prepare(
        `INSERT INTO "${collectionName}" (${cols}) VALUES (${placeholders})`,
      ).run(...vals);
      return rowToRecord(row, columns);
    },
    async updateById(id, updates) {
      await ensureTable();
      const existing = await this.findById(id);
      if (!existing) return null;
      const merged = { ...existing, ...updates, _id: existing._id };
      const row = toRow(merged);
      const setClause = columns
        .map((c) => `"${c.name}" = ?`)
        .join(", ");
      const d = await getSqliteDb();
      d.prepare(
        `UPDATE "${collectionName}" SET ${setClause} WHERE _id = ?`,
      ).run(
        ...columns.map((c) => row[c.name]),
        row._id,
      );
      return rowToRecord(row, columns);
    },
    async deleteById(id) {
      await ensureTable();
      const d = await getSqliteDb();
      const r = d
        .prepare(`DELETE FROM "${collectionName}" WHERE _id = ?`)
        .run(coerceId(id));
      return r.changes > 0;
    },
  };
}
