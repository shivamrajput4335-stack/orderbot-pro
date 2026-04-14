/**
 * OrderBot Pro Backend Server
 * Multi-page SaaS order management system
 */

const express = require("express");
const cors = require("cors");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const app = express();

// ===============================================
// MIDDLEWARE
// ===============================================

app.use(cors());
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ limit: '10kb', extended: true }));

// CSP Headers
app.use((req, res, next) => {
  res.header('Content-Security-Policy', "default-src *; script-src 'unsafe-inline' 'unsafe-eval' *; style-src 'unsafe-inline' *; img-src data: *");
  res.header('X-Content-Type-Options', 'nosniff');
  res.header('X-Frame-Options', 'DENY');
  next();
});

// ===============================================
// INITIALIZATION
// ===============================================

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('[SERVER] Initializing...');

// ===============================================
// TOKEN VERIFICATION MIDDLEWARE
// ===============================================

const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log('[AUTH] ❌ No valid bearer token');
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.slice(7);
  req.token = token;
  console.log('[AUTH] ✅ Token found');
  next();
};

// ===============================================
// API ROUTES - MUST BE BEFORE STATIC SERVING
// ===============================================

/**
 * POST /api/order - Create new order
 */
app.post('/api/order', verifyToken, async (req, res) => {
  console.log('[ORDER] POST /api/order');

  const { name, product, quantity } = req.body;

  // Validate
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Name is required' });
  }

  if (!product || !product.trim()) {
    return res.status(400).json({ error: 'Product is required' });
  }

  const qty = parseInt(quantity);
  if (!qty || qty < 1) {
    return res.status(400).json({ error: 'Quantity must be at least 1' });
  }

  try {
    // Verify user with token
    const { data, error } = await supabase.auth.getUser(req.token);

    if (error || !data.user) {
      console.log('[ORDER] ❌ Auth error');
      return res.status(401).json({ error: 'Invalid token' });
    }

    const userId = data.user.id;

    // Create order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        name: name.trim(),
        product: product.trim(),
        quantity: qty,
        user_id: userId
      })
      .select();

    if (orderError) {
      console.log('[ORDER] ❌ Database error');
      return res.status(500).json({ error: orderError.message });
    }

    console.log('[ORDER] ✅ Created');
    return res.json({ success: true, data: order[0] });
  } catch (err) {
    console.error('[ORDER] ❌ Exception:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/orders - Get all user orders
 */
app.get('/api/orders', verifyToken, async (req, res) => {
  console.log('[ORDERS] GET /api/orders');

  try {
    // Verify user
    const { data, error } = await supabase.auth.getUser(req.token);

    if (error || !data.user) {
      console.log('[ORDERS] ❌ Auth error');
      return res.status(401).json({ error: 'Invalid token' });
    }

    const userId = data.user.id;

    // Get orders
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (ordersError) {
      console.log('[ORDERS] ❌ Database error');
      return res.status(500).json({ error: ordersError.message });
    }

    console.log('[ORDERS] ✅ Found', orders.length, 'orders');
    return res.json({ success: true, data: orders });
  } catch (err) {
    console.error('[ORDERS] ❌ Exception:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/order/:id - Delete order
 */
app.delete('/api/order/:id', verifyToken, async (req, res) => {
  console.log('[DELETE] DELETE /api/order/:id -', req.params.id);

  try {
    // Verify user
    const { data, error } = await supabase.auth.getUser(req.token);
    if (error || !data.user) {
      console.log('[DELETE] ❌ Auth error');
      return res.status(401).json({ error: 'Invalid token' });
    }

    const userId = data.user.id;

    // Delete order
    const { error: deleteError } = await supabase
      .from('orders')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', userId);

    if (deleteError) {
      console.log('[DELETE] ❌ Database error');
      return res.status(500).json({ error: deleteError.message });
    }

    console.log('[DELETE] ✅ Deleted');
    return res.json({ success: true, data: null });
  } catch (err) {
    console.error('[DELETE] ❌ Exception:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

// ===============================================
// STATIC FILE SERVING (AFTER API ROUTES)
// ===============================================

app.use(express.static(path.join(__dirname, "public")));

// Serve index.html for root path
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ===============================================
// ERROR HANDLING
// ===============================================

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// ===============================================
// START SERVER
// ===============================================

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n✅ OrderBot Pro Server Running`);
  console.log(`📍 http://localhost:${PORT}`);
  console.log(`🚀 Ready for requests\n`);
});
