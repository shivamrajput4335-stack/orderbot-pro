const supabase = window.supabase.createClient(
  "https://xaajavxegbcahusslypx.supabase.co.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhhYWphdnhlZ2JjYWh1c3NseXB4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU5MzM2NzMsImV4cCI6MjA5MTUwOTY3M30.zmuiRqI2juksLci9BGgG-p1MIrI9BGBDLY6J6pasUps"
);

async function signup(email, password) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) alert(error.message);
  else alert("Signup successful");
}

async function login(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    alert(error.message);
  } else {
    localStorage.setItem("token", data.session.access_token); // 🔥 IMPORTANT
    alert("Logged in");
  }
}

const token = localStorage.getItem("token");

fetch(`${API}/order`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`
  },
  body: JSON.stringify({ name, product, quantity })
});

const jwt = require("jsonwebtoken");

function verifyUser(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) return res.status(401).json({ error: "No token" });

  try {
    const decoded = jwt.decode(token);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}



const API = window.location.origin;
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
let ordersState = [];

function getOrderDisplayValues(order) {
  const name =
    typeof order?.name === "string" && order.name.trim()
      ? order.name.trim()
      : "No Name";
  const product =
    typeof order?.product === "string" && order.product.trim()
      ? order.product.trim()
      : "No Product";
  const quantity = Number.isFinite(Number(order?.quantity))
    ? Number(order.quantity)
    : 0;

  return { name, product, quantity };
}

function setStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.style.color = isError ? "#fca5a5" : "#bbf7d0";
}

function validateOrderForm(name, product, quantity) {
  if (!name) {
    return "Name is required";
  }

  if (!product) {
    return "Product is required";
  }

  if (!Number.isInteger(quantity) || quantity <= 0) {
    return "Quantity must be greater than 0";
  }

  return null;
}

async function parseJsonResponse(response) {
  const raw = await response.text();

  if (!raw) {
    return {};
  }

  try {
    return JSON.parse(raw);
  } catch {
    throw new Error("Invalid JSON response from server");
  }
}

async function submitOrder(event) {
  if (event) {
    event.preventDefault();
  }

  console.log("clicked");

  if (isSubmitting) {
    console.log("Submission skipped because a request is already in progress");
    return;
  }

  const name = nameInput.value.trim();
  const product = productInput.value.trim();
  const quantity = Number(quantityInput.value);
  const validationError = validateOrderForm(name, product, quantity);

  if (validationError) {
    console.warn("Validation failed for order submission", {
      name,
      product,
      quantity,
      validationError,
    });
    setStatus(validationError, true);
    return;
  }

  const isEditing = editingOrderId !== null;
  const endpoint = isEditing ? `${API}/order/${editingOrderId}` : `${API}/order`;
  const method = isEditing ? "PUT" : "POST";

  console.log("Submitting order", { name, product, quantity, endpoint, method, editingOrderId });
  setStatus(isEditing ? "Updating..." : "Sending...");
  isSubmitting = true;
  submitButton.disabled = true;
  submitButton.textContent = isEditing ? "Updating..." : "Submitting...";

  try {
    const response = await fetch(endpoint, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, product, quantity })
    });

    const result = await parseJsonResponse(response);
    console.log(`${method} /order response received`, { ok: response.ok, status: response.status, result });

    if (!response.ok) {
      throw new Error(result.error || `Failed to ${isEditing ? "update" : "submit"} order`);
    }

    setStatus(isEditing ? "Order updated" : "Order added");
    resetForm();
    await loadOrders();
  } catch (error) {
    console.error("Order submission failed", error);
    setStatus(error.message || `Error ${isEditing ? "updating" : "submitting"} order`, true);
  } finally {
    isSubmitting = false;
    submitButton.disabled = false;
    submitButton.textContent = editingOrderId ? "Update Order" : "Submit";
  }
}

function startEditOrder(order) {
  editingOrderId = order.id;
  nameInput.value = typeof order.name === "string" ? order.name : "";
  productInput.value = typeof order.product === "string" ? order.product : "";
  quantityInput.value = Number.isFinite(Number(order.quantity))
    ? Number(order.quantity)
    : "";
  submitButton.textContent = "Update Order";
  cancelEditButton.hidden = false;
  setStatus(`Editing order #${order.id}`);
  nameInput.focus();
}

function resetForm() {
  editingOrderId = null;
  formEl.reset();
  submitButton.textContent = "Submit";
  cancelEditButton.hidden = true;
}

async function deleteOrder(orderId) {
  const order = ordersState.find((item) => item.id === orderId);

  if (!order) {
    setStatus("Order not found", true);
    return;
  }

  const confirmed = window.confirm("Delete?");

  if (!confirmed) {
    return;
  }
  setStatus("Deleting...");

  try {
    const response = await fetch(`${API}/order/${orderId}`, {
      method: "DELETE",
    });

    const result = await parseJsonResponse(response);
    console.log("DELETE /order response received", {
      ok: response.ok,
      status: response.status,
      result,
    });

    if (!response.ok) {
      throw new Error(result.error || "Failed to delete order");
    }

    if (editingOrderId === orderId) {
      resetForm();
    }

    setStatus("Order deleted");
    await loadOrders();
  } catch (error) {
    console.error("Order deletion failed", error);
    setStatus(error.message || "Error deleting order", true);
  }
}

function renderOrders() {
  if (ordersState.length === 0) {
    ordersEl.innerHTML = "<div class=\"order\">No orders yet.</div>";
    return;
  }

  ordersEl.innerHTML = "";

  ordersState.forEach((order) => {
    console.log("rendering order", order);
    const displayOrder = getOrderDisplayValues(order);
    const div = document.createElement("div");
    div.className = "order";
    div.innerHTML = `
      <strong>${displayOrder.name}</strong>
      <p>${displayOrder.product}</p>
      <p>Qty: ${displayOrder.quantity}</p>
      <div class="order-actions">
        <button type="button" class="edit-btn">Edit</button>
        <button type="button" class="delete-btn">Delete</button>
      </div>
    `;

    div.querySelector(".edit-btn").addEventListener("click", () => {
      startEditOrder(order);
    });

    div.querySelector(".delete-btn").addEventListener("click", () => {
      deleteOrder(order.id);
    });

    ordersEl.appendChild(div);
  });
}

async function loadOrders() {
  console.log("Loading orders", { api: `${API}/orders` });
  ordersEl.innerHTML = "<div class=\"order\">Loading orders...</div>";

  try {
    const response = await fetch(`${API}/orders`);
    const data = await parseJsonResponse(response);
    console.log("GET /orders response received", { ok: response.ok, status: response.status, count: Array.isArray(data) ? data.length : null });

    if (!response.ok) {
      throw new Error(data.error || "Failed to load orders");
    }

    ordersState = Array.isArray(data) ? data : [];
    renderOrders();
  } catch (error) {
    ordersEl.innerHTML = `<div class="order">Failed to load orders: ${error.message || "Unknown error"}</div>`;
    console.error("Failed to load orders", error);
  }
}

cancelEditButton.addEventListener("click", () => {
  resetForm();
  setStatus("Edit cancelled");
});


document.addEventListener("DOMContentLoaded", () => {
  submitButton.addEventListener("click", submitOrder);
  formEl.addEventListener("submit", submitOrder);
  console.log("OrderBot frontend loaded");
  loadOrders();
});
