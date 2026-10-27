/**
 * Secure API Client for ShikhoTuition BD
 */

let currentAuthToken = localStorage.getItem('tuition_auth_token') || null;

export function setAuthToken(token) {
  currentAuthToken = token;
  if (token) {
    localStorage.setItem('tuition_auth_token', token);
  } else {
    localStorage.removeItem('tuition_auth_token');
  }
}

export function clearAuthToken() {
  currentAuthToken = null;
  localStorage.removeItem('tuition_auth_token');
}

export function getAuthToken() {
  return currentAuthToken;
}

export function isAuthenticated() {
  return Boolean(currentAuthToken);
}

export async function apiRequest(endpoint, options = {}) {
  const headers = {
    ...options.headers,
  };

  if (currentAuthToken) {
    headers['Authorization'] = `Bearer ${currentAuthToken}`;
  }

  if (options.body && !(options.body instanceof FormData) && typeof options.body === 'object') {
    headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(options.body);
  }

  const response = await fetch(`/api${endpoint}`, {
    ...options,
    headers,
  });

  const contentType = response.headers.get('content-type');
  let data = null;

  if (contentType && contentType.includes('application/json')) {
    data = await response.json();
  }

  if (!response.ok) {
    if (response.status === 401) {
      window.dispatchEvent(new CustomEvent('auth:unauthorized', { detail: { endpoint } }));
    }
    const errorMessage = data?.error || (typeof data === 'string' ? data : `Request failed with status ${response.status}`);
    const err = new Error(errorMessage);
    err.status = response.status;
    err.data = data;
    throw err;
  }

  return data !== null ? data : response;
}
