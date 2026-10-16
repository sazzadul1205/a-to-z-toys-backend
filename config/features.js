let cachedSettings = null;

export async function loadFeatureSettings(settingsRepository) {
  const settings = await settingsRepository.getSettings();
  cachedSettings = {
    inventoryManagement: settings.inventoryManagementEnabled !== false,
    orderProcessing: settings.orderProcessingEnabled !== false,
  };
}

// Feature flags live on the store-wide settings document (PATCH /settings/inventory,
// PATCH /settings/order-processing). They are read from the DB at boot and cached;
// there is no env override, so the admin UI is the single source of truth.
export function isInventoryEnabled() {
  return cachedSettings ? cachedSettings.inventoryManagement : true;
}

export function isOrderProcessingEnabled() {
  return cachedSettings ? cachedSettings.orderProcessing : true;
}

// Refresh the cache after the admin toggles a flag, so the change takes effect
// immediately instead of only after the next restart.
export async function refreshFeatureSettings(settingsRepository) {
  await loadFeatureSettings(settingsRepository);
}