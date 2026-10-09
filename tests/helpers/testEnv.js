import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Same directory the data layer uses under test (see tests/setupEnv.js), which
// is deliberately not the app's real ./data.
export const TEST_DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(__dirname, "..", "..", "data");

// Wipe the throwaway test data between tests.
export async function cleanData() {
  try {
    const files = await fs.readdir(TEST_DATA_DIR);
    await Promise.all(
      files
        .filter((f) => f.endsWith(".json") || f.endsWith(".tmp"))
        .map((f) => fs.unlink(path.join(TEST_DATA_DIR, f)))
    );
  } catch (err) {
    if (err.code !== "ENOENT") throw err;
  }
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