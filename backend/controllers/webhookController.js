const crypto = require("crypto");
const prisma = require("../utils/prisma");
const { getProviderByName } = require("../utils/paymentProvider");
const {
  applyPaymentSuccess,
  BOOKING_PAYMENT_TYPES,
  isLegacyNonBookingPaymentType,
} = require("../utils/paymentSideEffects");

const SUCCESSFUL_PAYNOW_STATUSES = ["paid"];

const normalizeStatus = (value) => String(value || "").toLowerCase();

const normalizeAmount = (value) => {
  const amount = Number.parseFloat(value);

  return Number.isFinite(amount) ? amount : undefined;
};

const hashEventId = (...parts) =>
  crypto.createHash("sha256").update(parts.filter(Boolean).join(":")).digest("hex");

const serializePayload = (payload) => {
  if (Buffer.isBuffer(payload)) {
    return { rawBody: payload.toString("utf8") };
  }

  if (payload && typeof payload === "object") {
    return payload;
  }

  return { value: String(payload || "") };
};

const isUniqueConstraintError = (err) => err?.code === "P2002";

const recordWebhookEvent = async (provider, eventId, payload) => {
  if (!process.env.DATABASE_URL || !prisma.webhookEvent?.create) {
    return { duplicate: false };
  }

  try {
    await prisma.webhookEvent.create({
      data: {
        provider,
        eventId,
        payload: serializePayload(payload),
      },
    });

    return { duplicate: false };
  } catch (err) {
    if (isUniqueConstraintError(err)) {
      return { duplicate: true };
    }

    console.log(`[webhook] Could not record ${provider} webhook event: ${err.message}`);
    return { duplicate: false };
  }
};

const removeWebhookEvent = async (provider, eventId) => {
  if (!process.env.DATABASE_URL || !prisma.webhookEvent?.deleteMany) {
    return;
  }

  try {
    await prisma.webhookEvent.deleteMany({
      where: {
        provider,
        eventId,
      },
    });
  } catch (err) {
    console.log(`[webhook] Could not reset ${provider} webhook event: ${err.message}`);
  }
};

const ensureConfirmedAmount = async (payment, explicitAmountPaid) => {
  if (!payment || !BOOKING_PAYMENT_TYPES.includes(payment.type)) {
    return payment;
  }

  const fallbackAmount = Number(payment.amountDue || payment.amount || 0);
  const amountPaid = explicitAmountPaid ?? fallbackAmount;

  if (!Number.isFinite(amountPaid) || amountPaid <= 0) {
    return payment;
  }

  if (Number(payment.amountPaid || 0) === amountPaid) {
    return payment;
  }

  const updatedPayment = await prisma.payment.update({
    where: { id: payment.id },
    data: { amountPaid },
  });

  return updatedPayment;
};

exports.handlePaynowWebhook = async (req, res) => {
  try {
    const webhookProviderName =
      String(process.env.PAYMENT_PROVIDER || "").trim().toLowerCase() === "mock"
        ? "mock"
        : "paynow";
    const provider = getProviderByName(webhookProviderName);
    const result = await provider.verifyWebhook(req.body, req.headers);

    if (!result.valid) {
      return res.status(200).json({ status: "ignored", reason: "invalid hash" });
    }

    const eventId =
      result.eventId || hashEventId(webhookProviderName, result.transactionRef, result.status);
    const eventRecord = await recordWebhookEvent(webhookProviderName, eventId, req.body);

    if (eventRecord.duplicate) {
      return res.status(200).json({ status: "ok", reason: "already processed" });
    }

    if (!SUCCESSFUL_PAYNOW_STATUSES.includes(normalizeStatus(result.status))) {
      try {
        console.log(
          `[webhook] Non-success status for transactionRef=${result.transactionRef}: status=${result.status}`
        );
        await prisma.payment.updateMany({
          where: { transactionRef: result.transactionRef },
          data: { status: "failed" },
        });
      } catch (logErr) {
        console.log("[webhook] Error marking failed payment:", logErr.message);
      }

      return res.status(200).json({ status: "ok" });
    }

    const amountPaid = normalizeAmount(result.amountPaid);
    const updateResult = await prisma.payment.updateMany({
      where: {
        transactionRef: result.transactionRef,
        webhookVerified: false,
      },
      data: {
        webhookVerified: true,
        status: "success",
        ...(amountPaid !== undefined ? { amountPaid } : {}),
      },
    });

    if (updateResult.count === 0) {
      return res.status(200).json({ status: "ok", reason: "already processed" });
    }

    let claimedPayment = await prisma.payment.findFirst({
      where: { transactionRef: result.transactionRef },
    });

    if (!claimedPayment) {
      return res.status(200).json({ status: "ok", reason: "payment missing" });
    }

    try {
      claimedPayment = await ensureConfirmedAmount(claimedPayment, amountPaid);

      if (isLegacyNonBookingPaymentType(claimedPayment)) {
        await prisma.payment.update({
          where: { id: claimedPayment.id },
          data: {
            webhookVerified: false,
            status: "failed",
          },
        });

        return res.status(200).json({
          status: "manual_migration_required",
          reason: "Legacy non-booking payment requires manual migration",
        });
      }

      await applyPaymentSuccess(
        {
          ...claimedPayment,
          providerMeta: {
            ...(claimedPayment.providerMeta || {}),
            earlyAccess: req.query?.earlyAccess === "true",
          },
        },
        prisma
      );

      return res.status(200).json({ status: "ok" });
    } catch (sideEffectErr) {
      console.log(
        `[webhook] Side effect error for transactionRef=${result.transactionRef}: ${sideEffectErr.message}`
      );
      try {
        await prisma.payment.update({
          where: { id: claimedPayment.id },
          data: {
            webhookVerified: false,
            status: "pending",
          },
        });
      } catch (resetErr) {
        console.log("[webhook] Error resetting webhook claim:", resetErr.message);
      }
      await removeWebhookEvent(webhookProviderName, eventId);

      return res.status(200).json({ status: "error" });
    }
  } catch (err) {
    console.log("[webhook] Unexpected error:", err.message);
    return res.status(200).json({ status: "error" });
  }
};

