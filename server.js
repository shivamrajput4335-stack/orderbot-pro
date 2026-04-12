const express = require("express");
const cors = require("cors");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const rateLimit = require("express-rate-limit");
const helmet = require("helmet");

const app = express();
const PORT = process.env.PORT || 3000;
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase environment variables. Check SUPABASE_URL and SUPABASE_KEY.");
  process.exit(1);
}

let supabaseProjectRef = "unknown";

try {
  supabaseProjectRef = new URL(supabaseUrl).hostname.split(".")[0] || "unknown";
} catch (error) {
  console.error("Invalid SUPABASE_URL format:", error.message);
  process.exit(1);
}

// 🔐 SECURITY
app.use(helmet());
app.use(cors({
  origin: "*", // 🔥 later restrict to your domain
}));
app.use(express.json());

// 🚫 RATE LIMIT (ANTI-SPAM)
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
}));

// 📁 SERVE FRONTEND
app.use(express.static(path.join(__dirname, "public")));

// 🔗 SUPABASE CLIENT
const supabase = createClient(
  supabaseUrl,
  supabaseKey
);

// 🧠 HEALTH CHECK
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// 🚀 ADD ORDER
app.post("/order", async (req, res) => {
  try {
    let { name, product, quantity } = req.body;

    // 🔒 sanitize
    name = String(name).trim();
    product = String(product).trim();
    quantity = Number(quantity);

    // ✅ validation
    if (!name || !product) {
      return res.status(400).json({ error: "Missing fields" });
    }

    if (!Number.isInteger(quantity) || quantity <= 0) {
      return res.status(400).json({ error: "Invalid quantity" });
    }

    if (name.length > 50 || product.length > 50) {
      return res.status(400).json({ error: "Too long input" });
    }

    console.log("Insert request received:", { name, product, quantity });

    const { data, error } = await supabase
      .from("orders")
      .insert([{ name, product, quantity }])
      .select("id, name, product, quantity")
      .single();

    if (error) {
      console.error("Supabase insert error:", {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      });
      return res.status(500).json({ error: "Database error", details: error.message });
    }

    console.log("Order inserted successfully:", data);
    return res.json({ success: true, order: data });

  } catch (err) {
    console.error("SERVER ERROR:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

// 📦 GET ORDERS
app.get("/orders", async (req, res) => {
  try {
    console.log("Fetching latest orders from Supabase...");

    const { data, error } = await supabase
      .from("orders")
      .select("id, name, product, quantity")
      .order("id", { ascending: false })
      .limit(50); // 🔥 performance control

    if (error) {
      console.error("Supabase fetch error:", {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      });
      return res.status(500).json({ error: "Database error", details: error.message });
    }

    console.log(`Fetched ${data.length} orders from Supabase.`);
    return res.json(data);

  } catch (err) {
    console.error("SERVER ERROR:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

// ❌ 404 HANDLER
app.put("/order/:id", async (req, res) => {
  try {
    const orderId = Number(req.params.id);
    let { name, product, quantity } = req.body;

    if (!Number.isInteger(orderId) || orderId <= 0) {
      return res.status(400).json({ error: "Invalid order id" });
    }

    name = String(name).trim();
    product = String(product).trim();
    quantity = Number(quantity);

    if (!name || !product) {
      return res.status(400).json({ error: "Missing fields" });
    }

    if (!Number.isInteger(quantity) || quantity <= 0) {
      return res.status(400).json({ error: "Invalid quantity" });
    }

    if (name.length > 50 || product.length > 50) {
      return res.status(400).json({ error: "Too long input" });
    }

    console.log("Update request received:", { orderId, name, product, quantity });

    const { data, error } = await supabase
      .from("orders")
      .update({ name, product, quantity })
      .eq("id", orderId)
      .select("id, name, product, quantity")
      .single();

    if (error) {
      console.error("Supabase update error:", {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      });
      return res.status(500).json({ error: "Database error", details: error.message });
    }

    console.log("Order updated successfully:", data);
    return res.json({ success: true, order: data });
  } catch (err) {
    console.error("SERVER ERROR:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// 🚀 START SERVER
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Connected to Supabase project: ${supabaseProjectRef}`);
});
