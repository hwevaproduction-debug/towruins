const { sendSms } = require("../sms");

const send = async ({ to, message }) => {
  if (process.env.SMS_ENABLED !== "true") {
    return { skipped: true, reason: "sms_disabled" };
  }

  if (!to) {
    return { skipped: true, reason: "missing_recipient" };
  }

  return sendSms({
    to,
    message,
  });
};

module.exports = {
  send,
};