const findPaymentForProviderRef = (providerRef) =>
  prisma.payment.findFirst({
    where: {
      OR: [{ transactionRef: providerRef }, { providerIntentId: providerRef }],
    },
  });

exports.handleStripeWebhook = async (req, res) => {
  try {
    const provider = getProviderByName("stripe");
    const result = await provider.verifyWebhook(req.body, req.headers);

    if (!result.valid) {
      return res.status(200).json({ status: "ignored", reason: "invalid signature" });
    }

    const eventId =
      result.eventId || hashEventId("stripe", result.transactionRef, result.status);
    const eventRecord = await recordWebhookEvent(
      "stripe",
      eventId,
      result.payload || {
        type: result.status,
        transactionRef: result.transactionRef,
      }
    );

    if (eventRecord.duplicate) {
      return res.status(200).json({ status: "ok", reason: "already processed" });
    }

    if (result.status === "payment_intent.succeeded") {
      const payment = await findPaymentForProviderRef(result.transactionRef);

      if (!payment) {
        return res.status(200).json({ status: "ok", reason: "payment missing" });
      }

      const amountPaid = normalizeAmount(result.amountPaid) ?? Number(payment.amountDue || payment.amount || 0);
      let updatedPayment;

      try {
        updatedPayment = await prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: "success",
            webhookVerified: true,
            amountPaid,
          },
        });

        if (isLegacyNonBookingPaymentType(updatedPayment)) {
          await prisma.payment.update({
            where: { id: updatedPayment.id },
            data: {
              webhookVerified: false,
              status: "failed",
            },
          });

          return res.status(200).json({
            status: "manual_migration_required",
            reason: "Legacy non-booking payment requires manual migration",
          });
        }

        await applyPaymentSuccess(updatedPayment, prisma);
      } catch (sideEffectErr) {
        console.log(
          `[webhook] Stripe side effect error for transactionRef=${result.transactionRef}: ${sideEffectErr.message}`
        );
        try {
          await prisma.payment.update({
            where: { id: updatedPayment?.id || payment.id },
            data: {
              webhookVerified: false,
              status: "pending",
            },
          });
        } catch (resetErr) {
          console.log("[webhook] Error resetting Stripe webhook claim:", resetErr.message);
        }
        await removeWebhookEvent("stripe", eventId);

        return res.status(200).json({ status: "error" });
      }

      return res.status(200).json({ status: "ok" });
    }

    if (result.status === "payment_intent.payment_failed") {
      await prisma.payment.updateMany({
        where: {
          OR: [{ transactionRef: result.transactionRef }, { providerIntentId: result.transactionRef }],
        },
        data: { status: "failed" },
      });

      return res.status(200).json({ status: "ok" });
    }

    if (result.status === "charge.refunded") {
      if (prisma.refund?.updateMany) {
        await prisma.refund.updateMany({
          where: { providerRefId: result.providerRefId },
          data: { status: "success" },
        });
      }

      return res.status(200).json({ status: "ok" });
    }

    return res.status(200).json({ status: "ok", reason: "event ignored" });
  } catch (err) {
    console.log("[webhook] Stripe webhook error:", err.message);
    return res.status(200).json({ status: "error" });
  }
};
