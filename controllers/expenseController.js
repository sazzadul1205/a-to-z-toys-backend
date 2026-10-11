import { expenseRepository, expenseCategoryRepository } from "../models/index.js";

export async function listExpenses(req, res) {
  try {
    const { categoryId, startDate, endDate, page = 1, limit = 20, sort = "date", order = "desc" } = req.query;
    let expenses;

    if (categoryId && startDate && endDate) {
      expenses = await expenseRepository.getExpensesByDateRangeAndCategory(categoryId, new Date(startDate), new Date(endDate));
    } else if (categoryId) {
      expenses = await expenseRepository.getExpensesByCategory(categoryId);
    } else if (startDate && endDate) {
      expenses = await expenseRepository.getExpensesByDateRange(new Date(startDate), new Date(endDate));
    } else {
      expenses = await expenseRepository.findAll();
    }

    const sortFn = (a, b) => {
      let valA = a[sort];
      let valB = b[sort];
      if (sort === "date" || valA instanceof Date) {
        valA = new Date(valA).getTime();
        valB = new Date(valB).getTime();
      } else if (typeof valA === "string") {
        valA = valA.toLowerCase();
        valB = valB.toLowerCase();
      }
      if (valA < valB) return order === "asc" ? -1 : 1;
      if (valA > valB) return order === "asc" ? 1 : -1;
      return 0;
    };
    expenses.sort(sortFn);

    const total = expenses.length;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const start = (pageNum - 1) * limitNum;
    const paginated = expenses.slice(start, start + limitNum);

    // Enrich with category names
    const categories = await expenseCategoryRepository.findAll();
    const categoryMap = new Map(categories.map((c) => [String(c._id), c.name]));
    const enriched = paginated.map((e) => ({
      ...e,
      categoryName: categoryMap.get(String(e.categoryId)) || "Unknown",
    }));

    res.json({
      expenses: enriched,
      pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function getExpense(req, res) {
  try {
    const expense = await expenseRepository.findById(req.params.id);
    if (!expense) return res.status(404).json({ error: "Expense not found" });
    const category = await expenseCategoryRepository.findById(expense.categoryId);
    res.json({ ...expense, categoryName: category?.name || "Unknown" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function createExpense(req, res) {
  try {
    // Verify category exists
    const category = await expenseCategoryRepository.findById(req.body.categoryId);
    if (!category) {
      return res.status(400).json({ error: "Invalid expense category" });
    }
    const expense = await expenseRepository.createExpense(req.body);
    res.status(201).json({ ...expense, categoryName: category.name });
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json(
      err.errors ? { errors: err.errors } : { error: err.message },
    );
  }
}

export async function updateExpense(req, res) {
  try {
    if (req.body.categoryId) {
      const category = await expenseCategoryRepository.findById(req.body.categoryId);
      if (!category) {
        return res.status(400).json({ error: "Invalid expense category" });
      }
    }
    const updated = await expenseRepository.updateExpense(req.params.id, req.body);
    const category = await expenseCategoryRepository.findById(updated.categoryId);
    res.json({ ...updated, categoryName: category?.name || "Unknown" });
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json(
      err.errors ? { errors: err.errors } : { error: err.message },
    );
  }
}

export async function deleteExpense(req, res) {
  try {
    await expenseRepository.deleteExpense(req.params.id);
    res.json({ success: true });
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ error: err.message });
  }
}

export async function bulkDeleteExpenses(req, res) {
  try {
    const ids = req.body?.ids || req.body?.id;
    if (!ids) return res.status(400).json({ error: "ids is required" });
    const idArray = Array.isArray(ids) ? ids : [ids];
    let removed = 0;
    for (const id of idArray) {
      try {
        await expenseRepository.deleteExpense(id);
        removed++;
      } catch (e) {
        // Skip non-existent
      }
    }
    res.json({ success: true, removed });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ===== ANALYTICS / GRAPHS ENDPOINTS =====

export async function getExpenseSummary(req, res) {
  try {
    const { startDate, endDate } = req.query;
    const start = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const end = endDate ? new Date(endDate) : new Date();
    end.setHours(23, 59, 59, 999);

    const summary = await expenseRepository.getExpensesSummary(start, end);

    // Enrich category names
    const categories = await expenseCategoryRepository.findAll();
    const categoryMap = new Map(categories.map((c) => [String(c._id), { name: c.name, color: c.color, icon: c.icon }]));

    const byCategoryEnriched = {};
    for (const [catId, data] of Object.entries(summary.byCategory)) {
      const cat = categoryMap.get(catId);
      byCategoryEnriched[catId] = {
        ...data,
        categoryName: cat?.name || "Unknown",
        categoryColor: cat?.color || "#6366f1",
        categoryIcon: cat?.icon || "",
      };
    }

    res.json({
      ...summary,
      byCategory: byCategoryEnriched,
      period: { startDate: start.toISOString().split("T")[0], endDate: end.toISOString().split("T")[0] },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function getExpenseTrends(req, res) {
  try {
    const { startDate, endDate, interval = "daily" } = req.query; // daily, weekly, monthly
    const start = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), 0, 1);
    const end = endDate ? new Date(endDate) : new Date();
    end.setHours(23, 59, 59, 999);

    const expenses = await expenseRepository.getExpensesByDateRange(start, end);

    const grouped = {};
    for (const expense of expenses) {
      const date = new Date(expense.date);
      let key;
      if (interval === "weekly") {
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        key = weekStart.toISOString().split("T")[0];
      } else if (interval === "monthly") {
        key = date.toISOString().slice(0, 7); // YYYY-MM
      } else {
        key = date.toISOString().split("T")[0];
      }
      if (!grouped[key]) {
        grouped[key] = { total: 0, count: 0, byCategory: {} };
      }
      grouped[key].total += expense.amount;
      grouped[key].count += 1;
      const catId = String(expense.categoryId);
      grouped[key].byCategory[catId] = (grouped[key].byCategory[catId] || 0) + expense.amount;
    }

    const categories = await expenseCategoryRepository.findAll();
    const categoryMap = new Map(categories.map((c) => [String(c._id), { name: c.name, color: c.color }]));

    const result = Object.entries(grouped)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([period, data]) => ({
        period,
        ...data,
        byCategory: Object.entries(data.byCategory).map(([catId, amount]) => ({
          categoryId: catId,
          categoryName: categoryMap.get(catId)?.name || "Unknown",
          categoryColor: categoryMap.get(catId)?.color || "#6366f1",
          amount,
        })),
      }));

    res.json({ trends: result, interval, period: { startDate: start.toISOString().split("T")[0], endDate: end.toISOString().split("T")[0] } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function getExpenseByCategory(req, res) {
  try {
    const { startDate, endDate } = req.query;
    const start = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const end = endDate ? new Date(endDate) : new Date();
    end.setHours(23, 59, 59, 999);

    const byCategory = await expenseRepository.getTotalExpensesByCategory(start, end);
    const byPaymentMethod = await expenseRepository.getTotalExpensesByPaymentMethod(start, end);

    const categories = await expenseCategoryRepository.findAll();
    const categoryMap = new Map(categories.map((c) => [String(c._id), { name: c.name, color: c.color, icon: c.icon }]));

    const result = Object.entries(byCategory)
      .map(([catId, data]) => ({
        categoryId: catId,
        categoryName: categoryMap.get(catId)?.name || "Unknown",
        categoryColor: categoryMap.get(catId)?.color || "#6366f1",
        categoryIcon: categoryMap.get(catId)?.icon || "",
        total: data.total,
        count: data.count,
      }))
      .sort((a, b) => b.total - a.total);

    res.json({
      byCategory: result,
      byPaymentMethod: Object.entries(byPaymentMethod).map(([method, data]) => ({
        paymentMethod: method,
        total: data.total,
        count: data.count,
      })),
      period: { startDate: start.toISOString().split("T")[0], endDate: end.toISOString().split("T")[0] },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function getTopExpenses(req, res) {
  try {
    const { startDate, endDate, limit = 10 } = req.query;
    const start = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const end = endDate ? new Date(endDate) : new Date();
    end.setHours(23, 59, 59, 999);

    const expenses = await expenseRepository.getExpensesByDateRange(start, end);
    expenses.sort((a, b) => b.amount - a.amount);

    const categories = await expenseCategoryRepository.findAll();
    const categoryMap = new Map(categories.map((c) => [String(c._id), { name: c.name, color: c.color }]));

    const top = expenses.slice(0, parseInt(limit)).map((e) => ({
      ...e,
      categoryName: categoryMap.get(String(e.categoryId))?.name || "Unknown",
      categoryColor: categoryMap.get(String(e.categoryId))?.color || "#6366f1",
    }));

    res.json({ topExpenses: top, period: { startDate: start.toISOString().split("T")[0], endDate: end.toISOString().split("T")[0] } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}