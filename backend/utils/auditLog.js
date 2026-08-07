const prisma = require("./prisma");

const createEntry = ({
  adminId,
  action,
  targetType,
  targetId,
  metadata = null,
  ipAddress = null,
} = {}) => {
  try {
    if (!action || !targetType || !targetId) {
      return Promise.resolve(null);
    }

    return prisma.auditLog
      .create({
        data: {
          adminId: adminId || null,
          action,
          targetType,
          targetId: String(targetId),
          metadata,
          ipAddress,
        },
      })
      .catch((error) => {
        console.log("[audit-log]", error?.message || error);
        return null;
      });
  } catch (error) {
    console.log("[audit-log]", error?.message || error);
    return Promise.resolve(null);
  }
};

module.exports = {
  createEntry,
};
