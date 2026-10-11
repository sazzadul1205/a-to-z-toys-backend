import { createRepository } from "./repositoryFactory.js";
import { validateAndBuild } from "../config/validate.js";
import Expense from "./Expense.js";

const base = createRepository("expenses", Expense);

async function createExpense(data) {
  const { valid, doc, errors } = await validateAndBuild(Expense, data);
  if (!valid) {
    const error = new Error("Validation failed");
    error.status = 400;
    error.errors = errors;
    throw error;
  }
  return base.create(doc);
}

async function updateExpense(id, data) {
  const existing = await base.findById(id);
  if (!existing) {
    const error = new Error("Expense not found");
    error.status = 404;
    throw error;
  }

  const merged = {
    ...existing,
    ...data,
    _id: existing._id,
    createdAt: existing.createdAt,
    updatedAt: new Date(),
  };

  const { valid, doc, errors } = await validateAndBuild(Expense, merged);
  if (!valid) {
    const error = new Error("Validation failed");
    error.status = 400;
    error.errors = errors;
    throw error;
  }

  return base.updateById(existing._id, doc);
}

async function deleteExpense(id) {
  const existing = await base.findById(id);
  if (!existing) {
    const error = new Error("Expense not found");
    error.status = 404;
    throw error;
  }
  return base.deleteById(existing._id);
}

async function getExpensesByCategory(categoryId) {
  return base.find({ categoryId });
}

async function getExpensesByDateRange(startDate, endDate) {
  return base.find((e) => {
    const expenseDate = new Date(e.date);
    return expenseDate >= startDate && expenseDate <= endDate;
  });
}

async function getExpensesByDateRangeAndCategory(categoryId, startDate, endDate) {
  return base.find((e) => {
    const expenseDate = new Date(e.date);
    return (
      String(e.categoryId) === String(categoryId) &&
      expenseDate >= startDate &&
      expenseDate <= endDate
    );
  });
}

async function getTotalExpensesByCategory(startDate, endDate) {
  const expenses = await getExpensesByDateRange(startDate, endDate);
  const summary = {};
  for (const expense of expenses) {
    const catId = String(expense.categoryId);
    if (!summary[catId]) {
      summary[catId] = { total: 0, count: 0 };
    }
    summary[catId].total += expense.amount;
    summary[catId].count += 1;
  }
  return summary;
}

async function getTotalExpensesByPaymentMethod(startDate, endDate) {
  const expenses = await getExpensesByDateRange(startDate, endDate);
  const summary = {};
  for (const expense of expenses) {
    const method = expense.paymentMethod || "unknown";
    if (!summary[method]) {
      summary[method] = { total: 0, count: 0 };
    }
    summary[method].total += expense.amount;
    summary[method].count += 1;
  }
  return summary;
}

async function getExpensesSummary(startDate, endDate) {
  const expenses = await getExpensesByDateRange(startDate, endDate);
  const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0);
  const totalCount = expenses.length;
  const byCategory = await getTotalExpensesByCategory(startDate, endDate);
  const byPaymentMethod = await getTotalExpensesByPaymentMethod(startDate, endDate);

  // Daily breakdown for charts
  const daily = {};
  for (const expense of expenses) {
    const day = new Date(expense.date).toISOString().split("T")[0];
    if (!daily[day]) {
      daily[day] = { total: 0, count: 0 };
    }
    daily[day].total += expense.amount;
    daily[day].count += 1;
  }

  // Monthly breakdown
  const monthly = {};
  for (const expense of expenses) {
    const month = new Date(expense.date).toISOString().slice(0, 7); // YYYY-MM
    if (!monthly[month]) {
      monthly[month] = { total: 0, count: 0 };
    }
    monthly[month].total += expense.amount;
    monthly[month].count += 1;
  }

  return {
    totalAmount,
    totalCount,
    averageAmount: totalCount > 0 ? totalAmount / totalCount : 0,
    byCategory,
    byPaymentMethod,
    daily: Object.entries(daily)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, data]) => ({ date, ...data })),
    monthly: Object.entries(monthly)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({ month, ...data })),
  };
}

export const expenseRepository = {
  ...base,
  createExpense,
  updateExpense,
  deleteExpense,
  getExpensesByCategory,
  getExpensesByDateRange,
  getExpensesByDateRangeAndCategory,
  getTotalExpensesByCategory,
  getTotalExpensesByPaymentMethod,
  getExpensesSummary,
};