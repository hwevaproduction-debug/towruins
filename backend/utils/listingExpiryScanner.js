const cron = require("node-cron");
const prisma = require("./prisma");
const { sendEmail } = require("./email");

let scheduledTask = null;
let isRunning = false;

const hasExpiryNotification = async (listingId, notificationType) => {
  const existing = await prisma.notification.findFirst({
    where: {
      event: `listing.${notificationType}`,
      metadata: { path: ["listingId"], equals: listingId },
    },
    select: { id: true },
  });
  return Boolean(existing);
};

const runExpiryScanner = async () => {
  if (isRunning) return { processed: 0, skipped: true };
  isRunning = true;

  try {
    const now = new Date();
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const in6h = new Date(now.getTime() + 6 * 60 * 60 * 1000);

    // Find listings expiring within 24h (but not within 6h yet)
    const expiring24h = await prisma.listing.findMany({
      where: { status: "active", expiresAt: { gte: in6h, lte: in24h } },
      include: { user: { select: { id: true, email: true, username: true } } },
    });

    // Find listings expiring within 6h
    const expiring6h = await prisma.listing.findMany({
      where: { status: "active", expiresAt: { gte: now, lte: in6h } },
      include: { user: { select: { id: true, email: true, username: true } } },
    });

    // Find listings that just expired (expiresAt < now, still status active)
    const justExpired = await prisma.listing.findMany({
      where: { status: "active", expiresAt: { lt: now } },
      include: { user: { select: { id: true, email: true, username: true } } },
    });

    let processed = 0;

    for (const listing of expiring24h) {
      if (await hasExpiryNotification(listing.id, "expiry_24h")) continue;
      await prisma.notification.create({
        data: {
          userId: listing.user.id,
          event: "listing.expiry_24h",
          title: "⚠️ Listing expiring in 24 hours",
          body: `Your listing "${listing.name}" expires in 24 hours. Renew it to keep it active.`,
          metadata: { listingId: listing.id, notificationType: "expiry_24h" },
        },
      });
      if (listing.user.email) {
        await sendEmail({
          to: listing.user.email,
          subject: `Your listing "${listing.name}" expires in 24 hours`,
          text: `Your listing "${listing.name}" will expire in 24 hours. Log in to renew it using TR tokens (1 TR = 1 day).`,
        }).catch(() => {});
      }
      processed++;
    }

    for (const listing of expiring6h) {
      if (await hasExpiryNotification(listing.id, "expiry_6h")) continue;
      await prisma.notification.create({
        data: {
          userId: listing.user.id,
          event: "listing.expiry_6h",
          title: "⚠️ Listing expiring in 6 hours",
          body: `Your listing "${listing.name}" expires in 6 hours. Renew now to avoid losing visibility.`,
          metadata: { listingId: listing.id, notificationType: "expiry_6h" },
        },
      });
      if (listing.user.email) {
        await sendEmail({
          to: listing.user.email,
          subject: `Urgent: Your listing "${listing.name}" expires in 6 hours`,
          text: `Your listing "${listing.name}" will expire in 6 hours. Log in to renew it using TR tokens (1 TR = 1 day).`,
        }).catch(() => {});
      }
      processed++;
    }

    for (const listing of justExpired) {
      await prisma.listing.update({ where: { id: listing.id }, data: { status: "expired" } });
      if (!(await hasExpiryNotification(listing.id, "expired"))) {
        await prisma.notification.create({
          data: {
            userId: listing.user.id,
            event: "listing.expired",
            title: "Listing expired",
            body: `Your listing "${listing.name}" has expired and is no longer visible to tenants. Restore it using TR tokens.`,
            metadata: { listingId: listing.id, notificationType: "expired" },
          },
        });
        if (listing.user.email) {
          await sendEmail({
            to: listing.user.email,
            subject: `Your listing "${listing.name}" has expired`,
            text: `Your listing "${listing.name}" has expired. Log in to restore it using TR tokens (1 TR = 1 day).`,
          }).catch(() => {});
        }
      }
      processed++;
    }

    return { processed };
  } finally {
    isRunning = false;
  }
};

const startExpiryScanner = () => {
  if (scheduledTask) return scheduledTask;

  const expression = process.env.EXPIRY_SCAN_CRON || "*/30 * * * *";

  if (!cron.validate(expression)) {
    console.log(`[listing-expiry] Invalid cron expression: ${expression}`);
    return null;
  }

  scheduledTask = cron.schedule(expression, () => {
    void runExpiryScanner();
  });
  console.log(`[listing-expiry] Scheduled expiry scanner: ${expression}`);
  return scheduledTask;
};

module.exports = { runExpiryScanner, startExpiryScanner };
