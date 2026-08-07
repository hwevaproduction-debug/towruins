const prisma = require("./prisma");

const toJsonParams = (params = {}) =>
  Object.entries(params).reduce((nextParams, [key, value]) => {
    nextParams[key] = Array.isArray(value) ? value.map(String) : value;
    return nextParams;
  }, {});

exports.logSearchEvent = async ({ params, resultCount, durationMs, userId }) => {
  try {
    if (!prisma.searchAnalyticsEvent?.create) {
      return;
    }

    await prisma.searchAnalyticsEvent.create({
      data: {
        params: toJsonParams(params),
        resultCount: Number.isFinite(resultCount) ? resultCount : 0,
        durationMs: Number.isFinite(durationMs) ? Math.max(0, Math.round(durationMs)) : 0,
        userId: userId ? String(userId) : null,
      },
    });
  } catch (error) {
    console.warn("Search analytics event failed", error.message);
  }
};
