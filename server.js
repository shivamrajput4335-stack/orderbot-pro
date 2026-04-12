const express = require("express");
const cors = require("cors");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const rateLimit = require("express-rate-limit");
const helmet = require("helmet");

const app = express();


// 🔐 SECURITY
app.use(helmet());
app.use(cors());
app.use(express.json());


// 🚫 RATE LIMIT (ANTI-SPAM)
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: "Too many requests, try later"
}));


// 📁 SERVE FRONTEND
app.use(express.static(path.join(__dirname, "public")));


// 🔗 SUPABASE CONNECTION
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);


// 🧠 HEALTH CHECK / HOME
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});


// 🚀 CREATE ORDER
app.post("/order", async (req, res) => {
  try {
    let { name, product, quantity } = req.body;

    // validation
    if (!name || !product || quantity === undefined) {
      return res.status(400).json({ error: "Missing fields" });
    }

    const qty = Number(quantity);

    if (isNaN(qty) || qty <= 0) {
      return res.status(400).json({ error: "Invalid quantity" });
    }

    if (name.length > 50 || product.length > 50) {
      return res.status(400).json({ error: "Input too long" });
    }

    const { error } = await supabase
      .from("orders")
      .insert([{ name, product, quantity: qty }]);

    if (error) {
      console.error(error);
      return res.status(500).json({ error: "Database error" });
    }

    res.json({ message: "✅ Order saved" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});


// 📦 GET ALL ORDERS
app.get("/orders", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .order("id", { ascending: false });

    if (error) {
      return res.status(500).json({ error: "Database error" });
    }

    res.json(data);

  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});


// ❌ DELETE ORDER
app.delete("/order/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from("orders")
      .delete()
      .eq("id", id);

    if (error) {
      return res.status(500).json({ error: "Delete failed" });
    }

    res.json({ message: "Deleted" });

  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});


// 🚀 START SERVER
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🔥 Secure Server running on port ${PORT}`);
});