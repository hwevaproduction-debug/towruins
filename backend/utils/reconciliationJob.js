const cron = require("node-cron");
const prisma = require("./prisma");
const { getProviderByName } = require("./paymentProvider");
const { applyPaymentSuccess } = require("./paymentSideEffects");

let scheduledTask = null;

const getMaxRetries = () => Number.parseInt(process.env.MAX_PAYMENT_RETRIES, 10) || 3;

const runReconciliation = async () => {
  const staleMinutes = Number.parseInt(process.env.RECONCILIATION_STALE_MINUTES, 10) || 15;
  const staleCutoff = new Date(Date.now() - staleMinutes * 60 * 1000);
  const maxRetries = getMaxRetries();
  const payments = await prisma.payment.findMany({
    where: {
      status: "pending",
      createdAt: { lt: staleCutoff },
    },
    orderBy: { createdAt: "asc" },
  });

  for (const payment of payments) {
    try {
      const provider = getProviderByName(payment.method);
      const liveStatus = await provider.pollPaymentStatus(payment);
      const status = String(liveStatus?.status || "unknown").toLowerCase();

      console.log(
        `[reconciliation] payment=${payment.id} transactionRef=${payment.transactionRef || ""} status=${status}`
      );

      if (status === "paid" || status === "success") {
        const updatedPayment = await prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: "success",
            webhookVerified: true,
            amountPaid: liveStatus.amountPaid ?? payment.amountDue,
            providerMeta: liveStatus.providerMeta || payment.providerMeta || null,
          },
        });

        await applyPaymentSuccess(updatedPayment, prisma);
        continue;
      }

      if (status === "failed" && payment.retryCount >= maxRetries) {
        await prisma.payment.update({
          where: { id: payment.id },
          data: { status: "expired" },
        });
        continue;
      }

      if (status === "failed") {
        await prisma.payment.update({
          where: { id: payment.id },
          data: { status: "failed" },
        });
      }
    } catch (err) {
      console.log(`[reconciliation] payment=${payment.id} error=${err.message}`);
    }
  }
};

const startReconciliationJob = () => {
  if (scheduledTask) {
    return scheduledTask;
  }

  const expression = process.env.RECONCILIATION_INTERVAL_CRON || "*/15 * * * *";

  if (!cron.validate(expression)) {
    console.log(`[reconciliation] Invalid cron expression: ${expression}`);
    return null;
  }

  scheduledTask = cron.schedule(expression, () => {
    void runReconciliation();
  });
  console.log(`[reconciliation] Scheduled payment reconciliation: ${expression}`);

  return scheduledTask;
};

module.exports = {
  runReconciliation,
  startReconciliationJob,
};
