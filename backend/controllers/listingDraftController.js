const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const prisma = require("../utils/prisma");

const ensureOwnsDraft = async (draftId, userId) => {
  const draft = await prisma.listingDraft.findUnique({
    where: { id: draftId },
  });

  if (!draft || draft.userId !== userId) {
    throw new AppError("No listing draft found with that ID", 404);
  }

  return draft;
};

exports.createListingDraft = catchAsync(async (req, res) => {
  const draft = await prisma.listingDraft.create({
    data: {
      userId: req.user.id,
      data: req.body.data || {},
    },
  });

  res.status(201).json({
    status: "success",
    data: { draft },
  });
});

exports.getMyListingDrafts = catchAsync(async (req, res) => {
  const drafts = await prisma.listingDraft.findMany({
    where: { userId: req.user.id },
    orderBy: { updatedAt: "desc" },
  });

  res.status(200).json({
    status: "success",
    results: drafts.length,
    data: drafts,
  });
});

exports.getListingDraft = catchAsync(async (req, res) => {
  const draft = await ensureOwnsDraft(req.params.id, req.user.id);

  res.status(200).json({
    status: "success",
    data: { draft },
  });
});

exports.updateListingDraft = catchAsync(async (req, res) => {
  await ensureOwnsDraft(req.params.id, req.user.id);

  const updated = await prisma.listingDraft.update({
    where: { id: req.params.id },
    data: {
      data: req.body.data || {},
    },
  });

  res.status(200).json({
    status: "success",
    data: { draft: updated },
  });
});

exports.deleteListingDraft = catchAsync(async (req, res) => {
  await ensureOwnsDraft(req.params.id, req.user.id);

  await prisma.listingDraft.delete({
    where: { id: req.params.id },
  });

  res.status(204).json({
    status: "success",
    data: null,
  });
});

