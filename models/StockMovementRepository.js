import { createRepository } from "./repositoryFactory.js";
import { validateAndBuild } from "../config/validate.js";
import StockMovement from "./StockMovement.js";

const base = createRepository("stockMovements", StockMovement);

async function createMovement(data) {
  const { valid, doc, errors } = await validateAndBuild(StockMovement, data);
  if (!valid) {
    const error = new Error("Validation failed");
    error.status = 400;
    error.errors = errors;
    throw error;
  }
  return base.create(doc);
}

async function getMovementsByProduct(productId, limit = 50) {
  return base.find((m) => String(m.productId) === String(productId)).then((list) =>
    list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, limit)
  );
}

async function getAllMovements(limit = 200) {
  return base.findAll().then((list) =>
    list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, limit)
  );
}

async function getMovementsByType(type, limit = 100) {
  return base.find((m) => m.type === type).then((list) =>
    list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, limit)
  );
}

export const stockMovementRepository = {
  ...base,
  createMovement,
  getMovementsByProduct,
  getAllMovements,
  getMovementsByType,
};