const stayEmails = require("../../emailTemplates/stayEmails");

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const getRoomName = (room) =>
  room?.name || room?.title || room?.roomName || room?.listingName || "Booked stay";

const formatDate = (value) => {
  if (!value) {
    return "N/A";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "N/A";
  }

  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const formatMoney = (value) => {
  const amount = Number(value || 0);

  if (!Number.isFinite(amount)) {
    return "0.00";
  }

  return amount.toFixed(2);
};

const getBookingId = (context) =>
  context?.booking?.id || context?.booking?._id || context?.bookingId || "N/A";

const toHtml = (text) =>
  String(text || "")
    .split("\n")
    .filter(Boolean)
    .map((line) => `<p>${escapeHtml(line)}</p>`)
    .join("");

const fromEmailPayload = (payload, overrides = {}) => {
  const text = payload.text || "";
  const subject = overrides.subject || payload.subject || "Booking update";

  return {
    subject,
    html: overrides.html || toHtml(text),
    text,
    smsBody: overrides.smsBody || subject,
    inAppTitle: overrides.inAppTitle || subject,
    inAppBody: overrides.inAppBody || text.split("\n")[0] || subject,
  };
};

const chooseByRecipientRole = (context, guestTemplate, providerTemplate) => {
  if (context?.recipientRole === "provider") {
    return providerTemplate(context);
  }

  return guestTemplate(context);
};

const reminderText = (context, reminderLine) =>
  [
    stayEmails.bookingConfirmedInstantGuest(context).text,
    reminderLine,
  ].join("\n");

exports["booking.request_submitted"] = (context) =>
  fromEmailPayload(stayEmails.bookingRequestSubmittedProvider(context), {
    smsBody: `New booking request for ${getRoomName(context.room)}.`,
    inAppTitle: "New booking request",
    inAppBody: `Review booking ${getBookingId(context)} for ${getRoomName(context.room)}.`,
  });

exports["booking.confirmed_instant"] = (context) =>
  fromEmailPayload(
    chooseByRecipientRole(
      context,
      stayEmails.bookingConfirmedInstantGuest,
      stayEmails.bookingConfirmedInstantProvider
    ),
    {
      smsBody: `Booking confirmed for ${getRoomName(context.room)}.`,
      inAppTitle: "Booking confirmed",
      inAppBody: `Booking ${getBookingId(context)} is confirmed.`,
    }
  );

exports["booking.request_accepted"] = (context) =>
  fromEmailPayload(stayEmails.bookingRequestAcceptedGuest(context), {
    smsBody: `Your booking request for ${getRoomName(context.room)} was accepted.`,
    inAppTitle: "Booking request accepted",
    inAppBody: `Your request for ${getRoomName(context.room)} was accepted.`,
  });

exports["booking.request_declined"] = (context) =>
  fromEmailPayload(stayEmails.bookingRequestDeclinedGuest(context), {
    smsBody: `Your booking request for ${getRoomName(context.room)} was declined.`,
    inAppTitle: "Booking request declined",
    inAppBody: `Your request for ${getRoomName(context.room)} was declined.`,
  });

exports["booking.cancelled_by_guest"] = (context) =>
  fromEmailPayload(stayEmails.bookingCancelledByGuestProvider(context), {
    smsBody: `Guest cancelled booking ${getBookingId(context)}.`,
    inAppTitle: "Booking cancelled",
    inAppBody: `Guest cancelled booking ${getBookingId(context)}.`,
  });

exports["booking.cancelled_by_provider"] = (context) =>
  fromEmailPayload(stayEmails.bookingCancelledByProviderGuest(context), {
    smsBody: `Your booking for ${getRoomName(context.room)} was cancelled.`,
    inAppTitle: "Booking cancelled",
    inAppBody: `Your booking ${getBookingId(context)} was cancelled by the provider.`,
  });

exports["booking.payment_success"] = (context) =>
  fromEmailPayload(
    chooseByRecipientRole(
      context,
      stayEmails.bookingPaymentSuccessGuest,
      stayEmails.bookingPaymentSuccessProvider
    ),
    {
      smsBody: `Payment received for booking ${getBookingId(context)}.`,
      inAppTitle: "Payment received",
      inAppBody: `Payment was received for booking ${getBookingId(context)}.`,
    }
  );

exports["booking.payment_partial"] = (context) =>
  fromEmailPayload(stayEmails.paymentPartialReceived(context), {
    smsBody: `Partial payment received. Balance: ${formatMoney(context.remainingBalance)}.`,
    inAppTitle: "Partial payment received",
    inAppBody: `Remaining balance: ${formatMoney(context.remainingBalance)}.`,
  });

exports["booking.payment_retry"] = (context) =>
  fromEmailPayload(stayEmails.paymentRetryAvailable(context), {
    smsBody: `Payment retry is available for booking ${getBookingId(context)}.`,
    inAppTitle: "Payment retry available",
    inAppBody: "Retry payment from your bookings page to keep this reservation active.",
  });

exports["booking.refund_initiated"] = (context) =>
  fromEmailPayload(stayEmails.paymentRefundInitiated(context), {
    smsBody: `Refund initiated for booking ${getBookingId(context)}.`,
    inAppTitle: "Refund initiated",
    inAppBody: `Refund amount: ${formatMoney(context.refundAmount)}.`,
  });

exports["booking.settlement_completed"] = (context) =>
  fromEmailPayload(stayEmails.bookingSettledProvider(context), {
    smsBody: `Settlement completed for booking ${getBookingId(context)}.`,
    inAppTitle: "Settlement completed",
    inAppBody: `Settlement completed for booking ${getBookingId(context)}.`,
  });

exports["booking.checkin_reminder"] = (context) => {
  const text = reminderText(
    context,
    `Reminder: check-in is on ${formatDate(context.booking?.checkIn || context.checkIn)}.`
  );
  const subject = `Check-in reminder for ${getRoomName(context.room)}`;

  return {
    subject,
    html: toHtml(text),
    text,
    smsBody: `Reminder: check-in for ${getRoomName(context.room)} is on ${formatDate(
      context.booking?.checkIn || context.checkIn
    )}.`,
    inAppTitle: "Check-in reminder",
    inAppBody: `Your stay at ${getRoomName(context.room)} starts soon.`,
  };
};

exports["booking.checkout_reminder"] = (context) => {
  const text = reminderText(
    context,
    `Reminder: check-out is on ${formatDate(context.booking?.checkOut || context.checkOut)}.`
  );
  const subject = `Check-out reminder for ${getRoomName(context.room)}`;

  return {
    subject,
    html: toHtml(text),
    text,
    smsBody: `Reminder: check-out for ${getRoomName(context.room)} is on ${formatDate(
      context.booking?.checkOut || context.checkOut
    )}.`,
    inAppTitle: "Check-out reminder",
    inAppBody: `Your stay at ${getRoomName(context.room)} ends soon.`,
  };
};

exports["dispute.resolved"] = (context) => {
  const text = [
    `Dispute for booking ${getBookingId(context)} has been resolved.`,
    context.resolution ? `Resolution: ${context.resolution}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  return {
    subject: `Dispute resolved for booking ${getBookingId(context)}`,
    html: toHtml(text),
    text,
    smsBody: `Dispute resolved for booking ${getBookingId(context)}.`,
    inAppTitle: "Dispute resolved",
    inAppBody: context.resolution || `Booking ${getBookingId(context)} dispute resolved.`,
  };
};
