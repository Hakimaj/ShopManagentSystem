import { apiRequest } from './apiClient';

export const inventoryApi = {
  getStats: async () => {
    return apiRequest('/inventory/stats');
  },
  
  getStockMovements: async (params = {}) => {
    const query = new URLSearchParams();
    if (params.type) query.append('type', params.type);
    if (params.period) query.append('period', params.period);
    if (params.page) query.append('page', params.page);
    if (params.size) query.append('size', params.size);

    const queryString = query.toString() ? `?${query.toString()}` : '';
    return apiRequest(`/stock-movements${queryString}`);
  }
};