import { settingsRepository } from "../models/index.js";

// The review configuration is store-wide, not per product, so it
// lives on a single settings document.
export async function getSettings(req, res) {
  try {
    res.json(await settingsRepository.getSettings());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function updateReviewSettings(req, res) {
  try {
    const value = req.body?.reviewsEnabled === false ? false : true;
    const updated = await settingsRepository.updateSettings({
      reviewsEnabled: value,
    });
    res.json({ success: true, reviewsEnabled: updated.reviewsEnabled !== false });
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json(
      err.errors ? { errors: err.errors } : { error: err.message },
    );
  }
}

export async function updateInventorySettings(req, res) {
  try {
    const value = req.body?.inventoryManagementEnabled === false ? false : true;
    const updated = await settingsRepository.updateSettings({
      inventoryManagementEnabled: value,
    });
    res.json({
      success: true,
      inventoryManagementEnabled: updated.inventoryManagementEnabled !== false,
    });
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json(
      err.errors ? { errors: err.errors } : { error: err.message },
    );
  }
}

export async function updateOrderProcessingSettings(req, res) {
  try {
    const value = req.body?.orderProcessingEnabled === false ? false : true;
    const updated = await settingsRepository.updateSettings({
      orderProcessingEnabled: value,
    });
    res.json({
      success: true,
      orderProcessingEnabled: updated.orderProcessingEnabled !== false,
    });
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json(
      err.errors ? { errors: err.errors } : { error: err.message },
    );
  }
}
