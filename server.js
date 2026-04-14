const express = require("express");
const cors = require("cors");
const path = require("path");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const app = express();

app.use(helmet({
  contentSecurityPolicy: false
}));

app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://orderbot-pro.onrender.com', 'https://orderbot-pro-staging.onrender.com']
    : '*',
  credentials: true
}));

app.use(express.json({ limit: '10kb' }));
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

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

async function verifyUser(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Missing authorization header" });
    }

    const token = authHeader.slice(7);
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user) {
      console.error("Token validation error:", error?.message || "Invalid token");
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    req.user = data.user;
    next();
  } catch (err) {
    console.error("Auth middleware error:", err.message);
    res.status(500).json({ error: "Authentication service error" });
  }
}

app.post("/order", verifyUser, orderLimiter, async (req, res) => {
  try {
    const { name, product, quantity } = req.body;

    const nameStr = String(name || "").trim();
    const productStr = String(product || "").trim();
    const qty = parseInt(quantity, 10);

    if (!nameStr) {
      return res.status(400).json({ error: "Customer name is required" });
    }
    if (!productStr) {
      return res.status(400).json({ error: "Product is required" });
    }
    if (isNaN(qty) || qty < 1) {
      return res.status(400).json({ error: "Quantity must be at least 1" });
    }
    if (qty > 10000) {
      return res.status(400).json({ error: "Quantity cannot exceed 10000" });
    }
    if (nameStr.length > 200) {
      return res.status(400).json({ error: "Customer name too long" });
    }
    if (productStr.length > 200) {
      return res.status(400).json({ error: "Product name too long" });
    }

    console.log(`[ORDER] Creating order for user ${req.user.id}: ${nameStr} x${qty} of ${productStr}`);

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
      console.error("[ORDER_ERROR] Database insert failed:", error.message, error.code);
      return res.status(500).json({ error: "Failed to create order" });
    }

    console.log(`[ORDER_SUCCESS] Order ${data.id} created`);
    res.status(201).json({ success: true, order: data });

  } catch (err) {
    console.error("[SERVER_ERROR] POST /order:", err.message);
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
      console.error("[ORDERS_ERROR] Query failed:", error.message);
      return res.status(500).json({ error: "Failed to fetch orders" });
    }

    res.json(data || []);
  } catch (err) {
    console.error("[SERVER_ERROR] GET /orders:", err.message);
    res.status(500).json({ error: "Server error occurred" });
  }
});

app.delete("/order/:id", verifyUser, async (req, res) => {
  try {
    const orderId = req.params.id;

    if (!orderId || !/^\d+$/.test(orderId)) {
      return res.status(400).json({ error: "Invalid order ID format" });
    }

    console.log(`[DELETE] Attempting to delete order ${orderId} for user ${req.user.id}`);

    const { error: deleteError } = await supabase
      .from("orders")
      .delete()
      .eq("id", orderId)
      .eq("user_id", req.user.id);

    if (deleteError) {
      console.error("[DELETE_ERROR]:", deleteError.message);
      return res.status(500).json({ error: "Failed to delete order" });
    }

    console.log(`[DELETE_SUCCESS] Order ${orderId} deleted`);
    res.json({ success: true, message: "Order deleted successfully" });
  } catch (err) {
    console.error("[SERVER_ERROR] DELETE /order/:id:", err.message);
    res.status(500).json({ error: "Server error occurred" });
  }
});

app.use((req, res) => {
  res.status(404).json({ error: "Endpoint not found" });
});

app.use((err, req, res, next) => {
  console.error("[UNCAUGHT_ERROR]:", err.message);
  res.status(500).json({ error: "Internal server error" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`🔗 Supabase connected: ${process.env.SUPABASE_URL ? "Yes" : "No"}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});