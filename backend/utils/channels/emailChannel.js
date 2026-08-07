const { sendEmail } = require("../email");

const send = async ({ to, subject, html, text }) => {
  if (!to) {
    return { skipped: true, reason: "missing_recipient" };
  }

  return sendEmail({
    to,
    subject,
    html,
    text,
  });
};

module.exports = {
  send,
};
