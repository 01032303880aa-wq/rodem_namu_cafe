const STORAGE_KEY = "cafe-orders-v1";
const STAFF_AUTH_KEY = "cafe-staff-auth-v1";
const STAFF_PASSWORD_KEY = "cafe-staff-password-v1";
const API_BASE = location.protocol === "file:" ? "" : "/api";

const form = document.querySelector("#order-form");
const nameInput = document.querySelector("#customer-name");
const message = document.querySelector("#form-message");
const submitOrderButton = document.querySelector("#submit-order");
const closedWindow = document.querySelector("#closed-window");
const orderList = document.querySelector("#order-list");
const orderCount = document.querySelector("#order-count");
const orderStatus = document.querySelector("#order-status");
const template = document.querySelector("#order-template");
const clearCompletedButton = document.querySelector("#clear-completed");
const resetOrdersButton = document.querySelector("#reset-orders");
const toggleOpenButton = document.querySelector("#toggle-open");
const receiveTypeInputs = document.querySelectorAll('input[name="receive-type"]');
const deliveryLocationField = document.querySelector("#delivery-location-field");
const deliveryLocationInput = document.querySelector("#delivery-location");
const staffLogin = document.querySelector("#staff-login");
const staffDashboard = document.querySelector("#staff-dashboard");
const staffLoginForm = document.querySelector("#staff-login-form");
const staffPasswordInput = document.querySelector("#staff-password");
const staffMessage = document.querySelector("#staff-message");
const staffLogoutButton = document.querySelector("#staff-logout");

let orders = [];
let staffPassword = sessionStorage.getItem(STAFF_PASSWORD_KEY) || "";
let staffAuthed = sessionStorage.getItem(STAFF_AUTH_KEY) === "true";
let refreshTimer = null;
let isOpen = true;

function loadLocalOrders() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? [];
  } catch {
    return [];
  }
}

function saveLocalOrders() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
}

async function apiRequest(path, options = {}) {
  if (!API_BASE) return null;

  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };

  if (staffPassword) {
    headers["X-Staff-Password"] = staffPassword;
  }

  const response = await fetch(API_BASE + path, {
    ...options,
    headers
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || "요청을 처리하지 못했습니다.");
  }

  return response.json();
}

async function loadStatus() {
  if (!API_BASE) {
    isOpen = localStorage.getItem("cafe-is-open-v1") !== "false";
    renderStatus();
    return;
  }

  const status = await apiRequest("/status");
  isOpen = status.isOpen !== false;
  renderStatus();
}

async function saveStatus(nextIsOpen) {
  isOpen = nextIsOpen;

  if (API_BASE) {
    const status = await apiRequest("/status", {
      method: "PATCH",
      body: JSON.stringify({ isOpen })
    });
    isOpen = status.isOpen !== false;
  } else {
    localStorage.setItem("cafe-is-open-v1", String(isOpen));
  }

  renderStatus();
}

function renderStatus() {
  closedWindow.hidden = isOpen;
  submitOrderButton.disabled = !isOpen;
  submitOrderButton.textContent = isOpen ? "주문하기" : "주문 마감";

  if (orderStatus) {
    orderStatus.textContent = isOpen ? "주문 가능" : "주문 마감";
    orderStatus.classList.toggle("is-closed", !isOpen);
  }

  if (toggleOpenButton) {
    toggleOpenButton.textContent = isOpen ? "주문 마감" : "주문 재개";
    toggleOpenButton.classList.toggle("is-closed", !isOpen);
  }
}

async function loadOrders() {
  if (!API_BASE) {
    orders = loadLocalOrders();
    return;
  }

  if (!staffAuthed) return;
  orders = await apiRequest("/orders");
}

async function saveOrder(order) {
  if (API_BASE) {
    return apiRequest("/orders", {
      method: "POST",
      body: JSON.stringify(order)
    });
  }

  orders.push({
    id: crypto.randomUUID(),
    ...order,
    done: false,
    createdAt: new Date().toISOString()
  });
  saveLocalOrders();
  return order;
}

function formatTime(dateText) {
  return new Intl.DateTimeFormat("ko-KR", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(dateText));
}

function updateDeliveryField() {
  const selectedType = document.querySelector('input[name="receive-type"]:checked')?.value ?? "픽업";
  const isDelivery = selectedType === "배달";
  deliveryLocationField.hidden = !isDelivery;
  deliveryLocationInput.required = isDelivery;

  if (!isDelivery) {
    deliveryLocationInput.value = "";
  }
}

function orderReceiveText(order) {
  if (order.receiveType === "배달") {
    return order.deliveryLocation ? "배달: " + order.deliveryLocation : "배달";
  }
  return "픽업";
}

