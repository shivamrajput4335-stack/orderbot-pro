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
    submitButton.textContent = editingOrderId !== null ? "Update Order" : "Submit";
  }
}

function startEditOrder(order) {
  editingOrderId = order.id;
  nameInput.value = order.name;
  productInput.value = order.product;
  quantityInput.value = order.quantity;
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

    if (!Array.isArray(data) || data.length === 0) {
      ordersEl.innerHTML = "<div class=\"order\">No orders yet.</div>";
      return;
    }

    ordersEl.innerHTML = "";

    data.forEach((order) => {
      const div = document.createElement("div");
      div.className = "order";
      div.innerHTML = `
        <b>${order.name}</b><br>
        ${order.product}<br>
        Qty: ${order.quantity}
      `;

      const actions = document.createElement("div");
      actions.className = "order-actions";

      const editButton = document.createElement("button");
      editButton.type = "button";
      editButton.className = "order-action edit-action";
      editButton.textContent = "Edit";
      editButton.addEventListener("click", () => startEditOrder(order));

      actions.appendChild(editButton);
      div.appendChild(actions);
      ordersEl.appendChild(div);
    });
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
