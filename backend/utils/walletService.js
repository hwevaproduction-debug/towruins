const prisma = require("./prisma");

const ENGAGEMENT_FEE_TR = parseInt(process.env.ENGAGEMENT_FEE_TR || "5", 10);

async function grantTokens(userId, amount, reason, label, tx) {
  const client = tx || prisma;
  const user = await client.user.update({
    where: { id: userId },
    data: { tokenBalance: { increment: amount } },
    select: { tokenBalance: true },
  });
  await client.walletTransaction.create({
    data: { userId, type: "CREDIT", amount, label, reason, balanceAfter: user.tokenBalance },
  });
  return user.tokenBalance;
}

async function deductTokens(userId, amount, reason, label, tx) {
  const client = tx || prisma;
  const user = await client.user.findUnique({ where: { id: userId }, select: { tokenBalance: true } });
  if (!user || user.tokenBalance < amount) {
    const err = new Error("Insufficient TR token balance");
    err.statusCode = 402;
    throw err;
  }
  const updated = await client.user.update({
    where: { id: userId },
    data: { tokenBalance: { decrement: amount } },
    select: { tokenBalance: true },
  });
  await client.walletTransaction.create({
    data: { userId, type: "DEBIT", amount, label, reason, balanceAfter: updated.tokenBalance },
  });
  return updated.tokenBalance;
}

async function getBalance(userId) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { tokenBalance: true } });
  return user ? user.tokenBalance : 0;
}

async function getTransactions(userId, limit = 50) {
  return prisma.walletTransaction.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

module.exports = { grantTokens, deductTokens, getBalance, getTransactions, ENGAGEMENT_FEE_TR };
