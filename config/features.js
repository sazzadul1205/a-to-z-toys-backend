export const config = {
  features: {
    inventoryManagement: process.env.INVENTORY_MANAGEMENT !== "false",
    orderProcessing: process.env.ORDER_PROCESSING !== "false",
  },
};

export function isInventoryEnabled() {
  return config.features.inventoryManagement;
}

export function isOrderProcessingEnabled() {
  return config.features.orderProcessing;
}