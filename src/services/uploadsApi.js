import { apiRequest } from './apiClient';

export const uploadsApi = {
  uploadImage: async (file) => {
    const formData = new FormData();
    formData.append('file', file);

    return apiRequest('/uploads/image', {
      method: 'POST',
      body: formData
    });
  }
};
