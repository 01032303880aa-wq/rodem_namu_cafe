const STORAGE_KEY = "cafe-orders-v1";
const SETTINGS_KEY = "cafe-settings-v2";
const STAFF_AUTH_KEY = "cafe-staff-auth-v1";
const STAFF_PASSWORD_KEY = "cafe-staff-password-v1";
const API_BASE = location.protocol === "file:" ? "" : "/api";

const defaultSettings = {
  isOpen: true,
  receiveOptions: { pickup: true, delivery: true },
  menus: [
    { id: "ice-americano", name: "ICE 아메리카노", description: "차갑게, 깔끔하게", imageUrl: "", soldOut: false },
    { id: "ice-latte", name: "ICE 카페라떼", description: "차갑고 부드럽게", imageUrl: "", soldOut: false },
    { id: "hot-americano", name: "HOT 아메리카노", description: "따뜻하게, 진하게", imageUrl: "", soldOut: false },
    { id: "hot-latte", name: "HOT 카페라떼", description: "따뜻하고 고소하게", imageUrl: "", soldOut: false }
  ]
};

const form = document.querySelector("#order-form");
const nameInput = document.querySelector("#customer-name");
const message = document.querySelector("#form-message");
const submitOrderButton = document.querySelector("#submit-order");
const closedWindow = document.querySelector("#closed-window");
const menuGrid = document.querySelector("#menu-grid");
const receiveOptions = document.querySelector("#receive-options");
const orderList = document.querySelector("#order-list");
const orderCount = document.querySelector("#order-count");
const orderStatus = document.querySelector("#order-status");
const template = document.querySelector("#order-template");
const clearCompletedButton = document.querySelector("#clear-completed");
const resetOrdersButton = document.querySelector("#reset-orders");
const toggleOpenButton = document.querySelector("#toggle-open");
const deliveryLocationField = document.querySelector("#delivery-location-field");
const deliveryLocationInput = document.querySelector("#delivery-location");
const staffLogin = document.querySelector("#staff-login");
const staffDashboard = document.querySelector("#staff-dashboard");
const staffLoginForm = document.querySelector("#staff-login-form");
const staffPasswordInput = document.querySelector("#staff-password");
const staffMessage = document.querySelector("#staff-message");
const staffLogoutButton = document.querySelector("#staff-logout");
const tabButtons = document.querySelectorAll(".tab-button");
const staffPanels = document.querySelectorAll(".staff-panel");
const menuEditorList = document.querySelector("#menu-editor-list");
const menuEditorTemplate = document.querySelector("#menu-editor-template");
const addMenuButton = document.querySelector("#add-menu");
const saveMenuSettingsButton = document.querySelector("#save-menu-settings");
const menuSaveMessage = document.querySelector("#menu-save-message");
const pickupEnabledInput = document.querySelector("#pickup-enabled");
const deliveryEnabledInput = document.querySelector("#delivery-enabled");

let orders = [];
let settings = structuredClone(defaultSettings);
let staffPassword = sessionStorage.getItem(STAFF_PASSWORD_KEY) || "";
let staffAuthed = sessionStorage.getItem(STAFF_AUTH_KEY) === "true";
let refreshTimer = null;

function normalizeSettings(value) {
  const next = { ...defaultSettings, ...(value || {}) };
  const menus = Array.isArray(next.menus) ? next.menus : defaultSettings.menus;
  return {
    isOpen: next.isOpen !== false,
    receiveOptions: {
      pickup: next.receiveOptions?.pickup !== false,
      delivery: next.receiveOptions?.delivery !== false
    },
    menus: menus
      .map((menu) => ({
        id: String(menu.id || crypto.randomUUID()),
        name: String(menu.name || "").trim(),
        description: String(menu.description || "").trim(),
        imageUrl: String(menu.imageUrl || "").trim(),
        soldOut: Boolean(menu.soldOut)
      }))
      .filter((menu) => menu.name)
  };
}

function loadLocalOrders() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? []; } catch { return []; }
}

function saveLocalOrders() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
}

function loadLocalSettings() {
  try { return normalizeSettings(JSON.parse(localStorage.getItem(SETTINGS_KEY))); } catch { return normalizeSettings(defaultSettings); }
}

