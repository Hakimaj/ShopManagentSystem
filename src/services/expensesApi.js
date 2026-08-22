import { apiRequest } from './apiClient';

export const expensesApi = {
  // Categories
  listCategories: () => apiRequest('/expenses/categories'),

  createCategory: (name) =>
    apiRequest('/expenses/categories', {
      method: 'POST',
      body: JSON.stringify({ name })
    }),

  updateCategory: (id, name) =>
    apiRequest(`/expenses/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ name })
    }),

  deleteCategory: (id) =>
    apiRequest(`/expenses/categories/${id}`, { method: 'DELETE' }),

  // Expenses
  list: (params = {}) => {
    const q = new URLSearchParams();
    if (params.period)      q.append('period', params.period);
    if (params.custom_date) q.append('custom_date', params.custom_date);
    if (params.category_id) q.append('category_id', params.category_id);
    if (params.page)        q.append('page', params.page);
    if (params.size)        q.append('size', params.size);
    const qs = q.toString() ? `?${q.toString()}` : '';
    return apiRequest(`/expenses${qs}`);
  },

  getSummary: (params = {}) => {
    const q = new URLSearchParams();
    if (params.period)      q.append('period', params.period);
    if (params.custom_date) q.append('custom_date', params.custom_date);
    const qs = q.toString() ? `?${q.toString()}` : '';
    return apiRequest(`/expenses/summary${qs}`);
  },

  create: (data) =>
    apiRequest('/expenses', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  update: (id, data) =>
    apiRequest(`/expenses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),

  delete: (id) =>
    apiRequest(`/expenses/${id}`, { method: 'DELETE' })
};
