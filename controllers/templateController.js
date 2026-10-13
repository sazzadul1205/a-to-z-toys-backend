import { templateService } from "../services/templateService.js";

// Public endpoint - get compiled template for slip generation
export async function getCompiledTemplate(req, res) {
  try {
    const { type } = req.params; // 'pos-thermal' or 'a4-standard'
    const data = req.body; // Sale/order data

    if (!type || !["pos-thermal", "a4-standard"].includes(type)) {
      return res.status(400).json({ error: "Invalid template type. Use 'pos-thermal' or 'a4-standard'" });
    }

    const html = await templateService.getCompiledTemplate(type, data || {});
    res.set("Content-Type", "text/html");
    res.send(html);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Admin endpoints
export async function listTemplates(req, res) {
  try {
    const templates = await templateService.listTemplates();
    res.json(templates);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function getTemplate(req, res) {
  try {
    const { id } = req.params;
    const template = await templateService.getTemplate(id);
    if (!template) {
      return res.status(404).json({ error: "Template not found" });
    }
    res.json(template);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function createTemplate(req, res) {
  try {
    const userId = req.user?.id || "admin";
    const template = await templateService.createTemplate(req.body, userId);
    res.status(201).json(template);
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json(err.errors ? { errors: err.errors } : { error: err.message });
  }
}

export async function updateTemplate(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user?.id || "admin";
    const updated = await templateService.updateCustomSections(id, req.body, userId);
    res.json(updated);
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json(err.errors ? { errors: err.errors } : { error: err.message });
  }
}

export async function deleteTemplate(req, res) {
  try {
    const { id } = req.params;
    await templateService.deleteTemplate(id);
    res.json({ success: true });
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ error: err.message });
  }
}

export async function previewTemplate(req, res) {
  try {
    const { id } = req.params;
    const sampleData = req.body;
    const html = await templateService.previewTemplate(id, sampleData);
    res.set("Content-Type", "text/html");
    res.send(html);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}