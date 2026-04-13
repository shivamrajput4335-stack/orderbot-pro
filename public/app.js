// 🌐 API
const API = "https://orderbot-pro.onrender.com";

// 🔐 SUPABASE CLIENT
const supabase = window.supabase.createClient(
  "https://xaajavxegbcahusslypx.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhhYWphdnhlZ2JjYWh1c3NseXB4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU5MzM2NzMsImV4cCI6MjA5MTUwOTY3M30.zmuiRqI2juksLci9BGgG-p1MIrI9BGBDLY6J6pasUps"
);

// 🔐 LOGIN
async function login(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    alert(error.message);
  } else {
    localStorage.setItem("token", data.session.access_token);
    alert("Logged in");
  }
}

// 🔐 AUTH HELPERS (FIX ADDED)
function getToken() {
  return localStorage.getItem("token");
}

function requireAuth() {
  const token = getToken();
  if (!token) {
    alert("Please login first");
    throw new Error("No token");
  }
  return token;
}

// 📦 DOM ELEMENTS
const formEl = document.getElementById("order-form");
const statusEl = document.getElementById("status");
const ordersEl = document.getElementById("orders");
const submitButton = document.getElementById("submit-order");
const cancelEditButton = document.getElementById("cancel-edit");
const nameInput = document.getElementById("name");
const productInput = document.getElementById("product");
const quantityInput = document.getElementById("quantity");

let isSubmitting = false;
let editingOrderId = null;

// 🚀 SUBMIT ORDER (FIXED)
async function submitOrder(e) {
  e.preventDefault();

  if (isSubmitting) return;

  const token = requireAuth(); // 🔥 FIX

  const name = nameInput.value.trim();
  const product = productInput.value.trim();
  const quantity = Number(quantityInput.value);

  if (!name || !product || !quantity) {
    alert("Fill all fields");
    return;
  }

  isSubmitting = true;

  try {
    const res = await fetch(`${API}/order`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}` // 🔥 FIX
      },
      body: JSON.stringify({ name, product, quantity })
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.error || "Error");
    } else {
      formEl.reset();
      loadOrders();
    }

  } catch (err) {
    console.error(err);
    alert("Server error");
  }

  isSubmitting = false;
}

// 📦 LOAD ORDERS (FIXED)
async function loadOrders() {
  const token = getToken();
  if (!token) return; // 🔥 FIX

  try {
    const res = await fetch(`${API}/orders`, {
      headers: {
        Authorization: `Bearer ${token}` // 🔥 FIX
      }
    });

    const data = await res.json();

    ordersEl.innerHTML = "";

    data.forEach(order => {
      const div = document.createElement("div");
      div.className = "order";

      div.innerHTML = `
        <b>${order.name}</b>
        <p>${order.product}</p>
        <p>Qty: ${order.quantity}</p>
        <button onclick="deleteOrder(${order.id})">Delete</button>
      `;

      ordersEl.appendChild(div);
    });

  } catch (err) {
    console.error(err);
  }
}

// ❌ DELETE ORDER (FIXED)
async function deleteOrder(id) {
  const token = getToken();

  if (!token) return;

  try {
    await fetch(`${API}/order/${id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}` // 🔥 FIX
      }
    });

    loadOrders();

  } catch (err) {
    console.error(err);
  }
}

// 🚀 INIT
document.addEventListener("DOMContentLoaded", () => {
  formEl.addEventListener("submit", submitOrder);
  loadOrders();
});