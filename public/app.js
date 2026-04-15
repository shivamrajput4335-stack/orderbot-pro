// ===============================================
// SHARED APP UTILITIES FOR ORDERBOT PRO
// ===============================================

console.log('[APP.JS] Starting...');

// ===============================================
// SUPABASE CONFIG
// ===============================================

const SUPABASE_URL = 'https://xaajavxegbcahusslypx.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_DEGsga-C7Nk24INhlfkITg_0UBLnF5L';

const supabase = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

// ===============================================
// TOKEN MANAGEMENT
// ===============================================

function saveToken(token) {
  localStorage.setItem('authToken', token);
}

function getToken() {
  return localStorage.getItem('authToken');
}

function clearToken() {
  localStorage.removeItem('authToken');
}

function isLoggedIn() {
  const token = getToken();
  return token !== null && token !== '';
}

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

async function signUp(email, password) {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password
    });

    if (error) throw new Error(error.message);

    if (data?.session?.access_token) {
      saveToken(data.session.access_token);
      localStorage.setItem('user_id', data.user.id);
    }

    return { success: true, data };
  } catch (err) {
    console.error('[SIGNUP ERROR]', err.message);
    return { success: false, error: err.message };
  }
}

async function signIn(email, password) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw new Error(error.message);

    if (data?.session?.access_token) {
      saveToken(data.session.access_token);
      localStorage.setItem('user_id', data.user.id);
      return { success: true, data };
    } else {
      throw new Error('No session returned');
    }
  } catch (err) {
    console.error('[LOGIN ERROR]', err.message);
    return { success: false, error: err.message };
  }
}

function logout() {
  clearToken();
  localStorage.removeItem('user_id');
  supabase.auth.signOut().catch(err =>
    console.error('[LOGOUT ERROR]', err)
  );
  window.location.href = '/';
}

// ===============================================
// FETCH WITH AUTH (FIXED)
// ===============================================

async function fetchWithAuth(url, options = {}) {
  const token = getToken();

  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
      Authorization: token ? `Bearer ${token}` : ''
    }
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || 'Request failed');
  }

  return data;
}

// ===============================================
// API FUNCTIONS
// ===============================================

async function createOrder(name, product, quantity) {
  try {
    const user_id = localStorage.getItem('user_id');
    if (!user_id) throw new Error('User not logged in');

    const result = await fetchWithAuth('/api/order', {
      method: 'POST',
      body: JSON.stringify({
        name,
        product,
        quantity,
        user_id
      })
    });

    return { success: true, data: result };
  } catch (err) {
    console.error('[CREATE ORDER ERROR]', err.message);
    return { success: false, error: err.message };
  }
}

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

function setButtonLoading(buttonId, isLoading) {
  const btn = document.getElementById(buttonId);
  if (!btn) return;

  if (!btn.dataset.originalText) {
    btn.dataset.originalText = btn.textContent;
  }

  if (isLoading) {
    btn.disabled = true;
    btn.textContent = 'Loading...';
  } else {
    btn.disabled = false;
    btn.textContent = btn.dataset.originalText;
  }
}

function goToPage(path) {
  window.location.href = path;
}

// ===============================================
// REDIRECT HELPERS
// ===============================================

function redirectToHome(delay = 1500) {
  setTimeout(() => {
    window.location.href = '/';
  }, delay);
}

function redirectToOrders(delay = 500) {
  setTimeout(() => {
    window.location.href = '/order.html';
  }, delay);
}

function redirectIfNotAuth() {
  if (!isLoggedIn()) {
    window.location.href = '/auth.html';
  }
}

console.log('[APP.JS] ✅ READY');