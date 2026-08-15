import { apiRequest } from './apiClient';

export const categoriesApi = {
  list: async () => {
    return apiRequest('/categories');
  },

  get: async (id) => {
    return apiRequest(`/categories/${id}`);
  },

  create: async (name) => {
    return apiRequest('/categories', {
      method: 'POST',
      body: JSON.stringify({ name })
    });
  },

  update: async (id, name) => {
    return apiRequest(`/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ name })
    });
  },

  delete: async (id) => {
    return apiRequest(`/categories/${id}`, {
      method: 'DELETE'
    });
  }
};
