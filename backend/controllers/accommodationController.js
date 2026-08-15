const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const prisma = require("../utils/prisma");

const POLICY_TYPES = new Set([
  "FLEXIBLE",
  "MODERATE",
  "STRICT",
  "NON_REFUNDABLE",
  "CUSTOM",
]);

const getUserId = (user) => user?.id || user?._id?.toString();

const mapId = (record) => {
  if (!record) {
    return record;
  }

  record._id = record.id;
  return record;
};

const mapAccommodation = (accommodation) => {
  mapId(accommodation);
  accommodation?.rooms?.forEach(mapId);
  accommodation?.images?.forEach(mapId);
  accommodation?.amenities?.forEach((amenity) => mapId(amenity.amenity));
  mapId(accommodation?.cancellationPolicy);
  mapId(accommodation?.checkInOutRules);
  mapId(accommodation?.taxRule);
  return accommodation;
};

const ensureOwnsAccommodation = async (accommodationId, userId) => {
  const accommodation = await prisma.accommodation.findFirst({
    where: { id: accommodationId, deletedAt: null },
  });

  if (!accommodation) {
    throw new AppError("Accommodation not found", 404);
  }

  if (accommodation.ownerId !== userId.toString()) {
    throw new AppError("You do not own this accommodation", 403);
  }

  return accommodation;
};

const pickFields = (body, fields) =>
  fields.reduce((updates, field) => {
    if (Object.prototype.hasOwnProperty.call(body, field)) {
      updates[field] = body[field];
    }

    return updates;
  }, {});

exports.getMyAccommodation = catchAsync(async (req, res, next) => {
  const accommodation = await prisma.accommodation.findFirst({
    where: { ownerId: getUserId(req.user), deletedAt: null },
    include: {
      rooms: {
        where: { deletedAt: null },
        include: {
          images: { orderBy: { sortOrder: "asc" } },
        },
      },
      images: { orderBy: { sortOrder: "asc" } },
      amenities: {
        include: { amenity: true },
      },
      cancellationPolicy: true,
      checkInOutRules: true,
      taxRule: true,
    },
  });

  if (!accommodation) {
    return next(new AppError("Accommodation not found", 404));
  }

  res.status(200).json({
    status: "success",
    data: { accommodation: mapAccommodation(accommodation) },
  });
});

exports.createAccommodation = catchAsync(async (req, res, next) => {
  // Only allow creation for verified providers
  const normalizeEnumInput = (value) => {
    if (value == null || value === "") return null;
    return String(value).trim().toUpperCase().replace(/[\s-]+/g, "_");
  };

  if (normalizeEnumInput(req.user?.providerProfile?.verificationStatus) !== "APPROVED") {
    return next(new AppError("Provider verification required", 403));
  }

  const input = { ...req.body };
  delete input.provider;
  delete input.providerProfile;
  delete input.providerId;
  delete input._id;
  delete input.id;

  const requiredFields = ["name", "type", "contactPhone", "province", "city", "addressLine"];
  for (const f of requiredFields) {
    if (!input[f]) {
      return next(new AppError(`${f} is required`, 400));
    }
  }

  // Pick allowed fields
  const updates = pickFields(input, [
    "name",
    "description",
    "contactPhone",
    "province",
    "city",
    "addressLine",
    "timezone",
    "type",
    "isPublished",
  ]);

  // Generate a simple kebab-case slug and ensure uniqueness
  const toSlug = (s) =>
    String(s || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 240);

  let slugBase = toSlug(updates.name || "accommodation");
  let slug = slugBase;
  let suffix = 1;
  // Ensure uniqueness
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const existing = await prisma.accommodation.findUnique({ where: { slug } });
    if (!existing) break;
    slug = `${slugBase}-${suffix++}`;
  }

  const accommodation = await prisma.accommodation.create({
    data: {
      ownerId: getUserId(req.user),
      slug,
      verificationStatus: "APPROVED",
      moderationStatus: "APPROVED",
      ...updates,
    },
  });

  mapId(accommodation);

  res.status(201).json({
    status: "success",
    data: { accommodation },
  });
});