function saveLocalSettings() {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

async function apiRequest(path, options = {}) {
  if (!API_BASE) return null;
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (staffPassword) headers["X-Staff-Password"] = staffPassword;
  const response = await fetch(API_BASE + path, { ...options, headers });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || "요청을 처리하지 못했습니다.");
  }
  return response.json();
}

async function loadSettings() {
  if (!API_BASE) {
    settings = loadLocalSettings();
  } else {
    try {
      settings = normalizeSettings(await apiRequest("/settings"));
    } catch (error) {
      settings = normalizeSettings(await apiRequest("/status"));
    }
  }
  renderAllSettings();
}

async function saveSettings(nextSettings) {
  settings = normalizeSettings(nextSettings);
  if (API_BASE) {
    try {
      settings = normalizeSettings(await apiRequest("/settings", {
        method: "PATCH",
        body: JSON.stringify(settings)
      }));
    } catch (error) {
      settings = normalizeSettings(await apiRequest("/status", {
        method: "PATCH",
        body: JSON.stringify(settings)
      }));
    }
  } else {
    saveLocalSettings();
  }
  renderAllSettings();
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
    return apiRequest("/orders", { method: "POST", body: JSON.stringify(order) });
  }
  const menu = settings.menus.find((item) => item.id === order.menuId);
  orders.push({
    id: crypto.randomUUID(),
    ...order,
    menu: menu?.name || "",
    done: false,
    createdAt: new Date().toISOString()
  });
  saveLocalOrders();
  return order;
}

function isCustomerFormActive() {
  return form.contains(document.activeElement);
}

function renderAllSettings(options = {}) {
  renderStatus();
  if (!isCustomerFormActive() || options.forceCustomerForm) {
    renderMenuOptions();
    renderReceiveOptions();
  }
}

function renderStatus() {
  closedWindow.hidden = settings.isOpen;
  submitOrderButton.disabled = !settings.isOpen;
  submitOrderButton.textContent = settings.isOpen ? "주문하기" : "주문 마감";
  orderStatus.textContent = settings.isOpen ? "주문 가능" : "주문 마감";
  orderStatus.classList.toggle("is-closed", !settings.isOpen);
  toggleOpenButton.textContent = settings.isOpen ? "주문 마감" : "주문 재개";
  toggleOpenButton.classList.toggle("is-closed", !settings.isOpen);
}

function createMenuPhoto(menu) {
  const photo = document.createElement("span");
  photo.className = "menu-photo";
  if (menu.imageUrl) {
    const img = document.createElement("img");
    img.src = menu.imageUrl;
    img.alt = "";
    img.onerror = () => { photo.textContent = "사진"; img.remove(); };
    photo.append(img);
  } else {
    photo.textContent = "사진";
  }
  return photo;
}

function renderMenuOptions() {
  menuGrid.replaceChildren();
  const availableMenus = settings.menus;
  if (availableMenus.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "등록된 메뉴가 없습니다.";
    menuGrid.append(empty);
    return;
  }
  availableMenus.forEach((menu) => {
    const label = document.createElement("label");
    label.className = "menu-option";
    label.classList.toggle("is-sold-out", menu.soldOut);
    const input = document.createElement("input");
    input.type = "radio";
    input.name = "menu-id";
    input.value = menu.id;
    input.required = true;
    input.disabled = menu.soldOut;
    const text = document.createElement("span");
    text.className = "menu-text";
    const name = document.createElement("strong");
    name.textContent = menu.name;
    const desc = document.createElement("small");
    desc.textContent = menu.description || " ";
    text.append(name, desc);
    if (menu.soldOut) {
      const badge = document.createElement("span");
      badge.className = "soldout-badge";
      badge.textContent = "품절";
      text.append(badge);
    }
    label.append(input, createMenuPhoto(menu), text);
    menuGrid.append(label);
  });
}

