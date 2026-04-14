const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Supabase client (service role for backend)
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('[SERVER] Starting...');

// Test route
app.get('/', (req, res) => {
  console.log('[API] GET / - serving frontend');
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Verify token middleware
const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  console.log('[AUTH] Checking auth header:', authHeader ? 'present' : 'missing');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log('[AUTH] ❌ No valid bearer token');
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.slice(7);
  req.token = token;
  console.log('[AUTH] ✅ Token found');
  next();
};

// POST /order - Create new order
app.post('/order', verifyToken, async (req, res) => {
  console.log('[ORDER] POST /order');
  console.log('[ORDER] Body:', req.body);

  const { name, product, quantity } = req.body;

  // Validate
  if (!name || !name.trim()) {
    console.log('[ORDER] ❌ Validation: empty name');
    return res.status(400).json({ error: 'Name is required' });
  }

  if (!product || !product.trim()) {
    console.log('[ORDER] ❌ Validation: empty product');
    return res.status(400).json({ error: 'Product is required' });
  }

  const qty = parseInt(quantity);
  if (!qty || qty < 1) {
    console.log('[ORDER] ❌ Validation: invalid quantity');
    return res.status(400).json({ error: 'Quantity must be at least 1' });
  }

  try {
    // Verify user with token
    console.log('[ORDER] Verifying user...');
    const { data, error } = await supabase.auth.getUser(req.token);

    if (error || !data.user) {
      console.log('[ORDER] ❌ Auth error:', error?.message || 'No user');
      return res.status(401).json({ error: 'Invalid token' });
    }

    const userId = data.user.id;
    console.log('[ORDER] ✅ User verified:', userId);

    // Create order
    console.log('[ORDER] Creating order...');
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
      console.log('[ORDER] ❌ Database error:', orderError.message);
      return res.status(500).json({ error: orderError.message });
    }

    console.log('[ORDER] ✅ Created:', order[0].id);
    return res.json({
      success: true,
      data: order[0]
    });
  } catch (err) {
    console.error('[ORDER] ❌ Exception:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

// GET /orders - Get all user orders
app.get('/orders', verifyToken, async (req, res) => {
  console.log('[ORDERS] GET /orders');

  try {
    // Verify user
    console.log('[ORDERS] Verifying user...');
    const { data, error } = await supabase.auth.getUser(req.token);

    if (error || !data.user) {
      console.log('[ORDERS] ❌ Auth error:', error?.message);
      return res.status(401).json({ error: 'Invalid token' });
    }

    const userId = data.user.id;
    console.log('[ORDERS] ✅ User verified:', userId);

    // Get orders
    console.log('[ORDERS] Fetching orders...');
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (ordersError) {
      console.log('[ORDERS] ❌ Error:', ordersError.message);
      return res.status(500).json({ error: ordersError.message });
    }

    console.log('[ORDERS] ✅ Found', orders.length, 'orders');
    return res.json({
      success: true,
      data: orders
    });
  } catch (err) {
    console.error('[ORDERS] ❌ Exception:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

// DELETE /order/:id - Delete order
app.delete('/order/:id', verifyToken, async (req, res) => {
  console.log('[DELETE] DELETE /order/:id -', req.params.id);

  try {
    // Verify user
    const { data, error } = await supabase.auth.getUser(req.token);
    if (error || !data.user) {
      console.log('[DELETE] ❌ Auth error');
      return res.status(401).json({ error: 'Invalid token' });
    }

    const userId = data.user.id;

    // Delete order (check ownership)
    const { error: deleteError } = await supabase
      .from('orders')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', userId);

    if (deleteError) {
      console.log('[DELETE] ❌ Error:', deleteError.message);
      return res.status(500).json({ error: deleteError.message });
    }

    console.log('[DELETE] ✅ Deleted');
    return res.json({
      success: true,
      data: null
    });
  } catch (err) {
    console.error('[DELETE] ❌ Exception:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n✅ OrderBot Pro Server Running`);
  console.log(`📍 http://localhost:${PORT}`);
  console.log(`🚀 Ready for requests\n`);
});
