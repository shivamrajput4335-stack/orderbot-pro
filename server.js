const express = require("express");
const cors = require("cors");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const app = express();

// 🔐 MIDDLEWARE
app.use(cors());
app.use(express.json());

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
      return res.status(401).json({ error: "No token" });
    }

    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user) {
      return res.status(401).json({ error: "Invalid token" });
    }

    req.user = data.user;
    next();

  } catch (err) {
    console.error("Auth error:", err);
    return res.status(500).json({ error: "Auth failed" });
  }
}

// 🚀 CREATE ORDER
app.post("/order", verifyUser, async (req, res) => {
  try {
    let { name, product, quantity } = req.body;

    name = String(name).trim();
    product = String(product).trim();
    const qty = Number(quantity);

    if (!name || !product) {
      return res.status(400).json({ error: "Missing fields" });
    }

    if (isNaN(qty) || qty <= 0) {
      return res.status(400).json({ error: "Invalid quantity" });
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
      return res.status(500).json({ error: error.message });
    }

    res.json({ success: true, order: data });

  } catch (err) {
    console.error("Server error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// 📦 GET ORDERS
app.get("/orders", verifyUser, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .eq("user_id", req.user.id)
      .order("created_at", { ascending: false });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json(data);

  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// ❌ DELETE ORDER
app.delete("/order/:id", verifyUser, async (req, res) => {
  try {
    const id = req.params.id;

    const { error } = await supabase
      .from("orders")
      .delete()
      .eq("id", id)
      .eq("user_id", req.user.id);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ success: true });

  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// 🚀 START SERVER
const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});