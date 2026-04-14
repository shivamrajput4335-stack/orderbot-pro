const express = require("express");
const cors = require("cors");
const path = require("path");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const app = express();

// 🔒 SECURITY: Helmet headers
app.use(helmet());

// 🔒 SECURITY: CORS
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? 'https://orderbot-pro.onrender.com'
    : '*'
}));

// 🔒 SECURITY: Body parser limit
app.use(express.json({ limit: '10kb' }));

// 🌐 SERVE FRONTEND
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// 🔗 SUPABASE
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// 🔐 AUTH MIDDLEWARE
async function verifyUser(req, res, next) {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({ error: "No token provided" });
    }

    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    req.user = data.user;
    next();

  } catch (err) {
    console.error("Auth error:", err);
    return res.status(500).json({ error: "Authentication failed" });
  }
}

// 🚨 RATE LIMITING

// General API rate limiter: 100 requests per 15 minutes per IP
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: "Too many requests, please try again later",
  standardHeaders: true,
  legacyHeaders: false
});

// Order creation rate limiter: 30 orders per hour per user
const orderLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 30,
  keyGenerator: (req) => req.user?.id || req.ip,
  message: "Too many orders created, please try again later"
});

// Apply general limiter to all API routes
app.use("/", apiLimiter);

// 🚀 CREATE ORDER (FIXED: Added verifyUser)
app.post("/order", verifyUser, orderLimiter, async (req, res) => {
  try {
    let { name, product, quantity } = req.body;

    name = String(name || "").trim();
    product = String(product || "").trim();
    const qty = Number(quantity);

    if (!name || !product) {
      return res.status(400).json({ error: "Name and product are required" });
    }

    if (isNaN(qty) || qty <= 0) {
      return res.status(400).json({ error: "Quantity must be a positive number" });
    }

    if (name.length > 100 || product.length > 100) {
      return res.status(400).json({ error: "Name and product must be less than 100 characters" });
    }

    const { data, error } = await supabase
      .from("orders")
      .insert([
        {
          name,
          product,
          quantity: qty,
          user_id: req.user.id
        }
      ])
      .select()
      .single();

    if (error) {
      console.error("Insert error:", error);
      return res.status(500).json({ error: "Failed to create order" });
    }

    res.status(201).json({ success: true, order: data });

  } catch (err) {
    console.error("Server error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// 📦 GET ORDERS (FIXED: Added verifyUser)
app.get("/orders", verifyUser, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .eq("user_id", req.user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Query error:", error);
      return res.status(500).json({ error: "Failed to fetch orders" });
    }

    res.json(data || []);

  } catch (err) {
    console.error("Server error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ❌ DELETE ORDER (FIXED: Added better validation)
app.delete("/order/:id", verifyUser, async (req, res) => {
  try {
    const id = req.params.id;

    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({ error: "Invalid order ID" });
    }

    const { error } = await supabase
      .from("orders")
      .delete()
      .eq("id", id)
      .eq("user_id", req.user.id);

    if (error) {
      console.error("Delete error:", error);
      return res.status(500).json({ error: "Failed to delete order" });
    }

    res.json({ success: true, message: "Order deleted" });

  } catch (err) {
    console.error("Server error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// 🚀 START SERVER
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`✅ OrderBot Pro running on port ${PORT}`);
  console.log(`🔗 Supabase: ${process.env.SUPABASE_URL ? "✓ Connected" : "✗ Missing SUPABASE_URL"}`);
});