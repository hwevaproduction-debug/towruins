const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const prisma = require("../utils/prisma");

const getUserId = (user) => user?.id || user?._id?.toString();

const getNotificationDelegate = () =>
  prisma.notification?.count && prisma.notification?.findMany
    ? prisma.notification
    : null;

const isMissingNotificationStoreError = (error) => {
  const message = String(error?.message || "").toLowerCase();

  return (
    error?.code === "P2021" ||
    error?.code === "P2022" ||
    message.includes("prisma.notification") ||
    (message.includes("notification") && message.includes("does not exist"))
  );
};

const handleMissingNotificationStore = (error) => {
  if (!isMissingNotificationStoreError(error)) {
    throw error;
  }

  console.warn("[notifications] Notification store is unavailable:", error?.message || error);
};

const getPagination = (query) => {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, Number.parseInt(query.limit, 10) || 20));

  return {
    page,
    limit,
    skip: (page - 1) * limit,
  };
};

exports.getMyNotifications = catchAsync(async (req, res) => {
  const userId = getUserId(req.user);
  const { limit, skip } = getPagination(req.query);
  const where = { userId };
  const notification = getNotificationDelegate();

  if (!notification) {
    return res.status(200).json({
      status: "success",
      total: 0,
      data: [],
    });
  }

  let total;
  let notifications;

  try {
    [total, notifications] = await Promise.all([
      notification.count({ where }),
      notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
    ]);
  } catch (error) {
    handleMissingNotificationStore(error);
    total = 0;
    notifications = [];
  }

  res.status(200).json({
    status: "success",
    total,
    data: notifications,
  });
});

exports.getUnreadCount = catchAsync(async (req, res) => {
  const notification = getNotificationDelegate();
  let count = 0;

  if (notification) {
    try {
      count = await notification.count({
        where: {
          userId: getUserId(req.user),
          isRead: false,
        },
      });
    } catch (error) {
      handleMissingNotificationStore(error);
    }
  }

  res.status(200).json({
    status: "success",
    data: { count },
  });
});

exports.markAsRead = catchAsync(async (req, res, next) => {
  const notification = getNotificationDelegate();

  if (!notification?.updateMany) {
    return next(new AppError("Notification not found", 404));
  }

  let result;

  try {
    result = await notification.updateMany({
      where: {
        id: req.params.id,
        userId: getUserId(req.user),
      },
      data: { isRead: true },
    });
  } catch (error) {
    handleMissingNotificationStore(error);
    return next(new AppError("Notification not found", 404));
  }

  if (result.count === 0) {
    return next(new AppError("Notification not found", 404));
  }

  const updatedNotification = await notification.findFirst({
    where: {
      id: req.params.id,
      userId: getUserId(req.user),
    },
  });

  res.status(200).json({
    status: "success",
    data: { notification: updatedNotification },
  });
});

exports.markAllAsRead = catchAsync(async (req, res) => {
  const notification = getNotificationDelegate();
  let result = { count: 0 };

  if (notification?.updateMany) {
    try {
      result = await notification.updateMany({
        where: {
          userId: getUserId(req.user),
          isRead: false,
        },
        data: { isRead: true },
      });
    } catch (error) {
      handleMissingNotificationStore(error);
    }
  }

  res.status(200).json({
    status: "success",
    data: { updated: result.count },
  });
});

exports.savePushSubscription = catchAsync(async (req, res) => {
  const userId = getUserId(req.user);
  const { endpoint } = req.body;
  const p256dh = req.body?.p256dh || req.body?.keys?.p256dh;
  const auth = req.body?.auth || req.body?.keys?.auth;

  if (!endpoint || !p256dh || !auth) {
    return res.status(400).json({
      status: "fail",
      message: "endpoint, p256dh, and auth are required",
    });
  }

  const subscription = await prisma.userPushSubscription.upsert({
    where: { userId },
    update: { endpoint, p256dh, auth },
    create: { userId, endpoint, p256dh, auth },
  });

  res.status(200).json({ status: "success", data: subscription });
});

exports.deletePushSubscription = catchAsync(async (req, res) => {
  const userId = getUserId(req.user);

  await prisma.userPushSubscription.deleteMany({ where: { userId } });

  res.status(204).json({ status: "success", data: null });
});

exports.getPreferences = catchAsync(async (req, res) => {
  const userId = getUserId(req.user);

  const preferences = await prisma.userNotificationPreferences.upsert({
    where: { userId },
    update: {},
    create: { userId },
  });

  res.status(200).json({ status: "success", data: preferences });
});

exports.updatePreferences = catchAsync(async (req, res) => {
  const userId = getUserId(req.user);
  const data = {};

  ["emailEnabled", "pushEnabled", "inAppEnabled"].forEach((field) => {
    if (typeof req.body[field] === "boolean") {
      data[field] = req.body[field];
    }
  });

  const preferences = await prisma.userNotificationPreferences.upsert({
    where: { userId },
    update: data,
    create: { userId, ...data },
  });

  res.status(200).json({ status: "success", data: preferences });
});

exports.createSystemAnnouncement = catchAsync(async (req, res, next) => {
  const { title, body, targetUserIds } = req.body;

  if (!title || !body) {
    return next(new AppError("Title and body are required", 400));
  }

  if (!Array.isArray(targetUserIds) || targetUserIds.length === 0) {
    return next(new AppError("At least one target user ID is required", 400));
  }

  const notifications = await prisma.$transaction(
    targetUserIds.map((userId) =>
      prisma.notification.create({
        data: {
          userId,
          event: "system.announcement",
          title,
          body,
          metadata: { isSystemAnnouncement: true },
        },
      })
    )
  );

  res.status(201).json({
    status: "success",
    data: {
      notifications,
      count: notifications.length,
    },
  });
});
