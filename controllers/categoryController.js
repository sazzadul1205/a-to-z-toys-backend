import { categoryRepository } from "../models/index.js";

export async function listCategories(req, res) {
  try {
    const categories = await categoryRepository.findAll();
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function getCategory(req, res) {
  try {
    const category = await categoryRepository.findById(req.params.id);
    if (!category) return res.status(404).json({ error: "Category not found" });
    res.json(category);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function createCategory(req, res) {
  try {
    const category = await categoryRepository.createCategory(req.body);
    res.status(201).json(category);
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json(
      err.errors ? { errors: err.errors } : { error: err.message },
    );
  }
}

export async function updateCategory(req, res) {
  try {
    const updated = await categoryRepository.updateCategory(req.params.id, req.body);
    res.json(updated);
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json(
      err.errors ? { errors: err.errors } : { error: err.message },
    );
  }
}

export async function deleteCategory(req, res) {
  try {
    await categoryRepository.deleteCategory(req.params.id);
    res.json({ success: true });
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ error: err.message });
  }
}