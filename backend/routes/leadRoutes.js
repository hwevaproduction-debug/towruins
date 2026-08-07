const express = require("express");
const router = express.Router();
const { sendEmail } = require("../utils/email");
const catchAsync = require("../utils/catchAsync");

router.post(
  "/property-interest",
  catchAsync(async (req, res) => {
    const { fullName, email, phone, propertyType, location, description, referral } =
      req.body;
    const adminEmail = process.env.ADMIN_EMAIL || process.env.GMAIL_USER;
    if (adminEmail) {
      await sendEmail({
        to: adminEmail,
        subject: "New property listing interest",
        text: `Name: ${fullName}\nEmail: ${email}\nPhone: ${
          phone || "N/A"
        }\nType: ${propertyType}\nLocation: ${location}\nDescription: ${description}\nReferral: ${
          referral || "N/A"
        }`,
        html: `<h2>New Property Interest Submission</h2><p><strong>Name:</strong> ${fullName}</p><p><strong>Email:</strong> ${email}</p><p><strong>Phone:</strong> ${
          phone || "N/A"
        }</p><p><strong>Property Type:</strong> ${propertyType}</p><p><strong>Location:</strong> ${location}</p><p><strong>Description:</strong> ${description}</p><p><strong>Referral:</strong> ${
          referral || "N/A"
        }</p>`,
      });
    }
    res
      .status(201)
      .json({ status: "success", message: "Interest submitted successfully." });
  })
);

module.exports = router;
