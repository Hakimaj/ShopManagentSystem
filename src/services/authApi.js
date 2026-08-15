import { apiRequest } from './apiClient';

export const authApi = {
  login: async (username, password) => {
    return apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
  },

  getProfile: async () => {
    return apiRequest('/auth/me', {
      method: 'GET'
    });
  }
};
