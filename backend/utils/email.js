const nodemailer = require("nodemailer");

const sendWithGmail = ({ from, to, subject, text, html }) => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });

  return transporter.sendMail({
    from,
    to,
    subject,
    text,
    html,
  });
};

exports.buildBrandedEmail = ({ title, preheader = "", body, ctaText, ctaUrl }) => {
  const cta = ctaText && ctaUrl
    ? `<div style="text-align:center;margin:32px 0"><a href="${ctaUrl}" style="background:#B8975A;color:#ffffff;padding:14px 32px;border-radius:999px;text-decoration:none;font-weight:700;font-size:15px;display:inline-block">${ctaText}</a></div>`
    : "";
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head><body style="margin:0;padding:0;background:#0F141E;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <div style="display:none;max-height:0;overflow:hidden">${preheader}</div>
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0F141E;padding:40px 16px">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%">
        <tr><td style="padding:32px 0;text-align:center;border-bottom:1px solid rgba(184,151,90,0.2)">
          <span style="font-size:22px;font-weight:800;color:#B8975A;letter-spacing:0.05em">TOWN RUINS</span>
        </td></tr>
        <tr><td style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:40px 36px;margin-top:24px">
          <h1 style="color:#ffffff;font-size:24px;font-weight:800;margin:0 0 16px 0">${title}</h1>
          <div style="color:rgba(255,255,255,0.7);font-size:15px;line-height:1.7">${body}</div>
          ${cta}
        </td></tr>
        <tr><td style="padding:24px 0;text-align:center">
          <p style="color:rgba(255,255,255,0.3);font-size:12px;margin:0">© 2026 Town Ruins. All rights reserved.</p>
          <p style="color:rgba(255,255,255,0.2);font-size:11px;margin:8px 0 0 0">You received this email because you have an account on Town Ruins.</p>
        </td></tr>
      </table>
    </td></tr>
  </table></body></html>`;
};

exports.sendEmail = async ({ to, subject, text, html }) => {
  const { GMAIL_USER, EMAIL_FROM } = process.env;
  const from = EMAIL_FROM || GMAIL_USER;

  if (process.env.NODE_ENV === 'test' || !GMAIL_USER) {
    // eslint-disable-next-line no-console
    console.log("[email:mock]", { to, subject, text, html });
    return { mocked: true };
  }

  return sendWithGmail({
    from,
    to,
    subject,
    text,
    html,
  });
};
