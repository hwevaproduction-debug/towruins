const crypto = require("crypto");
const csv = require("csv-parse/sync");
const bcrypt = require("bcryptjs");
const { v4: uuidv4 } = require("uuid");

const catchAsync = require("../utils/catchAsync");
const prisma = require("../utils/prisma");
const AppError = require("../utils/appError");
const { sendEmail, buildBrandedEmail } = require("../utils/email");
const auditLog = require("../utils/auditLog");

const VALID_ROLES = ["tenant", "landlord", "provider"];
const CLAIM_TOKEN_EXPIRY_HOURS = 7 * 24; // 7 days
const SALT_ROUNDS = 10;

const getAppBaseUrl = () => {
  const configuredBaseUrl =
    process.env.APP_BASE_URL || process.env.FRONTEND_URL || "http://localhost:3000";
  return configuredBaseUrl.replace(/\/+$/, "");
};

const generateClaimToken = () => {
  const rawToken = crypto.randomBytes(32).toString("hex");
  const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");
  return { rawToken, hashedToken };
};

const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validateRole = (role) => {
  return VALID_ROLES.includes(role?.toLowerCase());
};

const parseCSV = (fileBuffer) => {
  try {
    const content = fileBuffer.toString("utf-8");
    const records = csv.parse(content, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true,
    });
    return records;
  } catch (error) {
    throw new AppError(`CSV parsing failed: ${error.message}`, 400);
  }
};

const validateRow = async (row, rowNumber, existingEmails) => {
  const errors = [];
  const data = {};

  // Email validation
  if (!row.email || !row.email.trim()) {
    errors.push("Email is required");
  } else if (!validateEmail(row.email.trim())) {
    errors.push("Invalid email format");
  } else {
    data.email = row.email.trim().toLowerCase();
    if (existingEmails.has(data.email)) {
      errors.push("Email already exists in database");
    }
  }

  // Role validation
  if (!row.role || !row.role.trim()) {
    errors.push("Role is required");
  } else if (!validateRole(row.role.trim())) {
    errors.push(`Invalid role. Must be one of: ${VALID_ROLES.join(", ")}`);
  } else {
    data.role = row.role.trim().toLowerCase();
  }

  // First name
  if (!row.firstName || !row.firstName.trim()) {
    errors.push("First name is required");
  } else {
    data.firstName = row.firstName.trim();
  }

  // Last name
  if (!row.lastName || !row.lastName.trim()) {
    errors.push("Last name is required");
  } else {
    data.lastName = row.lastName.trim();
  }

  // Phone (optional)
  if (row.phoneNumber && row.phoneNumber.trim()) {
    data.phoneNumber = row.phoneNumber.trim();
  }

  return {
    isValid: errors.length === 0,
    errors,
    data,
  };
};

/**
 * Validate bulk import - parse and validate without creating users
 * POST /api/v1/admin/onboarding/import/validate
 */
exports.validateImport = catchAsync(async (req, res, next) => {
  if (!req.file) {
    return next(new AppError("CSV file is required", 400));
  }

  const rows = parseCSV(req.file.buffer);

  if (rows.length === 0) {
    return res.status(200).json({
      status: "success",
      data: {
        totalRows: 0,
        valid: 0,
        invalid: 0,
        validRows: [],
        invalidRows: [],
      },
    });
  }

  // Get existing emails to detect duplicates
  const existingUsers = await prisma.user.findMany({
    where: { email: { in: rows.map((r) => r.email?.toLowerCase()).filter(Boolean) } },
    select: { email: true },
  });
  const existingEmails = new Set(existingUsers.map((u) => u.email));

  // Track duplicate emails within the import file
  const seenEmails = new Set();
  const validRows = [];
  const invalidRows = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNumber = i + 2; // +2 because row 1 is header

    const validation = await validateRow(row, rowNumber, existingEmails);

    if (!validation.isValid) {
      invalidRows.push({
        rowNumber,
        email: row.email || "N/A",
        errors: validation.errors,
      });
    } else {
      // Check for duplicates within import
      if (seenEmails.has(validation.data.email)) {
        invalidRows.push({
          rowNumber,
          email: validation.data.email,
          errors: ["Duplicate email in import file"],
        });
      } else {
        seenEmails.add(validation.data.email);
        validRows.push({
          rowNumber,
          ...validation.data,
        });
      }
    }
  }

  res.status(200).json({
    status: "success",
    data: {
      totalRows: rows.length,
      valid: validRows.length,
      invalid: invalidRows.length,
      validRows,
      invalidRows,
    },
  });
});

/**
 * Create bulk import batch and users
 * POST /api/v1/admin/onboarding/import
 */