function renderOrders() {
  if (!staffAuthed) return;

  orderList.replaceChildren();
  const waitingOrders = orders.filter((order) => !order.done);
  orderCount.textContent = "대기 주문 " + waitingOrders.length + "건";

  if (orders.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "아직 들어온 주문이 없습니다.";
    orderList.append(empty);
    return;
  }

  orders
    .slice()
    .sort((a, b) => Number(a.done) - Number(b.done) || new Date(a.createdAt) - new Date(b.createdAt))
    .forEach((order) => {
      const card = template.content.firstElementChild.cloneNode(true);
      const completeButton = card.querySelector(".complete-button");

      card.classList.toggle("done", order.done);
      card.querySelector(".order-name").textContent = order.name;
      card.querySelector(".order-menu").textContent = order.menu;
      card.querySelector(".order-time").textContent = formatTime(order.createdAt) + " 접수 · " + orderReceiveText(order);
      completeButton.textContent = order.done ? "완료됨" : "완료";
      completeButton.addEventListener("click", () => toggleOrder(order.id));
      orderList.append(card);
    });
}

async function refreshOrders() {
  try {
    await loadStatus();

    if (!staffAuthed) return;
    await loadOrders();
    renderOrders();
  } catch (error) {
    staffMessage.classList.add("is-error");
    staffMessage.textContent = error.message;
    setStaffView(false);
  }
}

function startRefresh() {
  stopRefresh();
  refreshTimer = window.setInterval(refreshOrders, 3000);
}

function stopRefresh() {
  if (refreshTimer) {
    window.clearInterval(refreshTimer);
    refreshTimer = null;
  }
}

async function setStaffView(isAuthed) {
  staffAuthed = isAuthed;
  staffLogin.hidden = isAuthed;
  staffDashboard.hidden = !isAuthed;

  if (isAuthed) {
    sessionStorage.setItem(STAFF_AUTH_KEY, "true");
    sessionStorage.setItem(STAFF_PASSWORD_KEY, staffPassword);
    staffMessage.textContent = "";
    staffPasswordInput.value = "";
    await refreshOrders();
    startRefresh();
  } else {
    sessionStorage.removeItem(STAFF_AUTH_KEY);
    sessionStorage.removeItem(STAFF_PASSWORD_KEY);
    staffPassword = "";
    orderList.replaceChildren();
    stopRefresh();
  }
}

async function toggleOrder(id) {
  if (API_BASE) {
    orders = await apiRequest("/orders/" + id + "/toggle", { method: "PATCH" });
  } else {
    orders = orders.map((order) => (order.id === id ? { ...order, done: !order.done } : order));
    saveLocalOrders();
  }
  renderOrders();
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const formData = new FormData(form);
  const name = String(formData.get("customer-name")).trim();
  const menu = String(formData.get("menu"));
  const receiveType = String(formData.get("receive-type") || "픽업");
  const deliveryLocation = String(formData.get("delivery-location") || "").trim();

  if (!name || !menu) return;
  if (!isOpen) {
    message.textContent = "현재 주문이 마감되었습니다.";
    return;
  }
  if (receiveType === "배달" && !deliveryLocation) {
    deliveryLocationInput.focus();
    return;
  }

  try {
    await saveOrder({ name, menu, receiveType, deliveryLocation });
    await refreshOrders();
    form.reset();
    nameInput.focus();
    message.textContent = name + "님의 " + menu + " 주문이 접수되었습니다.";
    updateDeliveryField();
  } catch (error) {
    message.textContent = error.message;
  }
});

staffLoginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  staffPassword = staffPasswordInput.value.trim();

  try {
    staffMessage.classList.remove("is-error");
    if (API_BASE) {
      await apiRequest("/orders");
    } else if (staffPassword !== "cafe1234") {
      throw new Error("비밀번호가 맞지 않습니다.");
    }
    await setStaffView(true);
  } catch (error) {
    staffMessage.classList.add("is-error");
    staffMessage.textContent = error.message;
    staffPasswordInput.select();
  }
});

staffLogoutButton.addEventListener("click", () => {
  setStaffView(false);
  staffPasswordInput.focus();
});

receiveTypeInputs.forEach((input) => {
  input.addEventListener("change", updateDeliveryField);
});

clearCompletedButton.addEventListener("click", async () => {
  if (API_BASE) {
    orders = await apiRequest("/orders/completed", { method: "DELETE" });
  } else {
    orders = orders.filter((order) => !order.done);
    saveLocalOrders();
  }
  renderOrders();
});

toggleOpenButton.addEventListener("click", async () => {
  try {
    await saveStatus(!isOpen);
  } catch (error) {
    staffMessage.classList.add("is-error");
    staffMessage.textContent = error.message;
  }
});

resetOrdersButton.addEventListener("click", async () => {
  const confirmed = window.confirm("모든 주문을 삭제할까요?");
  if (!confirmed) return;

  if (API_BASE) {
    orders = await apiRequest("/orders", { method: "DELETE" });
  } else {
    orders = [];
    saveLocalOrders();
  }
  renderOrders();
});

updateDeliveryField();
loadStatus();
if (!API_BASE) {
  orders = loadLocalOrders();
}
setStaffView(staffAuthed);
