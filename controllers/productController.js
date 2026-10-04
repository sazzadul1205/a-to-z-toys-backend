import { productRepository } from "../models/index.js";

export async function listProducts(req, res) {
  try {
    const { categoryId } = req.query;
    let products;
    if (categoryId) {
      products = await productRepository.getProductsByCategory(categoryId);
    } else {
      products = await productRepository.findAll();
    }
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function getProduct(req, res) {
  try {
    const product = await productRepository.findById(req.params.id);
    if (!product) return res.status(404).json({ error: "Product not found" });
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function createProduct(req, res) {
  try {
    const product = await productRepository.createProduct(req.body);
    res.status(201).json(product);
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json(
      err.errors ? { errors: err.errors } : { error: err.message },
    );
  }
}

export async function updateProduct(req, res) {
  try {
    const updated = await productRepository.updateProduct(req.params.id, req.body);
    res.json(updated);
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json(
      err.errors ? { errors: err.errors } : { error: err.message },
    );
  }
}

export async function deleteProduct(req, res) {
  try {
    const existing = await productRepository.findById(req.params.id);
    if (!existing) return res.status(404).json({ error: "Product not found" });

    await productRepository.deleteById(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}