exports.createImport = catchAsync(async (req, res, next) => {
  if (!req.file) {
    return next(new AppError("CSV file is required", 400));
  }

  const adminId = req.user.id;
  const rows = parseCSV(req.file.buffer);

  if (rows.length === 0) {
    return next(new AppError("CSV file is empty", 400));
  }

  // Validate all rows first
  const existingUsers = await prisma.user.findMany({
    where: { email: { in: rows.map((r) => r.email?.toLowerCase()).filter(Boolean) } },
    select: { email: true },
  });
  const existingEmails = new Set(existingUsers.map((u) => u.email));

  const seenEmails = new Set();
  const validRows = [];
  const validationErrors = {};

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNumber = i + 2;

    const validation = await validateRow(row, rowNumber, existingEmails);

    if (!validation.isValid) {
      validationErrors[rowNumber] = validation.errors;
    } else if (seenEmails.has(validation.data.email)) {
      validationErrors[rowNumber] = ["Duplicate email in import file"];
    } else {
      seenEmails.add(validation.data.email);
      validRows.push({
        rowNumber,
        ...validation.data,
      });
    }
  }

  if (validRows.length === 0) {
    return res.status(400).json({
      status: "fail",
      data: {
        message: "No valid rows to import",
        validationErrors,
      },
    });
  }

  // Create batch and rows in transaction
  const result = await prisma.$transaction(async (tx) => {
    // Create batch record
    const batch = await tx.adminImportBatch.create({
      data: {
        adminId,
        fileName: req.file.originalname,
        totals: {
          total: rows.length,
          valid: validRows.length,
          invalid: Object.keys(validationErrors).length,
        },
      },
    });

    const createdUsers = [];
    const createdInvitations = [];
    const failed = [];

    // Create users and invitations
    for (const rowData of validRows) {
      try {
        // Generate temp password
        const tempPassword = uuidv4();
        const hashedPassword = await bcrypt.hash(tempPassword, SALT_ROUNDS);

        // Generate claim token
        const { rawToken, hashedToken } = generateClaimToken();
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + CLAIM_TOKEN_EXPIRY_HOURS);

        // Create user
        const user = await tx.user.create({
          data: {
            username: `${rowData.email.split("@")[0]}_${Date.now()}`,
            email: rowData.email,
            password: hashedPassword,
            role: rowData.role,
            phoneNumber: rowData.phoneNumber || null,
            isEmailVerified: false,
            onboardingStatus: "not_started",
          },
        });

        // Create invitation
        const invitation = await tx.userInvitation.create({
          data: {
            userId: user.id,
            adminId,
            tokenHash: hashedToken,
            expiresAt,
            status: "PENDING",
            batchId: batch.id,
          },
        });

        // Store raw token and user info for email sending (will be done after transaction)
        createdUsers.push({
          id: user.id,
          email: user.email,
          role: user.role,
          firstName: rowData.firstName,
          lastName: rowData.lastName,
          rawToken,
          invitationId: invitation.id,
        });

        // Log import row
        await tx.adminImportRow.create({
          data: {
            batchId: batch.id,
            rowNumber: rowData.rowNumber,
            email: rowData.email,
            payload: rowData,
            status: "SUCCESS",
          },
        });
      } catch (error) {
        failed.push({
          rowNumber: rowData.rowNumber,
          email: rowData.email,
          error: error.message,
        });
      }
    }

    // Log failed import rows
    for (const [rowNumber, errors] of Object.entries(validationErrors)) {
      await tx.adminImportRow.create({
        data: {
          batchId: batch.id,
          rowNumber: parseInt(rowNumber),
          email: rows[parseInt(rowNumber) - 2]?.email || "N/A",
          payload: rows[parseInt(rowNumber) - 2] || {},
          status: "FAILED",
          errors,
        },
      });
    }

    // Audit log
    await tx.auditLog.create({
      data: {
        adminId,
        action: "BULK_IMPORT_USERS",
        targetType: "AdminImportBatch",
        targetId: batch.id,
        metadata: {
          fileName: req.file.originalname,
          totalRows: rows.length,
          successCount: createdUsers.length,
          failCount: Object.keys(validationErrors).length,
        },
      },
    });

    return { batch, createdUsers, failed };
  });

  // Send invitation emails (outside transaction)
  const emailResults = [];
  for (const userData of result.createdUsers) {
    try {
      const claimUrl = `${getAppBaseUrl()}/claim-account?token=${userData.rawToken}`;
      await sendEmail({
        to: userData.email,
        subject: "Claim Your Town Ruins Account",
        html: buildBrandedEmail({
          title: "Welcome to Town Ruins",
          preheader: "Your administrator has created an account for you",
          body: `
<p>Hi ${userData.firstName},</p>
<p>Your administrator has created an account for you on Town Ruins.</p>
<p><strong>Role:</strong> ${userData.role}</p>
<p>To activate your account and set your password, click the button below. This link expires in 7 days.</p>
          `,
          ctaText: "Claim Your Account",
          ctaUrl: claimUrl,
        }),
      });
      emailResults.push({
        email: userData.email,
        status: "sent",
      });

      // Update invitation status to SENT
      await prisma.userInvitation.update({
        where: { id: userData.invitationId },
        data: { sentAt: new Date() },
      });
    } catch (error) {
      emailResults.push({
        email: userData.email,
        status: "failed",
        error: error.message,
      });
    }
  }

  auditLog.createEntry({
    adminId,
    action: "IMPORT_EMAILS_SENT",
    targetType: "AdminImportBatch",
    targetId: result.batch.id,
    metadata: {
      sentCount: emailResults.filter((r) => r.status === "sent").length,
      failedCount: emailResults.filter((r) => r.status === "failed").length,
    },
  });

  res.status(201).json({
    status: "success",
    data: {
      batch: {
        id: result.batch.id,
        fileName: result.batch.fileName,
        createdAt: result.batch.createdAt,
      },
      results: {
        created: result.createdUsers.length,
        failed: result.failed.length,
        emailsSent: emailResults.filter((r) => r.status === "sent").length,
        emailsFailed: emailResults.filter((r) => r.status === "failed").length,
      },
      failures: result.failed.length > 0 ? result.failed : null,
    },
  });
});

