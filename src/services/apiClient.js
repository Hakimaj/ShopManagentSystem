const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

export class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

// Called by AuthContext when a 401 is detected — clears token + triggers re-login
let _onUnauthorized = null;
export const registerUnauthorizedHandler = (handler) => {
  _onUnauthorized = handler;
};

export async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem('antishop_token');
  const headers = { ...options.headers };

  // Only add Content-Type: application/json if body is not FormData
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = { ...options, headers };

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

    if (response.status === 204) return null;

    const data = await response.json().catch(() => null);

    if (response.status === 401) {
      // Token expired or invalid — trigger global logout
      if (_onUnauthorized) _onUnauthorized();
      const errorMsg = data?.detail || 'Session expired. Please sign in again.';
      throw new ApiError(errorMsg, 401, data);
    }

    if (!response.ok) {
      const errorMsg = data?.detail || `API request failed with status ${response.status}`;
      throw new ApiError(errorMsg, response.status, data);
    }

    return data;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(err.message || 'Network connection error', 0, null);
  }
}
