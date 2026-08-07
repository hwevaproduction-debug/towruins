const cron = require("node-cron");
const prisma = require("./prisma");
const { renderTemplate } = require("./notificationTemplates");
const emailChannel = require("./channels/emailChannel");
const smsChannel = require("./channels/smsChannel");
const inAppChannel = require("./channels/inAppChannel");
const pushChannel = require("./channels/pushChannel");

let scheduledTask = null;
let isRunning = false;

const getBatchSize = () =>
  Math.max(1, Number.parseInt(process.env.NOTIFICATION_BATCH_SIZE, 10) || 20);

const getMaxRetries = () =>
  Math.max(1, Number.parseInt(process.env.MAX_NOTIFICATION_RETRIES, 10) || 3);

const claimPendingJobs = (limit) =>
  prisma.$queryRaw`
    WITH claimed AS (
      SELECT "id"
      FROM "NotificationJob"
      WHERE "status" = 'pending'
        AND "scheduledAt" <= NOW()
      ORDER BY "scheduledAt" ASC, "createdAt" ASC
      FOR UPDATE SKIP LOCKED
      LIMIT ${limit}
    )
    UPDATE "NotificationJob" AS job
    SET "status" = 'processing',
        "processedAt" = NOW()
    FROM claimed
    WHERE job."id" = claimed."id"
    RETURNING job.*
  `;

const getMetadata = (context = {}) => {
  if (context.metadata && typeof context.metadata === "object") {
    return context.metadata;
  }

  if (context.bookingId) {
    return { bookingId: context.bookingId };
  }

  return undefined;
};

const dispatchJob = async (job, rendered) => {
  if (job.channel === "email") {
    return emailChannel.send({
      to: job.recipientAddress,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
    });
  }

  if (job.channel === "sms") {
    return smsChannel.send({
      to: job.recipientAddress,
      message: rendered.smsBody || rendered.text || rendered.subject,
    });
  }

  if (job.channel === "in_app") {
    return inAppChannel.send({
      userId: job.recipientId,
      event: job.event,
      title: rendered.inAppTitle || rendered.subject,
      body: rendered.inAppBody || rendered.text || rendered.subject,
      metadata: getMetadata(job.context),
    });
  }

  if (job.channel === "push") {
    return pushChannel.send({
      userId: job.recipientId,
      title: rendered.inAppTitle || rendered.subject,
      body: rendered.inAppBody || rendered.text || rendered.subject,
      metadata: getMetadata(job.context),
    });
  }

  throw new Error(`Unsupported notification channel: ${job.channel}`);
};

const markSent = (jobId) =>
  prisma.notificationJob.update({
    where: { id: jobId },
    data: {
      status: "sent",
      processedAt: new Date(),
      lastError: null,
    },
  });

const markFailed = (job, error) => {
  const attempts = Number(job.attempts || 0) + 1;
  const maxRetries = getMaxRetries();
  const dead = attempts >= maxRetries;
  const backoffMs = 2 ** attempts * 60 * 1000;
  const now = new Date();

  return prisma.notificationJob.update({
    where: { id: job.id },
    data: {
      attempts,
      status: dead ? "dead" : "pending",
      lastError: String(error?.message || error).slice(0, 1000),
      scheduledAt: dead ? job.scheduledAt : new Date(now.getTime() + backoffMs),
      processedAt: dead ? now : null,
    },
  });
};

const processJob = async (job) => {
  try {
    const rendered = renderTemplate(job.templateKey, job.context, job.locale);

    await dispatchJob(job, rendered);
    await markSent(job.id);
    return { id: job.id, status: "sent" };
  } catch (err) {
    await markFailed(job, err);
    return { id: job.id, status: "failed", error: err.message };
  }
};

const runNotificationWorker = async () => {
  if (isRunning) {
    return { processed: 0, skipped: true };
  }

  isRunning = true;

  try {
    const jobs = await claimPendingJobs(getBatchSize());

    for (const job of jobs) {
      await processJob(job);
    }

    return { processed: jobs.length };
  } finally {
    isRunning = false;
  }
};

const startNotificationWorker = () => {
  if (scheduledTask) {
    return scheduledTask;
  }

  const expression = process.env.NOTIFICATION_WORKER_CRON || "*/30 * * * * *";

  if (!cron.validate(expression)) {
    console.log(`[notification] Invalid worker cron expression: ${expression}`);
    return null;
  }

  scheduledTask = cron.schedule(expression, () => {
    void runNotificationWorker();
  });
  console.log(`[notification] Scheduled worker: ${expression}`);

  return scheduledTask;
};

module.exports = {
  runNotificationWorker,
  startNotificationWorker,
};