exports.updateAccommodation = catchAsync(async (req, res) => {
  await ensureOwnsAccommodation(req.params.id, getUserId(req.user));

  const updates = pickFields(req.body, [
    "name",
    "description",
    "contactPhone",
    "province",
    "city",
    "addressLine",
    "timezone",
    "type",
    "isPublished",
  ]);

  const accommodation = await prisma.accommodation.update({
    where: { id: req.params.id },
    data: updates,
  });

  mapId(accommodation);

  res.status(200).json({
    status: "success",
    data: { accommodation },
  });
});

exports.addAccommodationImage = catchAsync(async (req, res) => {
  await ensureOwnsAccommodation(req.params.id, getUserId(req.user));

  if (req.body.isCover === true) {
    await prisma.accommodationImage.updateMany({
      where: { accommodationId: req.params.id },
      data: { isCover: false },
    });
  }

  const accommodationImage = await prisma.accommodationImage.create({
    data: {
      accommodationId: req.params.id,
      url: req.body.url,
      altText: req.body.altText || null,
      isCover: Boolean(req.body.isCover),
      sortOrder: Number.isFinite(Number(req.body.sortOrder))
        ? Number(req.body.sortOrder)
        : 0,
    },
  });

  mapId(accommodationImage);

  res.status(201).json({
    status: "success",
    data: { accommodationImage },
  });
});

exports.deleteAccommodationImage = catchAsync(async (req, res, next) => {
  await ensureOwnsAccommodation(req.params.id, getUserId(req.user));

  const accommodationImage = await prisma.accommodationImage.findFirst({
    where: {
      id: req.params.imageId,
      accommodationId: req.params.id,
    },
  });

  if (!accommodationImage) {
    return next(new AppError("Accommodation image not found", 404));
  }

  await prisma.accommodationImage.delete({ where: { id: accommodationImage.id } });

  res.status(204).json({
    status: "success",
    data: null,
  });
});

exports.upsertCancellationPolicy = catchAsync(async (req, res, next) => {
  await ensureOwnsAccommodation(req.params.id, getUserId(req.user));

  const policyType = String(req.body.policyType || "").trim().toUpperCase();
  if (!POLICY_TYPES.has(policyType)) {
    return next(new AppError("Invalid policyType", 400));
  }

  const data = {
    policyType,
    freeCancellationHours:
      req.body.freeCancellationHours == null || req.body.freeCancellationHours === ""
        ? null
        : Number(req.body.freeCancellationHours),
    refundPercentage:
      req.body.refundPercentage == null || req.body.refundPercentage === ""
        ? null
        : Number(req.body.refundPercentage),
    customDescription: req.body.customDescription || null,
  };

  const cancellationPolicy = await prisma.cancellationPolicy.upsert({
    where: { accommodationId: req.params.id },
    create: {
      accommodationId: req.params.id,
      ...data,
    },
    update: data,
  });

  mapId(cancellationPolicy);

  res.status(200).json({
    status: "success",
    data: { cancellationPolicy },
  });
});

exports.upsertCheckInRules = catchAsync(async (req, res) => {
  await ensureOwnsAccommodation(req.params.id, getUserId(req.user));

  const data = {
    checkInFrom: req.body.checkInFrom || "14:00",
    checkInUntil: req.body.checkInUntil || "22:00",
    checkOutBy: req.body.checkOutBy || "11:00",
    selfCheckIn: Boolean(req.body.selfCheckIn),
    selfCheckInMethod: req.body.selfCheckInMethod || null,
    lateCheckOutFee:
      req.body.lateCheckOutFee == null || req.body.lateCheckOutFee === ""
        ? null
        : Number(req.body.lateCheckOutFee),
    instructions: req.body.instructions || null,
  };

  const checkInOutRules = await prisma.checkInOutRules.upsert({
    where: { accommodationId: req.params.id },
    create: {
      accommodationId: req.params.id,
      ...data,
    },
    update: data,
  });

  mapId(checkInOutRules);

  res.status(200).json({
    status: "success",
    data: { checkInOutRules },
  });
});