function renderReceiveOptions() {
  receiveOptions.replaceChildren();
  const choices = [];
  if (settings.receiveOptions.pickup) choices.push({ value: "픽업", label: "픽업" });
  if (settings.receiveOptions.delivery) choices.push({ value: "배달", label: "배달" });
  choices.forEach((choice, index) => {
    const label = document.createElement("label");
    label.className = "choice-option";
    const input = document.createElement("input");
    input.type = "radio";
    input.name = "receive-type";
    input.value = choice.value;
    input.required = true;
    input.checked = index === 0;
    input.addEventListener("change", updateDeliveryField);
    const span = document.createElement("span");
    span.textContent = choice.label;
    label.append(input, span);
    receiveOptions.append(label);
  });
  updateDeliveryField();
}

function updateDeliveryField() {
  const selectedType = document.querySelector('input[name="receive-type"]:checked')?.value ?? "";
  const isDelivery = selectedType === "배달";
  deliveryLocationField.hidden = !isDelivery;
  deliveryLocationInput.required = isDelivery;
  if (!isDelivery) deliveryLocationInput.value = "";
}

function orderReceiveText(order) {
  if (order.receiveType === "배달") return order.deliveryLocation ? "배달: " + order.deliveryLocation : "배달";
  return "픽업";
}

function formatTime(dateText) {
  return new Intl.DateTimeFormat("ko-KR", { hour: "2-digit", minute: "2-digit" }).format(new Date(dateText));
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

function renderMenuEditor() {
  menuEditorList.replaceChildren();
  pickupEnabledInput.checked = settings.receiveOptions.pickup;
  deliveryEnabledInput.checked = settings.receiveOptions.delivery;
  settings.menus.forEach((menu) => addMenuEditorCard(menu));
}

function addMenuEditorCard(menu = {}) {
  const card = menuEditorTemplate.content.firstElementChild.cloneNode(true);
  card.dataset.menuId = menu.id || crypto.randomUUID();
  const preview = card.querySelector(".menu-editor-preview");
  const nameInput = card.querySelector(".editor-menu-name");
  const descriptionInput = card.querySelector(".editor-menu-description");
  const fileInput = card.querySelector(".editor-menu-file");
  const imageInput = card.querySelector(".editor-menu-image");
  const soldOutInput = card.querySelector(".editor-menu-soldout");
  const removeButton = card.querySelector(".remove-menu");

  nameInput.value = menu.name || "";
  descriptionInput.value = menu.description || "";
  imageInput.value = menu.imageUrl || "";
  soldOutInput.checked = Boolean(menu.soldOut);

  function updatePreview() {
    preview.replaceChildren();
    if (imageInput.value.trim()) {
      const img = document.createElement("img");
      img.src = imageInput.value.trim();
      img.alt = "";
      img.onerror = () => { preview.textContent = "사진"; img.remove(); };
      preview.append(img);
    } else {
      preview.textContent = "사진";
    }
  }

  fileInput.addEventListener("change", async () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      menuSaveMessage.classList.add("is-error");
      menuSaveMessage.textContent = "이미지 파일만 선택할 수 있습니다.";
      fileInput.value = "";
      return;
    }
    if (file.size > 700 * 1024) {
      menuSaveMessage.classList.add("is-error");
      menuSaveMessage.textContent = "사진은 700KB 이하로 선택해주세요.";
      fileInput.value = "";
      return;
    }
    imageInput.value = await readFileAsDataUrl(file);
    menuSaveMessage.classList.remove("is-error");
    menuSaveMessage.textContent = "사진이 선택되었습니다. 메뉴판 저장을 눌러주세요.";
    updatePreview();
  });

  imageInput.addEventListener("input", updatePreview);
  removeButton.addEventListener("click", () => card.remove());
  updatePreview();
  menuEditorList.append(card);
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("사진을 읽지 못했습니다."));
    reader.readAsDataURL(file);
  });
}

function collectMenuEditorSettings() {
  const cards = [...menuEditorList.querySelectorAll(".menu-editor-card")];
  const menus = cards
    .map((card) => ({
      id: card.dataset.menuId || crypto.randomUUID(),
      name: card.querySelector(".editor-menu-name").value.trim(),
      description: card.querySelector(".editor-menu-description").value.trim(),
      imageUrl: card.querySelector(".editor-menu-image").value.trim(),
      soldOut: card.querySelector(".editor-menu-soldout").checked
    }))
    .filter((menu) => menu.name);
  return {
    ...settings,
    receiveOptions: {
      pickup: pickupEnabledInput.checked,
      delivery: deliveryEnabledInput.checked
    },
    menus
  };
}

