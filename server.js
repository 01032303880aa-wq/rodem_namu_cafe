const http = require("node:http");
const fs = require("node:fs/promises");
const path = require("node:path");
const crypto = require("node:crypto");

const PORT = Number(process.env.PORT || 3000);
const STAFF_PASSWORD = process.env.STAFF_PASSWORD || "cafe1234";
const PUBLIC_DIR = __dirname;
const DATA_DIR = process.env.DATA_DIR || __dirname;
const DATA_FILE = path.join(DATA_DIR, "orders.json");
const SETTINGS_FILE = path.join(DATA_DIR, "settings.json");
const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8"
};

async function readOrders() {
  try {
    const text = await fs.readFile(DATA_FILE, "utf8");
    return JSON.parse(text);
  } catch {
    return [];
  }
}

async function writeOrders(orders) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(orders, null, 2), "utf8");
}

async function readSettings() {
  try {
    const text = await fs.readFile(SETTINGS_FILE, "utf8");
    return { isOpen: true, ...JSON.parse(text) };
  } catch {
    return { isOpen: true };
  }
}

async function writeSettings(settings) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(SETTINGS_FILE, JSON.stringify(settings, null, 2), "utf8");
}

function sendJson(response, statusCode, data) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  response.end(JSON.stringify(data));
}

function isStaffRequest(request) {
  return request.headers["x-staff-password"] === STAFF_PASSWORD;
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > 10000) {
        reject(new Error("Request body is too large."));
        request.destroy();
      }
    });
    request.on("end", () => resolve(body));
    request.on("error", reject);
  });
}

async function handleApi(request, response, pathname) {
  if (request.method === "GET" && pathname === "/api/health") {
    sendJson(response, 200, { ok: true });
    return;
  }

  if (request.method === "GET" && pathname === "/api/status") {
    sendJson(response, 200, await readSettings());
    return;
  }

  if (request.method === "PATCH" && pathname === "/api/status") {
    if (!isStaffRequest(request)) {
      sendJson(response, 401, { error: "직원 비밀번호가 필요합니다." });
      return;
    }
    const body = JSON.parse((await readBody(request)) || "{}");
    const settings = { isOpen: body.isOpen !== false };
    await writeSettings(settings);
    sendJson(response, 200, settings);
    return;
  }

  if (request.method === "GET" && pathname === "/api/orders") {
    if (!isStaffRequest(request)) {
      sendJson(response, 401, { error: "직원 비밀번호가 필요합니다." });
      return;
    }
    sendJson(response, 200, await readOrders());
    return;
  }

  if (request.method === "POST" && pathname === "/api/orders") {
    const settings = await readSettings();
    if (!settings.isOpen) {
      sendJson(response, 403, { error: "현재 주문이 마감되었습니다." });
      return;
    }

    const body = JSON.parse((await readBody(request)) || "{}");
    const name = String(body.name || "").trim().slice(0, 20);
    const menu = String(body.menu || "").trim();
    const receiveType = body.receiveType === "배달" ? "배달" : "픽업";
    const deliveryLocation = receiveType === "배달" ? String(body.deliveryLocation || "").trim().slice(0, 40) : "";
    const validMenus = new Set(["ICE 아메리카노", "ICE 카페라떼", "HOT 아메리카노", "HOT 카페라떼"]);

    if (!name || !validMenus.has(menu) || (receiveType === "배달" && !deliveryLocation)) {
      sendJson(response, 400, { error: "주문 정보를 다시 확인해주세요." });
      return;
    }

    const orders = await readOrders();
    const order = {
      id: crypto.randomUUID(),
      name,
      menu,
      receiveType,
      deliveryLocation,
      done: false,
      createdAt: new Date().toISOString()
    };
    orders.push(order);
    await writeOrders(orders);
    sendJson(response, 201, order);
    return;
  }

  const toggleMatch = pathname.match(/^\/api\/orders\/([^/]+)\/toggle$/);
  if (request.method === "PATCH" && toggleMatch) {
    if (!isStaffRequest(request)) {
      sendJson(response, 401, { error: "직원 비밀번호가 필요합니다." });
      return;
    }
    const id = toggleMatch[1];
    const orders = await readOrders();
    const updatedOrders = orders.map((order) => order.id === id ? { ...order, done: !order.done } : order);
    await writeOrders(updatedOrders);
    sendJson(response, 200, updatedOrders);
    return;
  }

  if (request.method === "DELETE" && pathname === "/api/orders/completed") {
    if (!isStaffRequest(request)) {
      sendJson(response, 401, { error: "직원 비밀번호가 필요합니다." });
      return;
    }
    const orders = (await readOrders()).filter((order) => !order.done);
    await writeOrders(orders);
    sendJson(response, 200, orders);
    return;
  }

  if (request.method === "DELETE" && pathname === "/api/orders") {
    if (!isStaffRequest(request)) {
      sendJson(response, 401, { error: "직원 비밀번호가 필요합니다." });
      return;
    }
    await writeOrders([]);
    sendJson(response, 200, []);
    return;
  }

  sendJson(response, 404, { error: "요청한 API를 찾을 수 없습니다." });
}

async function serveFile(response, pathname) {
  const safePath = pathname === "/" ? "/index.html" : pathname;
  const filePath = path.normalize(path.join(PUBLIC_DIR, safePath));

  if (!filePath.startsWith(PUBLIC_DIR)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  try {
    const file = await fs.readFile(filePath);
    response.writeHead(200, {
      "Content-Type": MIME_TYPES[path.extname(filePath)] || "application/octet-stream",
      "Cache-Control": "no-store"
    });
    response.end(file);
  } catch {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
  }
}

const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url, "http://" + request.headers.host);
    if (url.pathname.startsWith("/api/")) {
      await handleApi(request, response, url.pathname);
      return;
    }
    await serveFile(response, url.pathname);
  } catch {
    sendJson(response, 500, { error: "서버 오류가 발생했습니다." });
  }
});

server.listen(PORT, "0.0.0.0", () => {
  console.log("로뎀나무 CAFE 주문 앱이 http://localhost:" + PORT + " 에서 실행 중입니다.");
});
