// ===============================================
// SHARED APP UTILITIES FOR ORDERBOT PRO
// ===============================================

// Supabase Configuration
const SUPABASE_URL = 'https://xaajavxegbcahusslypx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhhYWphdnhlZ2JjYWh1c3NseXB4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU5MzM2NzMsImV4cCI6MjA5MTUwOTY3M30.zmuiRqI2juksLci9BGgG-p1MIrI9BGBDLY6J6pasUps';

// Initialize Supabase Client
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ===============================================
// TOKEN MANAGEMENT
// ===============================================

/**
 * Save auth token to localStorage
 */
function saveToken(token) {
  localStorage.setItem('authToken', token);
}

/**
 * Get auth token from localStorage
 */
function getToken() {
  return localStorage.getItem('authToken');
}

/**
 * Clear auth token from localStorage
 */
function clearToken() {
  localStorage.removeItem('authToken');
}

/**
 * Check if user is logged in
 */
function isLoggedIn() {
  const token = getToken();
  return token !== null && token !== '';
}

/**
 * Require user to be logged in, redirect to auth if not
 */
function requireAuth() {
  if (!isLoggedIn()) {
    window.location.href = '/auth.html';
    return false;
  }
  return true;
}

// ===============================================
// AUTH FUNCTIONS
// ===============================================

/**
 * Sign up new user
 */
async function signUp(email, password) {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password
    });

    if (error) throw new Error(error.message);

    if (data?.session?.access_token) {
      saveToken(data.session.access_token);
      return { success: true, data };
    } else {
      throw new Error('No session returned from signup');
    }
  } catch (err) {
    console.error('[SIGNUP ERROR]', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Sign in existing user
 */
async function signIn(email, password) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw new Error(error.message);

    if (data?.session?.access_token) {
      saveToken(data.session.access_token);
      return { success: true, data };
    } else {
      throw new Error('No session returned from login');
    }
  } catch (err) {
    console.error('[LOGIN ERROR]', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Logout user
 */
function logout() {
  clearToken();
  supabase.auth.signOut().catch(err => console.error('[LOGOUT ERROR]', err));
  window.location.href = '/';
}

// ===============================================
// API FETCH HELPERS
// ===============================================

/**
 * Get base URL (handles both local and production)
 */
function getBaseUrl() {
  return window.location.origin;
}

/**
 * Fetch with bearer token
 */
async function fetchWithAuth(endpoint, options = {}) {
  const token = getToken();

  const headers = new Headers(options.headers || {});
  headers.append('Content-Type', 'application/json');

  if (token) {
    headers.append('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${getBaseUrl()}${endpoint}`, {
    ...options,
    headers
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.error || 'API error');
  }

  return data;
}

/**
 * Create new order
 */
async function createOrder(name, product, quantity) {
  try {
    const result = await fetchWithAuth('/api/order', {
      method: 'POST',
      body: JSON.stringify({ name, product, quantity })
    });
    return { success: true, data: result.data };
  } catch (err) {
    console.error('[CREATE ORDER ERROR]', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Get all user orders
 */
async function fetchOrders() {
  try {
    const result = await fetchWithAuth('/api/orders', {
      method: 'GET'
    });
    return { success: true, data: result.data || [] };
  } catch (err) {
    console.error('[FETCH ORDERS ERROR]', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Delete order
 */
async function deleteOrder(orderId) {
  try {
    const result = await fetchWithAuth(`/api/order/${orderId}`, {
      method: 'DELETE'
    });
    return { success: true, data: result.data };
  } catch (err) {
    console.error('[DELETE ORDER ERROR]', err.message);
    return { success: false, error: err.message };
  }
}

// ===============================================
// UI HELPERS
// ===============================================

/**
 * Show message (success or error)
 */
function showMessage(element, message, type = 'success') {
  if (!element) return;

  element.textContent = message;
  element.className = `message ${type}`;
  element.style.display = 'block';

  if (type === 'success') {
    setTimeout(() => {
      element.style.display = 'none';
    }, 3000);
  }
}

/**
 * Set button loading state
 */
function setButtonLoading(buttonId, isLoading) {
  const btn = document.getElementById(buttonId);
  if (!btn) return;

  if (isLoading) {
    btn.disabled = true;
    btn.textContent = 'Loading...';
  } else {
    btn.disabled = false;
    btn.textContent = btn.getAttribute('data-original-text') || 'Submit';
  }
}

/**
 * Navigate to page
 */
function goToPage(path) {
  window.location.href = path;
}

// ===============================================
// PAGE REDIRECT HELPERS
// ===============================================

/**
 * Redirect to home after successful action
 */
function redirectToHome(delayMs = 1500) {
  setTimeout(() => {
    window.location.href = '/';
  }, delayMs);
}

/**
 * Redirect to orders page after successful auth
 */
function redirectToOrders(delayMs = 500) {
  setTimeout(() => {
    window.location.href = '/order.html';
  }, delayMs);
}

/**
 * Redirect to auth page if not logged in
 */
function redirectIfNotAuth() {
  if (!isLoggedIn()) {
    window.location.href = '/auth.html';
  }
}

console.log('[APP.JS] Utilities loaded');
