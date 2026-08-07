const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const jwt = require("jsonwebtoken");

const prisma = require("../utils/prisma");

const originalPrisma = {
  userFindUnique: prisma.user.findUnique,
};

const loadApp = () => {
  delete require.cache[require.resolve("../app")];
  return require("../app");
};

const invokeApp = (method, url, { headers, body: requestBody } = {}) =>
  new Promise((resolve, reject) => {
    const app = loadApp();
    const server = http.createServer(app);

    server.listen(0, async () => {
      const { port } = server.address();

      try {
        const response = await fetch(`http://127.0.0.1:${port}${url}`, {
          method,
          headers,
          body: requestBody === undefined ? undefined : JSON.stringify(requestBody),
        });
        const contentType = response.headers.get("content-type") || "";
        const responseBody = contentType.includes("application/json")
          ? await response.json()
          : await response.text();

        resolve({
          statusCode: response.status,
          body: responseBody,
          headers: response.headers,
        });
      } catch (error) {
        reject(error);
      } finally {
        server.close();
      }
    });
  });

const signTestToken = (id) => {
  process.env.JWT_SECRET = "test-secret";
  return jwt.sign({ id }, process.env.JWT_SECRET);
};

test.afterEach(() => {
  prisma.user.findUnique = originalPrisma.userFindUnique;
  delete process.env.JWT_SECRET;
});

test("GET / returns the root health payload", async () => {
  const result = await invokeApp("GET", "/");

  assert.equal(result.statusCode, 200);
  assert.deepEqual(result.body, {
    status: "ok",
    message: "Town Ruins API is running.",
  });
});

test("GET /api/v1 returns the API base health payload", async () => {
  const result = await invokeApp("GET", "/api/v1");

  assert.equal(result.statusCode, 200);
  assert.deepEqual(result.body, {
    status: "ok",
    message: "Town Ruins API v1 is running.",
  });
});

test("GET / returns CORS headers for Amplify frontend origins", async () => {
  const result = await invokeApp("GET", "/", {
    headers: {
      Origin: "https://awsfullmig.d3j8az2psmt96w.amplifyapp.com",
    },
  });

  assert.equal(result.statusCode, 200);
  assert.equal(
    result.headers.get("access-control-allow-origin"),
    "https://awsfullmig.d3j8az2psmt96w.amplifyapp.com"
  );
  assert.equal(result.headers.get("access-control-allow-credentials"), "true");
});

test("GET / returns CORS headers for Townruins custom domains", async () => {
  const result = await invokeApp("GET", "/", {
    headers: {
      Origin: "https://app.townruins.com",
    },
  });

  assert.equal(result.statusCode, 200);
  assert.equal(
    result.headers.get("access-control-allow-origin"),
    "https://app.townruins.com"
  );
  assert.equal(result.headers.get("access-control-allow-credentials"), "true");
});

test("OPTIONS preflight succeeds for configured frontend origins", async () => {
  process.env.FRONTEND_URL = "https://townruins.com";

  try {
    const result = await invokeApp("OPTIONS", "/api/v1/users/login", {
      headers: {
        Origin: "https://townruins.com",
        "Access-Control-Request-Method": "POST",
      },
    });

    assert.equal(result.statusCode, 204);
    assert.equal(
      result.headers.get("access-control-allow-origin"),
      "https://townruins.com"
    );
  } finally {
    delete process.env.FRONTEND_URL;
  }
});

test("OPTIONS preflight allows legacy frontend CORS request header", async () => {
  const result = await invokeApp("OPTIONS", "/api/v1/users/login", {
    headers: {
      Origin: "https://app.townruins.com",
      "Access-Control-Request-Method": "POST",
      "Access-Control-Request-Headers":
        "content-type,access-control-allow-origin",
    },
  });

  assert.equal(result.statusCode, 204);
  assert.equal(
    result.headers.get("access-control-allow-origin"),
    "https://app.townruins.com"
  );
  assert.match(
    result.headers.get("access-control-allow-headers"),
    /Access-Control-Allow-Origin/
  );
});

test("OPTIONS preflight succeeds for Townruins app API requests", async () => {
  const routes = [
    "/api/v1/listings/home/grouped-by-location?locationsLimit=6&perLocation=3",
    "/api/v1/listings/home/highlighted?limit=5",
    "/api/v1/stays?guests=1&limit=12&page=1&sort=newest",
    "/api/v1/notifications/unread-count",
  ];

  for (const route of routes) {
    const result = await invokeApp("OPTIONS", route, {
      headers: {
        Origin: "https://app.townruins.com",
        "Access-Control-Request-Method": "GET",
        "Access-Control-Request-Headers":
          "authorization,content-type,x-requested-with",
      },
    });

    assert.equal(result.statusCode, 204);
    assert.equal(
      result.headers.get("access-control-allow-origin"),
      "https://app.townruins.com"
    );
    assert.match(
      result.headers.get("access-control-allow-headers"),
      /X-Requested-With/
    );
  }
});

test("GET /api/v1/notifications/unread-count is mounted and keeps CORS on auth errors", async () => {
  const result = await invokeApp("GET", "/api/v1/notifications/unread-count", {
    headers: {
      Origin: "https://app.townruins.com",
    },
  });

  assert.equal(result.statusCode, 401);
  assert.equal(
    result.headers.get("access-control-allow-origin"),
    "https://app.townruins.com"
  );
});

test("admin moderation routes require authenticated admin users", async () => {
  const adminRoutes = [
    "/api/v1/admin/queue",
    "/api/v1/admin/accommodations",
    "/api/v1/admin/reviews",
    "/api/v1/admin/reports",
    "/api/v1/admin/disputes",
    "/api/v1/admin/audit-logs",
  ];

  for (const route of adminRoutes) {
    const unauthenticated = await invokeApp("GET", route);
    assert.equal(unauthenticated.statusCode, 401);
  }

  prisma.user.findUnique = async () => ({
    id: "user_1",
    role: "user",
    email: "user@example.com",
  });
  const token = signTestToken("user_1");

  for (const route of adminRoutes) {
    const nonAdmin = await invokeApp("GET", route, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(nonAdmin.statusCode, 403);
  }
});

test("public dispute and report endpoints require authentication", async () => {
  const protectedRoutes = ["/api/v1/disputes", "/api/v1/reports"];

  for (const route of protectedRoutes) {
    const unauthenticated = await invokeApp("POST", route, {
      headers: { "Content-Type": "application/json" },
      body: {},
    });
    assert.equal(unauthenticated.statusCode, 401);
  }

  prisma.user.findUnique = async () => ({
    id: "user_1",
    role: "user",
    email: "user@example.com",
  });
  const token = signTestToken("user_1");

  const dispute = await invokeApp("POST", "/api/v1/disputes", {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: {},
  });
  assert.equal(dispute.statusCode, 400);

  const report = await invokeApp("POST", "/api/v1/reports", {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: {},
  });
  assert.equal(report.statusCode, 400);
});
