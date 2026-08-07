const prisma = require("../prisma");

let webpush;
try { webpush = require("web-push"); } catch { webpush = null; }

exports.send = async ({ userId, title, body, metadata }) => {
  if (!webpush) return { skipped: true, reason: "missing_web_push" };
  const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } = process.env;
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY || !VAPID_SUBJECT) {
    return { skipped: true, reason: "missing_vapid_config" };
  }
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  const sub = await prisma.userPushSubscription.findUnique({ where: { userId } });
  if (!sub) return { skipped: true, reason: "missing_subscription" };

  const payload = JSON.stringify({
    title: title || "Town Ruins",
    body: body || "",
    data: metadata || {},
  });

  try {
    await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, payload);
  } catch (err) {
    if (err.statusCode === 410) {
      await prisma.userPushSubscription.delete({ where: { userId } });
      return { skipped: true, reason: "expired_subscription" };
    }

    throw err;
  }
};
