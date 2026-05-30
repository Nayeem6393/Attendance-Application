const getApiBaseUrl = () => {
  const { hostname, protocol } = window.location;
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:5000/api';
  }
  // Connect to the same host machine on port 5000 for local Wi-Fi debugging
  return `${protocol}//${hostname}:5000/api`;
};

const BASE_URL = import.meta.env.VITE_API_URL || getApiBaseUrl();

/**
 * Robust fetch API wrapper that automatically attaches the JWT Auth token
 * and handles standard JSON responses.
 */
const request = async (method, path, body = null, isBlob = false) => {
  const url = `${BASE_URL}${path}`;
  const token = localStorage.getItem('attendance_jwt_token');

  const headers = {
    'Accept': 'application/json',
  };

  if (!(body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    method,
    headers,
  };

  if (body) {
    config.body = body instanceof FormData ? body : JSON.stringify(body);
  }

  try {
    const response = await fetch(url, config);

    // Handle standard downloads (blobs like PDF/Excel)
    if (isBlob) {
      if (!response.ok) {
        const errorJson = await response.json();
        throw new Error(errorJson.error || 'Failed to download report.');
      }
      return await response.blob();
    }

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'An error occurred during API request.');
    }

    return data;
  } catch (error) {
    console.error(`API Fetch Error [${method} ${path}]:`, error);
    throw error;
  }
};

export const api = {
  get: (path) => request('GET', path),
  post: (path, body) => request('POST', path, body),
  put: (path, body) => request('PUT', path, body),
  patch: (path, body) => request('PATCH', path, body),
  del: (path) => request('DELETE', path),
  download: (path) => request('GET', path, null, true)
};

export default api;
