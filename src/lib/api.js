const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '');
const AUTH_BASE_URL = (import.meta.env.VITE_AUTH_BASE_URL || '').replace(/\/+$/, '');
const PAYMENT_BASE_URL = (import.meta.env.VITE_PAYMENT_BASE_URL || '').replace(/\/+$/, '');

function parseEnvBool(value) {
  if (value === undefined || value === null) return false;
  const normalized = String(value).trim().toLowerCase();
  if (['1', 'true', 'yes', 'y', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'n', 'off'].includes(normalized)) return false;
  return false;
}

export const GOOGLE_ENABLED = parseEnvBool(import.meta.env.VITE_GOOGLE_ENABLED);

export const ADMIN_TOKEN_KEY = 'sufi-admin-token';
export const CUSTOMER_TOKEN_KEY = 'sufi-customer-token';
export const REFRESH_TOKEN_KEY = 'sufi-refresh-token';
export const USER_ID_KEY = 'sufi-user-id';
export const CART_KEY = 'sufi-cart';

function buildUrl(path) {
  if (/^https?:\/\//i.test(path)) return path;
  const normalizeServiceDoublePrefix = (url) => (
    url
      .replace(/\/api\/api(\/|$)/g, '/api$1')
      .replace(/\/auth\/auth(\/|$)/g, '/auth$1')
      .replace(/\/payment\/payment(\/|$)/g, '/payment$1')
  );
  const normalizedPath = normalizeServiceDoublePrefix(path.startsWith('/') ? path : `/${path}`);
  const joinBase = (base, servicePrefix) => {
    if (!base) return normalizedPath;
    if (base.endsWith(servicePrefix) && normalizedPath.startsWith(servicePrefix)) {
      return normalizeServiceDoublePrefix(`${base}${normalizedPath.slice(servicePrefix.length)}`);
    }
    return normalizeServiceDoublePrefix(`${base}${normalizedPath}`);
  };
  
  // Route to Auth Service if path starts with /auth
  if (normalizedPath.startsWith('/auth')) {
    return normalizeServiceDoublePrefix(joinBase(AUTH_BASE_URL, '/auth'));
  }

  // Route to Payment Service if path starts with /payment
  if (normalizedPath.startsWith('/payment')) {
    return normalizeServiceDoublePrefix(joinBase(PAYMENT_BASE_URL, '/payment'));
  }
  return normalizeServiceDoublePrefix(joinBase(API_BASE_URL, '/api'));
}

export function getGoogleOAuthUrl() {
  return buildUrl('/auth/google');
}

export async function fetchCustomerMe(token) {
  return request('/auth/me', { token });
}

export async function fetchAuthHealth() {
  return request('/auth/health');
}

export async function fetchPaymentHealth() {
  return request('/payment/health');
}

export async function createPaymentOrder(payload, token) {
  return request('/payment/order/create', { method: 'POST', body: payload, token });
}

export async function startPayment(payload, token) {
  return request('/payment/start', { method: 'POST', body: payload, token });
}

export async function verifyGatewayPayment(payload, gateway, token) {
  return request('/payment/verify', { method: 'POST', body: { payload, gateway }, token });
}

async function request(path, { method = 'GET', body, token, headers } = {}) {
  let response;
  const url = buildUrl(path);

  try {
    response = await fetch(url, {
      method,
      cache: method === 'GET' ? 'no-store' : 'default',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(headers || {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  } catch (error) {
    console.error('[api] request failed', { url, method, error: error?.message || String(error) });
    throw new Error('Connection failed. Ensure Core, Auth, and Payment services are running.');
  }

  // Handle Token Expiry (401)
  if (response.status === 401 && localStorage.getItem(REFRESH_TOKEN_KEY) && !path.includes('/auth/refresh-token')) {
    try {
      const refreshed = await refreshToken();
      if (refreshed) {
        return request(path, { method, body, token: refreshed.accessToken, headers });
      }
    } catch {
      logout();
    }
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    // Auth "me" can legitimately return 401 when no/expired token is present.
    // Treat it as a non-fatal "not logged in" signal to avoid noisy console spam.
    if (response.status === 401 && path === '/auth/me') {
      return { data: null, status: 401 };
    }
    console.error('[api] non-2xx response', { url, method, status: response.status, data });
    throw new Error(data.message || data.error || `Request failed (${response.status})`);
  }
  return data;
}

async function requestMultipart(path, { formData, token } = {}) {
  let response;
  try {
    response = await fetch(buildUrl(path), {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    });
  } catch {
    throw new Error('Upload failed. Connection error.');
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || data.error || 'Upload failed');
  return data;
}

// TOKEN MANAGEMENT
export function getAdminToken() { return localStorage.getItem(ADMIN_TOKEN_KEY) || ''; }
export function getCustomerToken() { return localStorage.getItem(CUSTOMER_TOKEN_KEY) || ''; }
export function getRefreshToken() { return localStorage.getItem(REFRESH_TOKEN_KEY) || ''; }

export function setTokens(access, refresh) {
  localStorage.setItem(CUSTOMER_TOKEN_KEY, access);
  localStorage.setItem(REFRESH_TOKEN_KEY, refresh);
}

export function setCustomerToken(token) {
  localStorage.setItem(CUSTOMER_TOKEN_KEY, token || '');
}

export function logout() {
  localStorage.removeItem(CUSTOMER_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_ID_KEY);
  window.location.href = '/login';
}

// AUTH & ACCOUNT APIs
export async function refreshToken() {
  const rt = getRefreshToken();
  const userId = localStorage.getItem(USER_ID_KEY);
  const response = await request('/auth/refresh-token', {
    method: 'POST',
    body: { userId, refreshToken: rt }
  });
  const data = response?.data || response;
  if (data.accessToken) {
    setTokens(data.accessToken, data.refreshToken);
    return data;
  }
  return null;
}

export async function loginCustomer(payload) {
  const response = await request('/auth/login', { method: 'POST', body: payload });
  const data = response?.data || response;
  if (data.accessToken) setTokens(data.accessToken, data.refreshToken);
  if (data.userId) localStorage.setItem(USER_ID_KEY, data.userId);
  return data;
}

export async function registerCustomer(payload) {
  const response = await request('/auth/register', { method: 'POST', body: payload });
  const data = response?.data || response;
  if (data.accessToken) setTokens(data.accessToken, data.refreshToken);
  if (data.userId) localStorage.setItem(USER_ID_KEY, data.userId);
  return data;
}

export async function loginAdmin({ username, password }) {
  return request('/api/admin/login', { method: 'POST', body: { username, password } });
}

export async function sendOTP(email) {
  return request('/auth/send-otp', { method: 'POST', body: { email } });
}

export async function verifyOTP(email, otp) {
  const response = await request('/auth/verify-otp', { method: 'POST', body: { email, otp } });
  const data = response?.data || response;
  if (data.accessToken) setTokens(data.accessToken, data.refreshToken);
  if (data.userId) localStorage.setItem(USER_ID_KEY, data.userId);
  return data;
}

export async function forgotPassword(email) {
  return request('/api/auth/forgot-password', { method: 'POST', body: { email } });
}

export async function verifyResetOtp(email, otp) {
  return request('/api/auth/verify-otp', { method: 'POST', body: { email, otp } });
}

export async function resetPassword(resetToken, newPassword, confirmPassword) {
  return request('/api/auth/reset-password', { method: 'POST', body: { resetToken, newPassword, confirmPassword } });
}


// PRODUCT APIs
export async function fetchProducts({ includeInactive = false } = {}) {
  const query = includeInactive ? '?include_inactive=true' : '';
  return request(`/api/products${query}`);
}

export async function searchProducts(query) {
  const params = new URLSearchParams({ q: query });
  return request(`/api/products/search?${params.toString()}`);
}

export async function fetchProductById(productId) {
  return request(`/api/products/${productId}`);
}

export async function fetchSimilarProducts(productId) {
  return request(`/api/products/${productId}/similar`);
}

export async function createProduct(payload, token) {
  return request('/api/products', { method: 'POST', body: payload, token });
}

export async function updateProduct(productId, payload, token) {
  return request(`/api/products/${productId}`, { method: 'PUT', body: payload, token });
}

export async function deleteProduct(productId, token) {
  return request(`/api/products/${productId}`, { method: 'DELETE', token });
}

// ORDER & TRANSACTION APIs
export async function createOrder(payload) {
  return request('/api/orders', { method: 'POST', body: payload });
}

export async function fetchOrders(token) {
  return request('/api/orders', { token });
}

export async function updateOrder(orderId, payload, token) {
  return request(`/api/orders/${orderId}`, { method: 'PATCH', body: payload, token });
}

export async function deleteOrder(orderId, token) {
  return request(`/api/orders/${orderId}`, { method: 'DELETE', token });
}

// REVIEW & SOCIAL APIs
export async function fetchProductReviews(productId) {
  return request(`/api/products/${productId}/reviews`);
}

export async function createProductReview(productId, payload) {
  return request(`/api/products/${productId}/reviews`, { method: 'POST', body: payload });
}

export async function uploadReviewImage(file) {
  const formData = new FormData();
  formData.append('image', file);
  return requestMultipart('/api/uploads/review-image', { formData });
}

export async function uploadAdminMedia(file, token) {
  const formData = new FormData();
  formData.append('file', file);
  return requestMultipart('/api/upload', { formData, token });
}

// CUSTOMER MANAGEMENT APIs
export async function fetchCustomers(token) {
  return request('/api/customers', { token });
}

export async function createCustomer(payload, token) {
  return request('/api/customers', { method: 'POST', body: payload, token });
}

export async function updateCustomer(customerId, payload, token) {
  return request(`/api/customers/${customerId}`, { method: 'PUT', body: payload, token });
}

export async function deleteCustomer(customerId, token) {
  return request(`/api/customers/${customerId}`, { method: 'DELETE', token });
}

// RECOMMENDATIONS
export async function fetchRecommendations() {
  const token = getCustomerToken();
  return request('/api/recommendations', { token });
}

export async function fetchPersonalizedRecommendations() {
  const token = getCustomerToken();
  return request('/api/recommendations/personalized', { token });
}

// ADMIN & SETTINGS APIs
export async function fetchAdminOverview(token) {
  return request('/api/admin/overview', { token });
}

export async function fetchAdminAnalytics(token) {
  return request('/api/admin/analytics', { token });
}

export async function fetchPublicSettings() {
  return request('/api/settings');
}

export async function fetchAdminSettings(token) {
  return request('/api/admin/settings', { token });
}

export async function updateAdminSettings(payload, token) {
  return request('/api/admin/settings', { method: 'POST', body: payload, token });
}

export async function fetchHealth() {
  return request('/api/health');
}
