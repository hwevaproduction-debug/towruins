const test = require("node:test");
const assert = require("node:assert/strict");

const listingDraftController = require("../controllers/listingDraftController");
const prisma = require("../utils/prisma");

const originalListingDraft = {
  ...prisma.listingDraft,
};

const invokeController = (handler, req) =>
  new Promise((resolve, reject) => {
    const res = {
      statusCode: 200,
      body: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(payload) {
        this.body = payload;
        resolve({ statusCode: this.statusCode, body: this.body });
      },
    };

    handler(req, res, (err) => {
      if (err) {
        resolve({ error: err });
      } else {
        reject(new Error("Expected controller to resolve or error"));
      }
    });
  });

test.afterEach(() => {
  prisma.listingDraft.findUnique = originalListingDraft.findUnique;
  prisma.listingDraft.findMany = originalListingDraft.findMany;
  prisma.listingDraft.create = originalListingDraft.create;
  prisma.listingDraft.update = originalListingDraft.update;
  prisma.listingDraft.delete = originalListingDraft.delete;
});

test("createListingDraft stores draft for authenticated landlord", async () => {
  prisma.listingDraft.create = async ({ data }) => ({
    id: "draft_1",
    userId: data.userId,
    data: data.data,
    createdAt: new Date("2025-01-01T00:00:00.000Z"),
    updatedAt: new Date("2025-01-01T00:00:00.000Z"),
  });

  const result = await invokeController(listingDraftController.createListingDraft, {
    user: { id: "landlord_1", role: "landlord" },
    body: { data: { name: "Partial" } },
  });

  assert.equal(result.statusCode, 201);
  assert.equal(result.body.status, "success");
  assert.equal(result.body.data.draft.userId, "landlord_1");
  assert.deepEqual(result.body.data.draft.data, { name: "Partial" });
});

test("getMyListingDrafts returns only my drafts ordered by updatedAt desc", async () => {
  let capturedArgs = null;
  prisma.listingDraft.findMany = async (args) => {
    capturedArgs = args;
    return [
      { id: "draft_2", userId: "landlord_1", data: {}, updatedAt: new Date("2025-01-02T00:00:00.000Z") },
      { id: "draft_1", userId: "landlord_1", data: {}, updatedAt: new Date("2025-01-01T00:00:00.000Z") },
    ];
  };

  const result = await invokeController(listingDraftController.getMyListingDrafts, {
    user: { id: "landlord_1", role: "landlord" },
  });

  assert.deepEqual(capturedArgs, {
    where: { userId: "landlord_1" },
    orderBy: { updatedAt: "desc" },
  });
  assert.equal(result.statusCode, 200);
  assert.equal(result.body.results, 2);
  assert.equal(result.body.data[0].id, "draft_2");
});

test("getListingDraft hides drafts from non-owners (404)", async () => {
  prisma.listingDraft.findUnique = async () => ({
    id: "draft_1",
    userId: "landlord_owner",
    data: {},
  });

  const result = await invokeController(listingDraftController.getListingDraft, {
    params: { id: "draft_1" },
    user: { id: "landlord_other", role: "landlord" },
  });

  assert.equal(result.error.statusCode, 404);
  assert.equal(result.error.message, "No listing draft found with that ID");
});

test("updateListingDraft overwrites data for owner", async () => {
  prisma.listingDraft.findUnique = async () => ({
    id: "draft_1",
    userId: "landlord_1",
    data: { name: "Old" },
  });
  prisma.listingDraft.update = async ({ where, data }) => ({
    id: where.id,
    userId: "landlord_1",
    data: data.data,
  });

  const result = await invokeController(listingDraftController.updateListingDraft, {
    params: { id: "draft_1" },
    user: { id: "landlord_1", role: "landlord" },
    body: { data: { name: "New", description: "Partial" } },
  });

  assert.equal(result.statusCode, 200);
  assert.deepEqual(result.body.data.draft.data, { name: "New", description: "Partial" });
});

test("deleteListingDraft enforces ownership and returns 204", async () => {
  prisma.listingDraft.findUnique = async () => ({
    id: "draft_1",
    userId: "landlord_1",
  });
  let deletedId = null;
  prisma.listingDraft.delete = async ({ where }) => {
    deletedId = where.id;
    return {};
  };

  const result = await invokeController(listingDraftController.deleteListingDraft, {
    params: { id: "draft_1" },
    user: { id: "landlord_1", role: "landlord" },
  });

  assert.equal(deletedId, "draft_1");
  assert.equal(result.statusCode, 204);
  assert.equal(result.body.status, "success");
});

