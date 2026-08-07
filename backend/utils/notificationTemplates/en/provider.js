const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const getProviderName = (provider) =>
  provider?.username || provider?.providerProfile?.businessName || "Provider";

const getAccommodationName = (accommodation) =>
  accommodation?.name || accommodation?.businessName || "your accommodation";

const toTemplate = ({ subject, text, smsBody, inAppTitle, inAppBody }) => ({
  subject,
  html: String(text || "")
    .split("\n")
    .filter(Boolean)
    .map((line) => `<p>${escapeHtml(line)}</p>`)
    .join(""),
  text,
  smsBody: smsBody || subject,
  inAppTitle: inAppTitle || subject,
  inAppBody: inAppBody || text,
});

exports["provider.approved"] = ({ provider }) =>
  toTemplate({
    subject: "Your provider profile was approved",
    text: [
      `Hi ${getProviderName(provider)},`,
      "Your Town Ruins provider profile has been approved.",
      "You can now publish stays and accept bookings.",
    ].join("\n"),
    smsBody: "Your Town Ruins provider profile was approved.",
    inAppTitle: "Provider profile approved",
    inAppBody: "You can now publish stays and accept bookings.",
  });

exports["provider.rejected"] = ({ provider }) =>
  toTemplate({
    subject: "Your provider profile was rejected",
    text: [
      `Hi ${getProviderName(provider)},`,
      "Your Town Ruins provider profile was rejected.",
      "Review the notes in your dashboard before submitting again.",
    ].join("\n"),
    smsBody: "Your Town Ruins provider profile was rejected.",
    inAppTitle: "Provider profile rejected",
    inAppBody: "Review the notes in your dashboard before submitting again.",
  });

exports["provider.suspended"] = ({ provider, reason }) =>
  toTemplate({
    subject: "Your provider profile was suspended",
    text: [
      `Hi ${getProviderName(provider)},`,
      "Your Town Ruins provider profile has been suspended.",
      reason ? `Reason: ${reason}` : "Please contact support for more information.",
    ].join("\n"),
    smsBody: "Your Town Ruins provider profile was suspended.",
    inAppTitle: "Provider profile suspended",
    inAppBody: reason || "Please contact support for more information.",
  });

exports["provider.reinstated"] = ({ provider }) =>
  toTemplate({
    subject: "Your provider profile was reinstated",
    text: [
      `Hi ${getProviderName(provider)},`,
      "Your Town Ruins provider profile has been reinstated.",
      "You can accept new bookings again.",
    ].join("\n"),
    smsBody: "Your Town Ruins provider profile was reinstated.",
    inAppTitle: "Provider profile reinstated",
    inAppBody: "You can accept new bookings again.",
  });

exports["accommodation.approved"] = ({ provider, accommodation }) =>
  toTemplate({
    subject: "Your accommodation was approved",
    text: [
      `Hi ${getProviderName(provider)},`,
      `${getAccommodationName(accommodation)} has been approved and published.`,
    ].join("\n"),
    smsBody: "Your Town Ruins accommodation was approved.",
    inAppTitle: "Accommodation approved",
    inAppBody: `${getAccommodationName(accommodation)} is now published.`,
  });

exports["accommodation.rejected"] = ({ provider, accommodation, reason }) =>
  toTemplate({
    subject: "Your accommodation was rejected",
    text: [
      `Hi ${getProviderName(provider)},`,
      `${getAccommodationName(accommodation)} was not approved.`,
      reason ? `Reason: ${reason}` : "Review the listing and submit it again.",
    ].join("\n"),
    smsBody: "Your Town Ruins accommodation was rejected.",
    inAppTitle: "Accommodation rejected",
    inAppBody: reason || "Review the listing and submit it again.",
  });

exports["accommodation.suspended"] = ({ provider, accommodation, reason }) =>
  toTemplate({
    subject: "Your accommodation was suspended",
    text: [
      `Hi ${getProviderName(provider)},`,
      `${getAccommodationName(accommodation)} has been suspended.`,
      reason ? `Reason: ${reason}` : "Please contact support for more information.",
    ].join("\n"),
    smsBody: "Your Town Ruins accommodation was suspended.",
    inAppTitle: "Accommodation suspended",
    inAppBody: reason || "Please contact support for more information.",
  });

exports["report.resolved"] = ({ report, resolution }) =>
  toTemplate({
    subject: "Your report was resolved",
    text: [
      "Your Town Ruins report has been reviewed.",
      resolution ? `Resolution: ${resolution}` : "The moderation team has closed the report.",
      report?.targetType ? `Reported item: ${report.targetType}` : "",
    ].join("\n"),
    smsBody: "Your Town Ruins report was resolved.",
    inAppTitle: "Report resolved",
    inAppBody: resolution || "The moderation team has closed the report.",
  });
