import { apiRequest } from './apiClient';

export const transactionsApi = {
  checkout: async (checkoutData) => {
    return apiRequest('/transactions', {
      method: 'POST',
      body: JSON.stringify(checkoutData)
    });
  },

  list: async (params = {}) => {
    const query = new URLSearchParams();
    if (params.period) query.append('period', params.period);
    if (params.custom_date) query.append('custom_date', params.custom_date);
    if (params.payment_method) query.append('payment_method', params.payment_method);
    if (params.page) query.append('page', params.page);
    if (params.size) query.append('size', params.size);

    const queryString = query.toString() ? `?${query.toString()}` : '';
    return apiRequest(`/transactions${queryString}`);
  },

  get: async (id) => {
    return apiRequest(`/transactions/${id}`);
  }
};
