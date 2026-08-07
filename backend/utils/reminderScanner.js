const cron = require("node-cron");
const prisma = require("./prisma");
const notificationService = require("./notificationService");

let scheduledTask = null;
let isRunning = false;

const HOURS_24_MS = 24 * 60 * 60 * 1000;
const HOURS_25_MS = 25 * 60 * 60 * 1000;

const bookingInclude = {
  room: {
    include: {
      accommodation: {
        select: {
          ownerId: true,
          timezone: true,
        },
      },
    },
  },
  guest: {
    select: {
      id: true,
      email: true,
      username: true,
      phoneNumber: true,
    },
  },
  providerUser: {
    select: {
      id: true,
      email: true,
      username: true,
      phoneNumber: true,
      providerProfile: true,
    },
  },
};

const addClientIds = (booking) => ({
  ...booking,
  _id: booking.id,
  room: booking.room
    ? {
        ...booking.room,
        _id: booking.room.id,
      }
    : null,
  guest: booking.guest
    ? {
        ...booking.guest,
        _id: booking.guest.id,
      }
    : null,
});

const hasReminderJob = async (event, bookingId) =>
  Boolean(
    await prisma.notificationJob.findFirst({
      where: {
        event,
        context: {
          path: ["bookingId"],
          equals: bookingId,
        },
      },
      select: { id: true },
    })
  );

const enqueueReminder = async (event, booking, scheduledAt) => {
  if (await hasReminderJob(event, booking.id)) {
    return false;
  }

  const bookingContext = addClientIds(booking);

  await notificationService.enqueue(
    event,
    {
      bookingId: booking.id,
      booking: bookingContext,
      room: bookingContext.room,
      guest: bookingContext.guest,
      provider: booking.providerUser || null,
    },
    { scheduledAt }
  );

  return true;
};

const findUpcomingBookings = (dateField, now, windowEnd) =>
  prisma.booking.findMany({
    where: {
      status: { in: ["CONFIRMED", "CHECKED_IN"] },
      [dateField]: {
        gte: now,
        lte: windowEnd,
      },
    },
    include: bookingInclude,
  });

const runReminderScan = async () => {
  if (isRunning) {
    return { enqueued: 0, skipped: true };
  }

  isRunning = true;

  try {
    const now = new Date();
    const windowEnd = new Date(now.getTime() + HOURS_25_MS);
    const [checkInBookings, checkOutBookings] = await Promise.all([
      findUpcomingBookings("checkIn", now, windowEnd),
      findUpcomingBookings("checkOut", now, windowEnd),
    ]);
    let enqueued = 0;

    for (const booking of checkInBookings) {
      const scheduledAt = new Date(new Date(booking.checkIn).getTime() - HOURS_24_MS);
      if (await enqueueReminder("booking.checkin_reminder", booking, scheduledAt)) {
        enqueued += 1;
      }
    }

    for (const booking of checkOutBookings) {
      const scheduledAt = new Date(new Date(booking.checkOut).getTime() - HOURS_24_MS);
      if (await enqueueReminder("booking.checkout_reminder", booking, scheduledAt)) {
        enqueued += 1;
      }
    }

    return { enqueued };
  } finally {
    isRunning = false;
  }
};

const startReminderScanner = () => {
  if (scheduledTask) {
    return scheduledTask;
  }

  const expression = process.env.REMINDER_SCAN_CRON || "0 * * * *";

  if (!cron.validate(expression)) {
    console.log(`[notification] Invalid reminder scan cron expression: ${expression}`);
    return null;
  }

  scheduledTask = cron.schedule(expression, () => {
    void runReminderScan();
  });
  console.log(`[notification] Scheduled reminder scanner: ${expression}`);

  return scheduledTask;
};

module.exports = {
  runReminderScan,
  startReminderScanner,
};
