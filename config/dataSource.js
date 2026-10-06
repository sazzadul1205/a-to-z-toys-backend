import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

export const DATA_SOURCE = (process.env.DATA_SOURCE || "json").toLowerCase();

export const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(ROOT, "data");

export const SQLITE_DB_PATH =
  process.env.DB_SQLITE_PATH || path.join(DATA_DIR, "sqlite.db");

export const DB_SYNC = process.env.DB_SYNC !== "false";

export const MYSQL_CONFIG = {
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "a_to_z_kids_world",
};
