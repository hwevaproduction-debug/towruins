const catchAsync = require("../utils/catchAsync");
const prisma = require("../utils/prisma");

exports.listDocs = catchAsync(async (_req, res) => {
  const docs = await prisma.legalDocument.findMany({
    where: { isActive: true },
    orderBy: { createdAt: "desc" },
  });

  res.status(200).json({ status: "success", data: docs });
});

exports.getDocHistory = catchAsync(async (req, res) => {
  const docs = await prisma.legalDocument.findMany({
    where: { slug: req.params.slug },
    orderBy: { version: "desc" },
  });

  res.status(200).json({ status: "success", data: docs });
});

exports.createDoc = catchAsync(async (req, res) => {
  const { slug, title, content } = req.body;
  const existingCount = await prisma.legalDocument.count({ where: { slug } });

  await prisma.legalDocument.updateMany({
    where: { slug, isActive: true },
    data: { isActive: false, archivedAt: new Date() },
  });

  const doc = await prisma.legalDocument.create({
    data: { slug, title, content, version: existingCount + 1 },
  });

  res.status(201).json({ status: "success", data: doc });
});

exports.updateDoc = catchAsync(async (req, res) => {
  const existing = await prisma.legalDocument.update({
    where: { id: req.params.id },
    data: { isActive: false, archivedAt: new Date() },
  });

  const doc = await prisma.legalDocument.create({
    data: {
      slug: existing.slug,
      title: req.body.title || existing.title,
      content: req.body.content,
      version: existing.version + 1,
    },
  });

  res.status(200).json({ status: "success", data: doc });
});

exports.archiveDoc = catchAsync(async (req, res) => {
  const doc = await prisma.legalDocument.update({
    where: { id: req.params.id },
    data: { isActive: false, archivedAt: new Date() },
  });

  res.status(200).json({ status: "success", data: doc });
});

exports.getPublicDoc = catchAsync(async (req, res) => {
  const doc = await prisma.legalDocument.findFirst({
    where: { slug: req.params.slug, isActive: true },
  });

  res.status(200).json({ status: "success", data: doc });
});
