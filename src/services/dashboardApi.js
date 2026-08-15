import { apiRequest } from './apiClient';

export const dashboardApi = {
  getSummary: async (params = {}) => {
    const query = new URLSearchParams();
    if (params.period) query.append('period', params.period);
    if (params.custom_date) query.append('custom_date', params.custom_date);
    if (params.payment_method) query.append('payment_method', params.payment_method);

    const queryString = query.toString() ? `?${query.toString()}` : '';
    return apiRequest(`/dashboard/summary${queryString}`);
  }
};
