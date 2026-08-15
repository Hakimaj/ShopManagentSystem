import { apiRequest } from './apiClient';

export const productsApi = {
  list: async (params = {}) => {
    const query = new URLSearchParams();
    if (params.search) query.append('search', params.search);
    if (params.category_id) query.append('category_id', params.category_id);
    if (params.is_active !== undefined) query.append('is_active', params.is_active);
    if (params.page) query.append('page', params.page);
    if (params.size) query.append('size', params.size);

    const queryString = query.toString() ? `?${query.toString()}` : '';
    return apiRequest(`/products${queryString}`);
  },

  get: async (id) => {
    return apiRequest(`/products/${id}`);
  },

  create: async (productData) => {
    return apiRequest('/products', {
      method: 'POST',
      body: JSON.stringify(productData)
    });
  },

  update: async (id, productData) => {
    return apiRequest(`/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(productData)
    });
  },

  adjustStock: async (id, newStock) => {
    return apiRequest(`/products/${id}/stock`, {
      method: 'PATCH',
      body: JSON.stringify({ new_stock: newStock })
    });
  },

  delete: async (id) => {
    return apiRequest(`/products/${id}`, {
      method: 'DELETE'
    });
  }
};
