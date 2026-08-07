const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const jwt = require("jsonwebtoken");
const prisma = require("../utils/prisma");

let request;
try {
  request = require("supertest");
} catch {
  request = createRequest;
}

function createRequest(app) {
  const run = (method, path) => {
    const headers = {};
    let payload = null;

    const requestApi = {
      set(name, value) {
        headers[name] = value;
        return requestApi;
      },
      send(body) {
        payload = JSON.stringify(body);
        headers["Content-Type"] = "application/json";
        headers["Content-Length"] = Buffer.byteLength(payload);
        return requestApi;
      },
      then(resolve, reject) {
        return execute().then(resolve, reject);
      },
      catch(reject) {
        return execute().catch(reject);
      },
    };

    const execute = () =>
      new Promise((resolve, reject) => {
        const server = http.createServer(app);

        server.listen(0, () => {
          const { port } = server.address();
          const req = http.request(
            {
              method,
              path,
              port,
              host: "127.0.0.1",
              headers,
            },
            (res) => {
              const chunks = [];
              res.on("data", (chunk) => chunks.push(chunk));
              res.on("end", () => {
                server.close(() => {
                  resolve({
                    status: res.statusCode,
                    body: chunks.length ? Buffer.concat(chunks).toString("utf8") : "",
                  });
                });
              });
            }
          );

          req.on("error", (error) => {
            server.close(() => reject(error));
          });

          if (payload) {
            req.write(payload);
          }
          req.end();
        });
      });

    return requestApi;
  };

  return {
    get: (path) => run("GET", path),
    post: (path) => run("POST", path),
    put: (path) => run("PUT", path),
    delete: (path) => run("DELETE", path),
  };
}

process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret";

const app = require("../app");

const tenantToken = jwt.sign(
  { id: "test-user", role: "tenant" },
  process.env.JWT_SECRET
);
const tenantUserId = "test-user";
const tenantUserEmail = "route-auth-tenant@example.com";
const tenantUserUsername = "route-auth-tenant";
const needsDatabase = !process.env.DATABASE_URL;
let createdTenantUser = false;
let existingTenantRole = null;

test.before(async () => {
  if (needsDatabase) {
    return;
  }

  const existingTenant = await prisma.user.findUnique({
    where: { id: tenantUserId },
    select: { role: true },
  });

  if (existingTenant) {
    existingTenantRole = existingTenant.role;
    await prisma.user.update({
      where: { id: tenantUserId },
      data: { role: "tenant" },
    });
    return;
  }

  createdTenantUser = true;
  await prisma.user.create({
    data: {
      id: tenantUserId,
      username: tenantUserUsername,
      email: tenantUserEmail,
      password: "test-password",
      role: "tenant",
      isEmailVerified: true,
    },
  });
});

test.after(async () => {
  if (needsDatabase) {
    return;
  }

  if (createdTenantUser) {
    await prisma.user.delete({ where: { id: tenantUserId } }).catch(() => {});
  } else if (existingTenantRole) {
    await prisma.user.update({
      where: { id: tenantUserId },
      data: { role: existingTenantRole },
    });
  }

  await prisma.$disconnect();
});

const adminRoutes = [
  { method: "get", path: "/api/v1/admin/listings" },
  { method: "delete", path: "/api/v1/admin/listings/fake-id" },
  { method: "get", path: "/api/v1/admin/accommodations" },
  { method: "put", path: "/api/v1/admin/providers/fake-id/suspend" },
  { method: "get", path: "/api/v1/admin/disputes" },
  { method: "get", path: "/api/v1/admin/reports" },
  { method: "get", path: "/api/v1/admin/audit-logs" },
  { method: "post", path: "/api/v1/admin/disputes/fake-id/review" },
];

const tenantForbiddenRoutes = [
  { method: "get", path: "/api/v1/admin/listings" },
  { method: "delete", path: "/api/v1/admin/listings/fake-id" },
  { method: "get", path: "/api/v1/admin/accommodations" },
  { method: "get", path: "/api/v1/admin/disputes" },
  { method: "get", path: "/api/v1/admin/reports" },
  { method: "get", path: "/api/v1/admin/audit-logs" },
  { method: "post", path: "/api/v1/admin/disputes/fake-id/review" },
];

const publicProtectedRoutes = [
  { method: "post", path: "/api/v1/disputes" },
  { method: "post", path: "/api/v1/reports" },
];

test("admin routes reject unauthenticated requests", async (t) => {
  for (const route of adminRoutes) {
    await t.test(`${route.method.toUpperCase()} ${route.path}`, async () => {
      const response = await request(app)[route.method](route.path);

      assert.equal(response.status, 401);
    });
  }
});

test(
  "admin routes reject non-admin tokens",
  {
    skip:
      needsDatabase && "DATABASE_URL is required for token-backed auth middleware",
  },
  async (t) => {
    for (const route of tenantForbiddenRoutes) {
      await t.test(`${route.method.toUpperCase()} ${route.path}`, async () => {
        const response = await request(app)
          [route.method](route.path)
          .set("Authorization", `Bearer ${tenantToken}`);

        assert.equal(response.status, 403);
      });
    }
  }
);

test("public protected moderation routes reject unauthenticated requests", async (t) => {
  for (const route of publicProtectedRoutes) {
    await t.test(`${route.method.toUpperCase()} ${route.path}`, async () => {
      const response = await request(app)[route.method](route.path);

      assert.equal(response.status, 401);
    });
  }
});
