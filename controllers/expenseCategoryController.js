import { expenseCategoryRepository } from "../models/index.js";

export async function listExpenseCategories(req, res) {
  try {
    const { page = 1, limit = 50, sort = "sortOrder", order = "asc", isActive } = req.query;
    let categories = await expenseCategoryRepository.findAll();

    if (isActive !== undefined) {
      const active = isActive === "true";
      categories = categories.filter((c) => c.isActive === active);
    }

    const sortFn = (a, b) => {
      let valA = a[sort];
      let valB = b[sort];
      if (typeof valA === "string") valA = valA.toLowerCase();
      if (typeof valB === "string") valB = valB.toLowerCase();
      if (valA < valB) return order === "asc" ? -1 : 1;
      if (valA > valB) return order === "asc" ? 1 : -1;
      return 0;
    };
    categories.sort(sortFn);

    const total = categories.length;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const start = (pageNum - 1) * limitNum;
    const paginated = categories.slice(start, start + limitNum);

    res.json({
      categories: paginated,
      pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function getExpenseCategory(req, res) {
  try {
    const category = await expenseCategoryRepository.findById(req.params.id);
    if (!category) return res.status(404).json({ error: "Expense category not found" });
    res.json(category);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function createExpenseCategory(req, res) {
  try {
    const category = await expenseCategoryRepository.createExpenseCategory(req.body);
    res.status(201).json(category);
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json(
      err.errors ? { errors: err.errors } : { error: err.message },
    );
  }
}

export async function updateExpenseCategory(req, res) {
  try {
    const updated = await expenseCategoryRepository.updateExpenseCategory(req.params.id, req.body);
    res.json(updated);
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json(
      err.errors ? { errors: err.errors } : { error: err.message },
    );
  }
}

export async function deleteExpenseCategory(req, res) {
  try {
    await expenseCategoryRepository.deleteExpenseCategory(req.params.id);
    res.json({ success: true });
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ error: err.message });
  }
}

export async function bulkDeleteExpenseCategories(req, res) {
  try {
    const ids = req.body?.ids || req.body?.id;
    if (!ids) return res.status(400).json({ error: "ids is required" });
    const idArray = Array.isArray(ids) ? ids : [ids];
    let removed = 0;
    for (const id of idArray) {
      try {
        await expenseCategoryRepository.deleteExpenseCategory(id);
        removed++;
      } catch (e) {
        // Skip categories that can't be deleted (have expenses)
      }
    }
    res.json({ success: true, removed });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}