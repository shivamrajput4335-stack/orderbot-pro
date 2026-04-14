const express = require("express");
const cors = require("cors");
const path = require("path");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const app = express();

// Disable helmet to avoid CSP issues in dev/testing
// app.use(helmet({
//   contentSecurityPolicy: false,
//   crossOriginEmbedderPolicy: false
// }));

// Set permissive CSP manually
app.use((req, res, next) => {
  res.header('Content-Security-Policy', "default-src *; script-src 'unsafe-inline' 'unsafe-eval' *; style-src 'unsafe-inline' *; img-src data: *");
  res.header('X-Content-Type-Options', 'nosniff');
  res.header('X-Frame-Options', 'DENY');
  next();
});

app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://orderbot-pro.onrender.com', 'https://orderbot-pro-staging.onrender.com']
    : '*',
  credentials: true
}));

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ limit: '10kb', extended: true }));
app.use(express.static(path.join(__dirname, "public")));

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === '/'
});

const orderLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 50,
  skipFailedRequests: true
});

app.use(apiLimiter);

// Request logging middleware
app.use((req, res, next) => {
  console.log(`\n[${new Date().toISOString()}] ${req.method} ${req.path}`);
  if (req.body && Object.keys(req.body).length > 0) {
    console.log("Body:", JSON.stringify(req.body).substring(0, 200));
  }
  next();
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

async function verifyUser(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      console.warn("[AUTH] Missing authorization header");
      return res.status(401).json({ error: "Missing authorization header" });
    }

    if (!authHeader.startsWith("Bearer ")) {
      console.warn("[AUTH] Invalid authorization format");
      return res.status(401).json({ error: "Invalid authorization format" });
    }

    const token = authHeader.slice(7);
    console.log("[AUTH] Validating token...");

    const { data, error } = await supabase.auth.getUser(token);

    if (error) {
      console.warn("[AUTH] Token validation error:", error.message);
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    if (!data.user) {
      console.warn("[AUTH] No user data in token");
      return res.status(401).json({ error: "Invalid token" });
    }

    console.log(`[AUTH] ✅ User verified: ${data.user.id}`);
    req.user = data.user;
    next();
  } catch (err) {
    console.error("[AUTH] Middleware error:", err.message, err.stack);
    res.status(500).json({ error: "Authentication service error" });
  }
}

app.post("/order", verifyUser, orderLimiter, async (req, res) => {
  try {
    const { name, product, quantity } = req.body;

    console.log(`[ORDER] Received request:`, { name, product, quantity });

    const nameStr = String(name || "").trim();
    const productStr = String(product || "").trim();
    const qty = parseInt(quantity, 10);

    if (!nameStr) {
      console.warn("[ORDER] Validation failed: empty name");
      return res.status(400).json({ error: "Customer name is required" });
    }
    if (!productStr) {
      console.warn("[ORDER] Validation failed: empty product");
      return res.status(400).json({ error: "Product is required" });
    }
    if (isNaN(qty) || qty < 1) {
      console.warn("[ORDER] Validation failed: invalid quantity");
      return res.status(400).json({ error: "Quantity must be at least 1" });
    }
    if (qty > 10000) {
      console.warn("[ORDER] Validation failed: quantity too high");
      return res.status(400).json({ error: "Quantity cannot exceed 10000" });
    }
    if (nameStr.length > 200) {
      console.warn("[ORDER] Validation failed: name too long");
      return res.status(400).json({ error: "Customer name too long" });
    }
    if (productStr.length > 200) {
      console.warn("[ORDER] Validation failed: product too long");
      return res.status(400).json({ error: "Product name too long" });
    }

    console.log(`[ORDER] Creating: user=${req.user.id}, name=${nameStr}, product=${productStr}, qty=${qty}`);

    const { data, error } = await supabase
      .from("orders")
      .insert({
        name: nameStr,
        product: productStr,
        quantity: qty,
        user_id: req.user.id
      })
      .select()
      .single();

    if (error) {
      console.error("[ORDER] Database error:", error.message, error.code, error.details);
      return res.status(500).json({ error: "Failed to create order", details: error.message });
    }

    console.log(`[ORDER] ✅ Success: order_id=${data.id}`);
    res.status(201).json({ success: true, data: data });

  } catch (err) {
    console.error("[ORDER] Server error:", err.message, err.stack);
    res.status(500).json({ error: "Server error occurred" });
  }
});

app.get("/orders", verifyUser, async (req, res) => {
  try {
    console.log(`[ORDERS] Fetching for user ${req.user.id}`);

    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .eq("user_id", req.user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[ORDERS] Query error:", error.message);
      return res.status(500).json({ error: "Failed to fetch orders", details: error.message });
    }

    const orders = data || [];
    console.log(`[ORDERS] ✅ Found ${orders.length} orders`);
    res.status(200).json({ success: true, data: orders });
  } catch (err) {
    console.error("[ORDERS] Server error:", err.message, err.stack);
    res.status(500).json({ error: "Server error occurred" });
  }
});

app.delete("/order/:id", verifyUser, async (req, res) => {
  try {
    const orderId = req.params.id;

    console.log(`[DELETE] Attempting: order_id=${orderId}, user_id=${req.user.id}`);

    if (!orderId || !/^\d+$/.test(orderId)) {
      console.warn("[DELETE] Invalid order ID format:", orderId);
      return res.status(400).json({ error: "Invalid order ID format" });
    }

    const { error: deleteError } = await supabase
      .from("orders")
      .delete()
      .eq("id", orderId)
      .eq("user_id", req.user.id);

    if (deleteError) {
      console.error("[DELETE] Error:", deleteError.message);
      return res.status(500).json({ error: "Failed to delete order", details: deleteError.message });
    }

    console.log(`[DELETE] ✅ Success: order_id=${orderId}`);
    res.status(200).json({ success: true, data: null });
  } catch (err) {
    console.error("[DELETE] Server error:", err.message, err.stack);
    res.status(500).json({ error: "Server error occurred" });
  }
});

app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use((req, res) => {
  console.warn(`[404] Not found: ${req.method} ${req.path}`);
  res.status(404).json({ error: "Endpoint not found" });
});

app.use((err, req, res, next) => {
  console.error("[UNCAUGHT] Error:", err.message, err.stack);
  res.status(500).json({ error: "Internal server error" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`✅ OrderBot Pro Server Started`);
  console.log(`${'='.repeat(60)}`);
  console.log(`Port: ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Supabase: ${process.env.SUPABASE_URL ? '✅ Connected' : '❌ Missing'}`);
  console.log(`${'='.repeat(60)}\n`);
});