/**
 * Validate account claim token
 * GET /api/v1/account/claim/validate?token=...
 */
exports.validateClaimToken = catchAsync(async (req, res, next) => {
  const { token } = req.query;

  if (!token) {
    return next(new AppError("Claim token is required", 400));
  }

  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

  const invitation = await prisma.userInvitation.findFirst({
    where: {
      tokenHash: hashedToken,
      status: "PENDING",
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          role: true,
          onboardingStatus: true,
        },
      },
    },
  });

  if (!invitation) {
    return next(new AppError("Invalid or expired claim token", 400));
  }

  if (invitation.expiresAt < new Date()) {
    return next(new AppError("Claim token has expired", 400));
  }

  res.status(200).json({
    status: "success",
    data: {
      user: invitation.user,
      expiresAt: invitation.expiresAt,
    },
  });
});

/**
 * Claim account - set password and activate
 * POST /api/v1/account/claim
 */
exports.claimAccount = catchAsync(async (req, res, next) => {
  const { token, password, passwordConfirm } = req.body;

  if (!token) {
    return next(new AppError("Claim token is required", 400));
  }

  if (!password || !passwordConfirm) {
    return next(new AppError("Password and confirmation are required", 400));
  }

  if (password !== passwordConfirm) {
    return next(new AppError("Passwords do not match", 400));
  }

  if (password.length < 8) {
    return next(new AppError("Password must be at least 8 characters", 400));
  }

  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

  const invitation = await prisma.userInvitation.findFirst({
    where: {
      tokenHash: hashedToken,
      status: "PENDING",
    },
    include: {
      user: true,
    },
  });

  if (!invitation) {
    return next(new AppError("Invalid claim token", 400));
  }

  if (invitation.expiresAt < new Date()) {
    return next(new AppError("Claim token has expired", 400));
  }

  if (invitation.claimedAt) {
    return next(new AppError("This invitation has already been claimed", 400));
  }

  // Hash new password
  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

  // Update user and mark invitation as claimed
  const user = await prisma.$transaction(async (tx) => {
    const updatedUser = await tx.user.update({
      where: { id: invitation.userId },
      data: {
        password: hashedPassword,
        isEmailVerified: true,
      },
    });

    await tx.userInvitation.update({
      where: { id: invitation.id },
      data: {
        status: "CLAIMED",
        claimedAt: new Date(),
      },
    });

    // Audit log
    await tx.auditLog.create({
      data: {
        adminId: invitation.adminId,
        action: "ACCOUNT_CLAIMED",
        targetType: "User",
        targetId: invitation.userId,
        metadata: {
          invitationId: invitation.id,
        },
      },
    });

    return updatedUser;
  });

  // Return JWT token for immediate authentication
  const jwt = require("jsonwebtoken");
  const authToken = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });

  res.status(200).json({
    status: "success",
    token: authToken,
    data: {
      user: {
        _id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        onboardingStatus: user.onboardingStatus,
      },
    },
  });
});

/**
 * Resend invitation email
 * POST /api/v1/admin/invitations/:invitationId/resend
 */
