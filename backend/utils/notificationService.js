const prisma = require("./prisma");

const EVENT_RECIPIENTS = {
  "booking.request_submitted": ["provider"],
  "booking.confirmed_instant": ["guest", "provider"],
  "booking.request_accepted": ["guest"],
  "booking.request_declined": ["guest"],
  "booking.cancelled_by_guest": ["provider"],
  "booking.cancelled_by_provider": ["guest"],
  "booking.payment_success": ["guest", "provider"],
  "booking.payment_partial": ["guest"],
  "booking.payment_retry": ["guest"],
  "booking.refund_initiated": ["guest"],
  "booking.settlement_completed": ["provider"],
  "booking.checkin_reminder": ["guest"],
  "booking.checkout_reminder": ["guest"],
  "provider.approved": ["provider"],
  "provider.rejected": ["provider"],
  "provider.suspended": ["provider"],
  "provider.reinstated": ["provider"],
  "accommodation.approved": ["provider"],
  "accommodation.rejected": ["provider"],
  "accommodation.suspended": ["provider"],
  "dispute.resolved": ["guest", "provider"],
  "report.resolved": ["reporter"],
};

const SENSITIVE_KEYS = new Set([
  "password",
  "emailVerificationToken",
  "emailVerificationExpires",
  "phoneOtp",
  "phoneOtpExpires",
]);

const getId = (value) => {
  if (!value) {
    return null;
  }

  return value.id || value._id || null;
};

const getPhone = (value) =>
  value?.phoneNumber ||
  value?.phone ||
  value?.contactPhone ||
  value?.providerProfile?.contactPhone ||
  null;

const sanitizeForJson = (value) => {
  if (value === null || value === undefined) {
    return value;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    return value.map(sanitizeForJson);
  }

  if (typeof value === "object") {
    if (
      typeof value.toJSON === "function" &&
      value.constructor &&
      value.constructor.name !== "Object"
    ) {
      return value.toJSON();
    }

    return Object.entries(value).reduce((acc, [key, item]) => {
      if (!SENSITIVE_KEYS.has(key) && item !== undefined) {
        acc[key] = sanitizeForJson(item);
      }

      return acc;
    }, {});
  }

  return value;
};

const resolveEntity = (role, context) => {
  if (role === "guest") {
    return context.guest || context.booking?.guest || null;
  }

  if (role === "provider") {
    return context.provider || context.booking?.providerUser || null;
  }

  if (role === "reporter") {
    return context.reporter || context.report?.reporter || null;
  }

  return null;
};

const resolveRecipients = (event, context) => {
  const roles = EVENT_RECIPIENTS[event] || [];

  return roles
    .map((role) => {
      const entity = resolveEntity(role, context);
      const userId = getId(entity);
      const email = entity?.email || null;
      const phone = getPhone(entity);

      return {
        role,
        userId: userId ? String(userId) : null,
        email,
        phone,
        username: entity?.username || entity?.name || null,
      };
    })
    .filter((recipient) => recipient.userId || recipient.email || recipient.phone);
};

const getBookingId = (context) =>
  context.bookingId || context.booking?.id || context.booking?._id || null;

const buildMetadata = (context) => {
  const bookingId = getBookingId(context);

  return {
    ...(context.metadata || {}),
    ...(bookingId ? { bookingId } : {}),
  };
};

const buildContext = (context, recipient) => {
  const metadata = buildMetadata(context);

  return sanitizeForJson({
    ...context,
    bookingId: getBookingId(context),
    metadata,
    recipientRole: recipient.role,
    recipient: {
      id: recipient.userId,
      email: recipient.email,
      phoneNumber: recipient.phone,
      username: recipient.username,
    },
  });
};

const defaultPreferences = {
  emailEnabled: true,
  pushEnabled: true,
  inAppEnabled: true,
};

const getRecipientDeliverySettings = async (recipients) => {
  const userIds = [
    ...new Set(
      recipients
        .map((recipient) => recipient.userId)
        .filter(Boolean)
    ),
  ];

  if (!userIds.length) {
    return { preferencesByUserId: new Map(), pushUserIds: new Set() };
  }

  const [preferences, pushSubscriptions] = await Promise.all([
    prisma.userNotificationPreferences.findMany({
      where: { userId: { in: userIds } },
    }),
    prisma.userPushSubscription.findMany({
      where: { userId: { in: userIds } },
      select: { userId: true },
    }),
  ]);

  return {
    preferencesByUserId: new Map(
      preferences.map((preference) => [preference.userId, preference])
    ),
    pushUserIds: new Set(
      pushSubscriptions.map((subscription) => subscription.userId)
    ),
  };
};

const buildJobsForRecipient = ({
  event,
  context,
  recipient,
  scheduledAt,
  locale,
  preferences,
  hasPushSubscription,
}) => {
  const templateKey = event;
  const jobContext = buildContext(context, recipient);
  const deliveryPreferences = {
    ...defaultPreferences,
    ...(preferences || {}),
  };
  const jobs = [];

  if (deliveryPreferences.emailEnabled && recipient.email) {
    jobs.push({
      event,
      channel: "email",
      recipientId: recipient.userId,
      recipientAddress: recipient.email,
      templateKey,
      context: jobContext,
      locale,
      scheduledAt,
    });
  }

  if (process.env.SMS_ENABLED === "true" && recipient.phone) {
    jobs.push({
      event,
      channel: "sms",
      recipientId: recipient.userId,
      recipientAddress: recipient.phone,
      templateKey,
      context: jobContext,
      locale,
      scheduledAt,
    });
  }

  if (deliveryPreferences.inAppEnabled && recipient.userId) {
    jobs.push({
      event,
      channel: "in_app",
      recipientId: recipient.userId,
      recipientAddress: null,
      templateKey,
      context: jobContext,
      locale,
      scheduledAt,
    });
  }

  if (
    deliveryPreferences.pushEnabled &&
    recipient.userId &&
    hasPushSubscription
  ) {
    jobs.push({
      event,
      channel: "push",
      recipientId: recipient.userId,
      recipientAddress: null,
      templateKey,
      context: jobContext,
      locale,
      scheduledAt,
    });
  }

  return jobs;
};

const enqueue = async (event, context = {}, options = {}) => {
  try {
    const scheduledAt = options.scheduledAt ? new Date(options.scheduledAt) : new Date();
    const locale = options.locale || context.locale || "en";
    const recipients = resolveRecipients(event, context);
    const { preferencesByUserId, pushUserIds } =
      await getRecipientDeliverySettings(recipients);
    const jobs = recipients.flatMap((recipient) =>
      buildJobsForRecipient({
        event,
        context,
        recipient,
        scheduledAt,
        locale,
        preferences: recipient.userId
          ? preferencesByUserId.get(recipient.userId)
          : null,
        hasPushSubscription: recipient.userId
          ? pushUserIds.has(recipient.userId)
          : false,
      })
    );

    if (!jobs.length) {
      return { count: 0 };
    }

    return prisma.notificationJob.createMany({
      data: jobs,
    });
  } catch (err) {
    console.error("[notification] enqueue failed:", err.message);
    return { count: 0, error: err.message };
  }
};

module.exports = {
  enqueue,
  resolveRecipients,
};
