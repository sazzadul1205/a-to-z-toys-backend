let cachedSettings = null;

export async function loadFeatureSettings(settingsRepository) {
  const settings = await settingsRepository.getSettings();
  cachedSettings = {
    inventoryManagement: settings.inventoryManagementEnabled !== false,
    orderProcessing: settings.orderProcessingEnabled !== false,
  };
}

export function isInventoryEnabled() {
  if (cachedSettings) return cachedSettings.inventoryManagement;
  return process.env.INVENTORY_MANAGEMENT !== "false";
}

export function isOrderProcessingEnabled() {
  if (cachedSettings) return cachedSettings.orderProcessing;
  return process.env.ORDER_PROCESSING !== "false";
}