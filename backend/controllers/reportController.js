const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const prisma = require("../utils/prisma");

const TARGET_TYPES = new Set(["Listing", "Accommodation", "Review"]);
const REPORT_REASONS = new Set(["spam", "inappropriate", "fraud", "other"]);

const getUserId = (user) => user?.id || user?._id?.toString();

exports.submitReport = catchAsync(async (req, res, next) => {
  const targetType = String(req.body.targetType || "").trim();
  const targetId = String(req.body.targetId || "").trim();
  const reason = String(req.body.reason || "").trim();
  const description = req.body.description ? String(req.body.description).trim() : null;

  if (!TARGET_TYPES.has(targetType)) {
    return next(new AppError("Invalid targetType", 400));
  }

  if (!targetId) {
    return next(new AppError("targetId is required", 400));
  }

  if (!REPORT_REASONS.has(reason)) {
    return next(new AppError("Invalid report reason", 400));
  }

  const report = await prisma.report.create({
    data: {
      reporterId: getUserId(req.user),
      targetType,
      targetId,
      reason,
      description,
    },
  });

  res.status(201).json({
    status: "success",
    data: {
      report: {
        ...report,
        _id: report.id,
      },
    },
  });
});
