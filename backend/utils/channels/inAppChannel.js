const prisma = require("../prisma");

const send = async ({ userId, event, title, body, metadata }) => {
  if (!userId) {
    return { skipped: true, reason: "missing_user" };
  }

  return prisma.notification.create({
    data: {
      userId,
      event,
      title,
      body,
      metadata: metadata || undefined,
    },
  });
};

module.exports = {
  send,
};
