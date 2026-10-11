import { createRepository } from "./repositoryFactory.js";
import { validateAndBuild } from "../config/validate.js";
import ExpenseCategory from "./ExpenseCategory.js";

const base = createRepository("expenseCategories", ExpenseCategory);

async function createExpenseCategory(data) {
  const name = (data.name || "").trim();

  const exists = await base.findOne(
    (c) => c.name.toLowerCase() === name.toLowerCase(),
  );
  if (exists) {
    const error = new Error("Expense category name already exists");
    error.status = 409;
    throw error;
  }

  const { valid, doc, errors } = await validateAndBuild(ExpenseCategory, { ...data, name });
  if (!valid) {
    const error = new Error("Validation failed");
    error.status = 400;
    error.errors = errors;
    throw error;
  }

  return base.create(doc);
}

async function updateExpenseCategory(id, data) {
  const existing = await base.findById(id);
  if (!existing) {
    const error = new Error("Expense category not found");
    error.status = 404;
    throw error;
  }

  if (
    data.name &&
    data.name.toLowerCase() !== existing.name.toLowerCase()
  ) {
    const dup = await base.findOne(
      (c) => c.name.toLowerCase() === data.name.toLowerCase(),
    );
    if (dup) {
      const error = new Error("Expense category name already exists");
      error.status = 409;
      throw error;
    }
  }

  const merged = {
    ...existing,
    ...data,
    _id: existing._id,
    createdAt: existing.createdAt,
    updatedAt: new Date(),
  };

  const { valid, doc, errors } = await validateAndBuild(ExpenseCategory, merged);
  if (!valid) {
    const error = new Error("Validation failed");
    error.status = 400;
    error.errors = errors;
    throw error;
  }

  return base.updateById(existing._id, doc);
}

async function deleteExpenseCategory(id) {
  const existing = await base.findById(id);
  if (!existing) {
    const error = new Error("Expense category not found");
    error.status = 404;
    throw error;
  }

  // Check if category is used by any expenses
  const { expenseRepository } = await import("./index.js");
  const expenses = await expenseRepository.find({ categoryId: existing._id });
  if (expenses.length > 0) {
    const error = new Error("Cannot delete category: it has associated expenses");
    error.status = 409;
    throw error;
  }

  return base.deleteById(existing._id);
}

export const expenseCategoryRepository = {
  ...base,
  createExpenseCategory,
  updateExpenseCategory,
  deleteExpenseCategory,
};