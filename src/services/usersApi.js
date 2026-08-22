import { apiRequest } from './apiClient';

export const usersApi = {
  list: () => apiRequest('/users'),

  update: (id, data) =>
    apiRequest(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    })
};
