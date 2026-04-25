import { api } from './api';

export interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  quantity: number;
  price: number;
}

export const inventoryService = {
  getInventory: async (): Promise<InventoryItem[]> => {
    const response = await api.get('/inventory');
    return response.data;
  },

  updateStock: async (sku: string, quantity: number): Promise<InventoryItem> => {
    // This calls the gateway which routes to Service B via Service A or directly
    const response = await api.post('/inventory/update-stock', { sku, quantity });
    return response.data;
  }
};