exports.resendInvitation = catchAsync(async (req, res, next) => {
  const { invitationId } = req.params;

  const invitation = await prisma.userInvitation.findUnique({
    where: { id: invitationId },
    include: {
      user: true,
    },
  });

  if (!invitation) {
    return next(new AppError("Invitation not found", 404));
  }

  if (invitation.status === "CLAIMED") {
    return next(new AppError("Cannot resend invitation for already-claimed account", 400));
  }

  if (invitation.revokedAt) {
    return next(new AppError("Invitation has been revoked", 400));
  }

  // Generate new token
  const { rawToken, hashedToken } = generateClaimToken();
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + CLAIM_TOKEN_EXPIRY_HOURS);

  const updatedInvitation = await prisma.userInvitation.update({
    where: { id: invitationId },
    data: {
      tokenHash: hashedToken,
      expiresAt,
      status: "PENDING",
      sentAt: null,
    },
  });

  // Send email
  const claimUrl = `${getAppBaseUrl()}/claim-account?token=${rawToken}`;
  try {
    await sendEmail({
      to: invitation.user.email,
      subject: "Claim Your Town Ruins Account - Invitation Resent",
      html: buildBrandedEmail({
        title: "Welcome to Town Ruins",
        preheader: "Resend: Claim your account",
        body: `
<p>Hi ${invitation.user.username},</p>
<p>Your administrator has resent your account activation link.</p>
<p><strong>Role:</strong> ${invitation.user.role}</p>
<p>To activate your account and set your password, click the button below. This link expires in 7 days.</p>
        `,
        ctaText: "Claim Your Account",
        ctaUrl: claimUrl,
      }),
    });

    await prisma.userInvitation.update({
      where: { id: invitationId },
      data: { sentAt: new Date() },
    });

    auditLog.createEntry({
      adminId: req.user.id,
      action: "INVITATION_RESENT",
      targetType: "UserInvitation",
      targetId: invitationId,
      metadata: {
        userId: invitation.userId,
        email: invitation.user.email,
      },
    });
  } catch (error) {
    return next(
      new AppError(
        `Could not resend invitation. Email error: ${error.message}`,
        500
      )
    );
  }

  res.status(200).json({
    status: "success",
    data: {
      message: "Invitation resent successfully",
      invitation: {
        id: updatedInvitation.id,
        status: updatedInvitation.status,
        expiresAt: updatedInvitation.expiresAt,
        sentAt: updatedInvitation.sentAt,
      },
    },
  });
});

/**
 * Revoke invitation
 * POST /api/v1/admin/invitations/:invitationId/revoke
 */
exports.revokeInvitation = catchAsync(async (req, res, next) => {
  const { invitationId } = req.params;

  const invitation = await prisma.userInvitation.findUnique({
    where: { id: invitationId },
  });

  if (!invitation) {
    return next(new AppError("Invitation not found", 404));
  }

  if (invitation.claimedAt) {
    return next(new AppError("Cannot revoke already-claimed invitation", 400));
  }

  if (invitation.revokedAt) {
    return next(new AppError("Invitation already revoked", 400));
  }

  const revokedInvitation = await prisma.userInvitation.update({
    where: { id: invitationId },
    data: {
      status: "REVOKED",
      revokedAt: new Date(),
    },
  });

  auditLog.createEntry({
    adminId: req.user.id,
    action: "INVITATION_REVOKED",
    targetType: "UserInvitation",
    targetId: invitationId,
    metadata: {
      userId: invitation.userId,
    },
  });

  res.status(200).json({
    status: "success",
    data: {
      message: "Invitation revoked",
      invitation: revokedInvitation,
    },
  });
});

/**
 * Get pending invitations
 * GET /api/v1/admin/invitations?status=PENDING
 */
exports.getInvitations = catchAsync(async (req, res, next) => {
  const { status = "PENDING", page = 1, limit = 20 } = req.query;
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const skip = (pageNum - 1) * limitNum;

  const invitations = await prisma.UserInvitation.findMany({
    where: status ? { status } : {},
    include: {
      user: {
        select: {
          id: true,
          email: true,
          username: true,
          role: true,
        },
      },
      admin: {
        select: {
          id: true,
          email: true,
          username: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    skip,
    take: limitNum,
  });

  const total = await prisma.UserInvitation.count({
    where: status ? { status } : {},
  });

  res.status(200).json({
    status: "success",
    data: {
      invitations,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    },
  });
});

/**
 * Complete onboarding
 * POST /api/v1/account/onboarding/complete
 */
exports.completeOnboarding = catchAsync(async (req, res, next) => {
  const userId = req.user.id;
  const { skipped = false } = req.body;

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      onboardingStatus: skipped ? "skipped" : "completed",
      onboardingCompletedAt: new Date(),
    },
  });

  auditLog.createEntry({
    adminId: userId,
    action: "ONBOARDING_COMPLETED",
    targetType: "User",
    targetId: userId,
    metadata: { skipped },
  });

  res.status(200).json({
    status: "success",
    data: {
      user: {
        _id: user.id,
        onboardingStatus: user.onboardingStatus,
        onboardingCompletedAt: user.onboardingCompletedAt,
      },
    },
  });
});
