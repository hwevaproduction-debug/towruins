const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");
const prisma = require("../utils/prisma");
const walletService = require("../utils/walletService");

const ENGAGEMENT_FEE_TR = walletService.ENGAGEMENT_FEE_TR;

const requireRole = (user, role) => user?.role === role;

const hideListingContactDetails = (engagement) => {
  if (engagement.status === "APPROVED" || engagement.status === "CHARGED" || !engagement.listing) {
    return engagement;
  }

  return {
    ...engagement,
    listing: {
      ...engagement.listing,
      address: null,
      phoneNumber: null,
    },
  };
};

exports.createEngagement = catchAsync(async (req, res, next) => {
  if (!requireRole(req.user, "tenant")) {
    return next(new AppError("Access denied", 403));
  }

  const { listingId, message } = req.body;
  if (!listingId || !message) {
    return next(new AppError("Listing and message are required", 400));
  }

  const listing = await prisma.listing.findUnique({ where: { id: listingId } });
  if (!listing) {
    return next(new AppError("Listing not found", 404));
  }

  const activeEngagement = await prisma.engagement.findFirst({
    where: {
      listingId,
      tenantId: req.user.id,
      status: { in: ["PENDING", "APPROVED", "CHARGED"] },
    },
  });
  if (activeEngagement) {
    return next(
      new AppError("You have already sent a request for this listing", 400)
    );
  }

  const engagement = await prisma.engagement.create({
    data: {
      listingId,
      tenantId: req.user.id,
      landlordId: listing.userId,
      message,
    },
  });

  await prisma.notification.create({
    data: {
      userId: listing.userId,
      event: "engagement.new",
      title: "New enquiry received",
      body: `${req.user.username} sent a message about "${listing.name}"`,
      metadata: { engagementId: engagement.id, listingId },
    },
  });

  res.status(201).json({ status: "success", data: { engagement } });
});

exports.getMyEngagements = catchAsync(async (req, res, next) => {
  if (!requireRole(req.user, "tenant")) {
    return next(new AppError("Access denied", 403));
  }

  const engagements = await prisma.engagement.findMany({
    where: { tenantId: req.user.id },
    include: {
      listing: {
        select: {
          id: true,
          name: true,
          monthlyRent: true,
          imageUrls: true,
          address: true,
          phoneNumber: true,
          city: true,
          province: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  res.status(200).json({
    status: "success",
    data: engagements.map(hideListingContactDetails),
  });
});

exports.getIncomingEngagements = catchAsync(async (req, res, next) => {
  if (!requireRole(req.user, "landlord")) {
    return next(new AppError("Access denied", 403));
  }

  const engagements = await prisma.engagement.findMany({
    where: { landlordId: req.user.id },
    include: {
      listing: { select: { id: true, name: true } },
      tenant: {
        select: { id: true, username: true, avatar: true, email: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  res.status(200).json({ status: "success", data: engagements });
});

exports.respondToEngagement = catchAsync(async (req, res, next) => {
  if (!requireRole(req.user, "landlord")) {
    return next(new AppError("Access denied", 403));
  }

  const { action } = req.body;
  if (!["approve", "decline"].includes(action)) {
    return next(new AppError("Action must be approve or decline", 400));
  }

  const engagement = await prisma.engagement.findUnique({
    where: { id: req.params.id },
    include: { listing: true, tenant: true },
  });

  if (!engagement || engagement.landlordId !== req.user.id) {
    return next(new AppError("Not found", 404));
  }

  if (engagement.status !== "PENDING") {
    return next(new AppError("Engagement has already been responded to", 409));
  }

  let updated;

  if (action === "approve") {
    try {
      await prisma.$transaction(async (tx) => {
        updated = await tx.engagement.update({
          where: { id: req.params.id },
          data: { status: "APPROVED" },
          include: { listing: true, tenant: true },
        });

        await walletService.deductTokens(
          engagement.tenantId,
          ENGAGEMENT_FEE_TR,
          "engagement_charge",
          `Contact approved — ${engagement.listing.name}`,
          tx
        );

        await tx.notification.create({
          data: {
            userId: engagement.tenantId,
            event: "engagement.approved",
            title: "Enquiry approved",
            body: `Your request for "${engagement.listing.name}" was approved. Contact details are now visible. ${ENGAGEMENT_FEE_TR} TR tokens were charged.`,
            metadata: { engagementId: engagement.id, listingId: engagement.listingId, tokensDeducted: ENGAGEMENT_FEE_TR },
          },
        });
      });
    } catch (err) {
      if (err.statusCode === 402) {
        return next(new AppError(`Tenant has insufficient TR tokens. At least ${ENGAGEMENT_FEE_TR} TR required.`, 402));
      }
      throw err;
    }
  } else {
    const timestamped = await prisma.engagement.update({
      where: { id: req.params.id },
      data: { status: "DECLINED" },
    });
    updated = timestamped;
    await prisma.notification.create({
      data: {
        userId: engagement.tenantId,
        event: "engagement.declined",
        title: "Enquiry not approved",
        body: `Your request for "${engagement.listing.name}" was not approved.`,
        metadata: { engagementId: engagement.id, listingId: engagement.listingId },
      },
    });
  }

  res.status(200).json({ status: "success", data: { engagement: updated } });
});