async function refreshOrders() {
  try {
    await loadSettings();
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
  if (refreshTimer) window.clearInterval(refreshTimer);
  refreshTimer = null;
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
    renderMenuEditor();
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
  const menuId = String(formData.get("menu-id") || "");
  const receiveType = String(formData.get("receive-type") || "");
  const deliveryLocation = String(formData.get("delivery-location") || "").trim();
  const menu = settings.menus.find((item) => item.id === menuId);

  if (!settings.isOpen) {
    message.textContent = "현재 주문이 마감되었습니다.";
    return;
  }
  if (!name || !menu || menu.soldOut || !receiveType) {
    message.textContent = "이름, 메뉴, 수령 방법을 확인해주세요.";
    return;
  }
  if (receiveType === "배달" && !deliveryLocation) {
    deliveryLocationInput.focus();
    return;
  }

  try {
    await saveOrder({ name, menuId, receiveType, deliveryLocation });
    await refreshOrders();
    form.reset();
    renderAllSettings({ forceCustomerForm: true });
    nameInput.focus();
    message.classList.remove("is-error");
    message.textContent = name + "님의 " + menu.name + " 주문이 접수되었습니다.";
  } catch (error) {
    message.classList.add("is-error");
    message.textContent = error.message;
  }
});

staffLoginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  staffPassword = staffPasswordInput.value.trim();
  try {
    staffMessage.classList.remove("is-error");
    if (API_BASE) await apiRequest("/orders");
    else if (staffPassword !== "cafe1234") throw new Error("비밀번호가 맞지 않습니다.");
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

tabButtons.forEach((button) => {
  button.addEventListener("click", () => {
    tabButtons.forEach((tab) => tab.classList.toggle("active", tab === button));
    staffPanels.forEach((panel) => panel.classList.toggle("active", panel.id === button.dataset.panel));
    if (button.dataset.panel === "menu-panel" && menuEditorList.children.length === 0) {
      renderMenuEditor();
    }
  });
});

addMenuButton.addEventListener("click", () => addMenuEditorCard({ name: "새 메뉴", description: "", imageUrl: "", soldOut: false }));

saveMenuSettingsButton.addEventListener("click", async () => {
  const nextSettings = collectMenuEditorSettings();
  if (nextSettings.menus.length === 0) {
    menuSaveMessage.classList.add("is-error");
    menuSaveMessage.textContent = "메뉴를 1개 이상 남겨주세요.";
    return;
  }
  if (!nextSettings.receiveOptions.pickup && !nextSettings.receiveOptions.delivery) {
    menuSaveMessage.classList.add("is-error");
    menuSaveMessage.textContent = "수령 방법을 1개 이상 선택해주세요.";
    return;
  }
  try {
    await saveSettings(nextSettings);
    renderMenuEditor();
    menuSaveMessage.classList.remove("is-error");
    menuSaveMessage.textContent = "메뉴판이 저장되었습니다.";
  } catch (error) {
    menuSaveMessage.classList.add("is-error");
    menuSaveMessage.textContent = error.message;
  }
});

clearCompletedButton.addEventListener("click", async () => {
  if (API_BASE) orders = await apiRequest("/orders/completed", { method: "DELETE" });
  else {
    orders = orders.filter((order) => !order.done);
    saveLocalOrders();
  }
  renderOrders();
});

toggleOpenButton.addEventListener("click", async () => {
  try {
    await saveSettings({ ...settings, isOpen: !settings.isOpen });
  } catch (error) {
    staffMessage.classList.add("is-error");
    staffMessage.textContent = error.message;
  }
});

resetOrdersButton.addEventListener("click", async () => {
  const confirmed = window.confirm("모든 주문을 삭제할까요?");
  if (!confirmed) return;
  if (API_BASE) orders = await apiRequest("/orders", { method: "DELETE" });
  else {
    orders = [];
    saveLocalOrders();
  }
  renderOrders();
});

loadSettings();
if (!API_BASE) orders = loadLocalOrders();
setStaffView(staffAuthed);
