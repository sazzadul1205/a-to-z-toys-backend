import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const TEST_DATA_DIR = path.join(__dirname, "..", "..", "data");

// Clean data directory between tests
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

// Seed helpers
export async function seedCategory(name = "Test Category") {
  const res = await fetch("http://localhost:0"); // placeholder — real seeding via store
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
    stock: 10,
    categoryId,
    image: "",
    details: {},
    ...overrides,
  };
}