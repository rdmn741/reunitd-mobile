import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from './config';

const TOKEN_KEY = 'reunitd_token';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: attach JWT to every request
api.interceptors.request.use(
  async (config) => {
    const token = await SecureStore.getItemAsync(TOKEN_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: handle 401 globally
let _onUnauthorized = null;

export function setUnauthorizedHandler(handler) {
  _onUnauthorized = handler;
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response && error.response.status === 401) {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      if (_onUnauthorized) {
        _onUnauthorized();
      }
    }
    return Promise.reject(error);
  }
);

// Helper to extract user-friendly error message
export function getErrorMessage(error) {
  if (error.response && error.response.data) {
    const data = error.response.data;
    if (typeof data === 'string') return data;
    if (data.message) return data.message;
    if (data.error) return data.error;
  }
  if (error.message === 'Network Error') {
    return 'Unable to reach the server. Check your network connection.';
  }
  return error.message || 'An unexpected error occurred.';
}

// ─── Auth ───────────────────────────────────────────────────────────────────

export async function login(email, password) {
  const response = await api.post('/api/auth/login', { email, password });
  return response.data; // { token, parent } OR { twoFactorRequired: true, tempToken }
}

export async function verifyTwoFactor(tempToken, code) {
  const response = await api.post('/api/auth/verify-2fa', { tempToken, code });
  return response.data; // { token, parent }
}

export async function resendTwoFactor(tempToken) {
  const response = await api.post('/api/auth/resend-2fa', { tempToken });
  return response.data;
}

export async function setTwoFactorEnabled(enabled) {
  const response = await api.put('/api/auth/2fa', { enabled });
  return response.data; // { twoFactorEnabled }
}

export async function register(data) {
  const response = await api.post('/api/auth/register', data);
  return response.data;
}

export async function getMe() {
  const response = await api.get('/api/auth/me');
  return response.data; // { parent }
}

export async function updateMe(data) {
  const response = await api.put('/api/auth/me', data);
  return response.data;
}

export async function forgotPassword(email) {
  const response = await api.post('/api/auth/forgot-password', { email });
  return response.data;
}

export async function resetPassword(token, password) {
  const response = await api.post('/api/auth/reset-password', { token, password });
  return response.data;
}

export async function registerPushToken(token, platform) {
  const response = await api.post('/api/auth/push-token', { token, platform });
  return response.data;
}

export async function unregisterPushToken(token) {
  const response = await api.delete('/api/auth/push-token', { data: { token } });
  return response.data;
}

// ─── Tags ────────────────────────────────────────────────────────────────────

export async function getTags() {
  const response = await api.get('/api/tags');
  return response.data; // { tags: [...] }
}

export async function activateTag(tagId, activationCode, label) {
  const payload = { tagId, activationCode };
  if (label) payload.label = label;
  const response = await api.post('/api/tags/activate', payload);
  return response.data;
}

export async function updateTag(tagId, data) {
  const response = await api.put(`/api/tags/${tagId}`, data);
  return response.data;
}

export async function setLostMode(tagId, lostMode) {
  const response = await api.put(`/api/tags/${tagId}/lost-mode`, { lostMode });
  return response.data;
}

export async function updateTagSettings(tagId, visibleFields) {
  const response = await api.put(`/api/tags/${tagId}/settings`, { visibleFields });
  return response.data;
}

export async function getTagScans(tagId) {
  const response = await api.get(`/api/tags/${tagId}/scans`);
  return response.data; // { tagId, scanCount, logs: [...] }
}

export async function deleteTag(tagId) {
  const response = await api.delete(`/api/tags/${tagId}`);
  return response.data;
}

export const TOKEN_STORE_KEY = TOKEN_KEY;

export default api;
