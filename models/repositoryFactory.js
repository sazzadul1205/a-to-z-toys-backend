import { DATA_SOURCE } from "../config/dataSource.js";
import { createJsonRepository } from "./JsonRepository.js";
import { createSqliteRepository } from "./engines/sqliteRepository.js";
import { createMysqlRepository } from "./engines/mysqlRepository.js";
import Category from "./Category.js";
import Product from "./Product.js";
import Review from "./Review.js";
import Order from "./Order.js";
import User from "./User.js";
import Settings from "./Settings.js";

export const dataSource = DATA_SOURCE;

export const REGISTRY = [
  ["categories", Category],
  ["products", Product],
  ["reviews", Review],
  ["orders", Order],
  ["users", User],
  ["settings", Settings],
];

export function createRepository(collectionName, model) {
  switch (DATA_SOURCE) {
    case "sqlite":
      return createSqliteRepository(collectionName, model);
    case "mysql":
      return createMysqlRepository(collectionName, model);
    default:
      return createJsonRepository(collectionName, model);
  }
}

export async function ensureSchema() {
  if (DATA_SOURCE === "json") return;
  for (const [name, model] of REGISTRY) {
    const repo = createRepository(name, model);
    if (typeof repo.ensureSchema === "function") {
      await repo.ensureSchema();
    }
  }
}
