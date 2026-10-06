import { MYSQL_CONFIG } from "../../config/dataSource.js";
import { createBaseRepository } from "../BaseRepository.js";
import {
  schemaColumns,
  sqlTypeMysql,
  serializeValue,
  rowToRecord,
  coerceId,
  generateId,
} from "./adapter.js";

let pool = null;

export function resetMysqlPool() {
  pool = null;
}

export async function getMysqlPool() {
  if (pool) return pool;
  const { createPool } = await import("mysql2/promise");
  pool = createPool({ ...MYSQL_CONFIG, waitForConnections: true, connectionLimit: 10 });
  return pool;
}

export function createMysqlRepository(collectionName, model) {
  const base = createBaseRepository(collectionName);
  const columns = schemaColumns(model);

  const columnDdl = columns
    .map((c) => `\`${c.name}\` ${sqlTypeMysql(c.instance)}`)
    .join(", ");

  async function ensureTable() {
    const p = await getMysqlPool();
    const ddl =
      columns.length === 0
        ? `CREATE TABLE IF NOT EXISTS \`${collectionName}\` (_id VARCHAR(64) PRIMARY KEY)`
        : `CREATE TABLE IF NOT EXISTS \`${collectionName}\` (_id VARCHAR(64) PRIMARY KEY, ${columnDdl})`;
    await p.query(ddl);
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
      const p = await getMysqlPool();
      const [rows] = await p.query(`SELECT * FROM \`${collectionName}\``);
      return rows.map((r) => rowToRecord(r, columns));
    },
    async findById(id) {
      await ensureTable();
      const p = await getMysqlPool();
      const [rows] = await p.query(
        `SELECT * FROM \`${collectionName}\` WHERE _id = ?`,
        [coerceId(id)],
      );
      const r = rows[0];
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
      const p = await getMysqlPool();
      const row = toRow(data);
      const cols = colNames.map((c) => `\`${c}\``).join(", ");
      const placeholders = colNames.map(() => "?").join(", ");
      const vals = colNames.map((c) => (c === "_id" ? row._id : row[c]));
      await p.query(
        `INSERT INTO \`${collectionName}\` (${cols}) VALUES (${placeholders})`,
        vals,
      );
      return rowToRecord(row, columns);
    },
    async updateById(id, updates) {
      await ensureTable();
      const existing = await this.findById(id);
      if (!existing) return null;
      const merged = { ...existing, ...updates, _id: existing._id };
      const row = toRow(merged);
      const setClause = columns.map((c) => `\`${c.name}\` = ?`).join(", ");
      const p = await getMysqlPool();
      await p.query(
        `UPDATE \`${collectionName}\` SET ${setClause} WHERE _id = ?`,
        [...columns.map((c) => row[c.name]), row._id],
      );
      return rowToRecord(row, columns);
    },
    async deleteById(id) {
      await ensureTable();
      const p = await getMysqlPool();
      const [res] = await p.query(
        `DELETE FROM \`${collectionName}\` WHERE _id = ?`,
        [coerceId(id)],
      );
      return res.affectedRows > 0;
    },
  };
}
