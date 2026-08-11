const catchAsync = require("../utils/catchAsync");
const prisma = require("../utils/prisma");
const AppError = require("../utils/appError");
const auditLog = require("../utils/auditLog");

function mapId(record) {
  if (!record) return record;
  return { ...record, _id: record.id };
}

exports.getAdminUsers = catchAsync(async (req, res, next) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
  const skip = (page - 1) * limit;

  const searchRaw = req.query.search ? String(req.query.search).trim() : "";
  const roleRaw = req.query.role ? String(req.query.role).trim() : "";
  const onboardingStatusRaw = req.query.onboardingStatus ? String(req.query.onboardingStatus).trim() : "";

  const where = {};
  if (searchRaw) {
    const s = searchRaw;
    where.OR = [
      { username: { contains: s, mode: "insensitive" } },
      { email: { contains: s, mode: "insensitive" } },
    ];
  }
  if (roleRaw) where.role = roleRaw;
  if (onboardingStatusRaw) where.onboardingStatus = onboardingStatusRaw;

  const total = await prisma.user.count({ where });

  const users = await prisma.user.findMany({
    where,
    skip,
    take: limit,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      username: true,
      email: true,
      role: true,
      phoneNumber: true,
      isEmailVerified: true,
      isPhoneVerified: true,
      providerProfile: true,
      verificationStatus: true,
      onboardingStatus: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  // audit the admin view action (non-blocking)
  void auditLog.createEntry({
    adminId: req.user?.id || null,
    action: "admin.viewed_users",
    targetType: "User",
    targetId: null,
    metadata: { query: req.query },
    ipAddress: req.ip,
  }).catch(() => {});

  const data = users.map(mapId);

  res.status(200).json({ status: "success", total, results: data.length, data });
});

exports.getAdminUserById = catchAsync(async (req, res, next) => {
  const id = req.params.id;
  if (!id) return next(new AppError("Invalid user id", 400));

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      username: true,
      email: true,
      role: true,
      phoneNumber: true,
      isEmailVerified: true,
      isPhoneVerified: true,
      providerProfile: true,
      verificationStatus: true,
      onboardingStatus: true,
      createdAt: true,
      updatedAt: true,
      // counts for related resources to help admin UI
      _count: {
        select: {
          listings: true,
          listingDrafts: true,
          payments: true,
        },
      },
    },
  });

  if (!user) return next(new AppError("User not found", 404));

  void auditLog.createEntry({
    adminId: req.user?.id || null,
    action: "admin.viewed_user",
    targetType: "User",
    targetId: id,
    metadata: null,
    ipAddress: req.ip,
  }).catch(() => {});

  res.status(200).json({ status: "success", data: mapId(user) });
});
