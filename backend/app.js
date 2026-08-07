const express = require("express");
const morgan = require("morgan");
const colors = require("colors");
const cors = require("cors");
require("dotenv").config();
const path = require('path');
// Custom Imports
const AppError = require("./utils/appError");
const globalErrorHandler = require("./controllers/errorController");
const userRouter = require("./routes/userRoutes");
const savedSearchRouter = require("./routes/savedSearchRoutes");
const paymentRouter = require("./routes/paymentRoutes");
const uploadRouter = require("./routes/uploadRoutes");
const webhookRouter = require("./routes/webhookRoutes");
const roomRouter = require("./routes/roomRoutes");
const accommodationRouter = require("./routes/accommodationRoutes");
const providerRouter = require("./routes/providerRoutes");
const pricingRouter = require("./routes/pricingRoutes");
const stayRouter = require("./routes/stayRoutes");
const notificationRouter = require("./routes/notificationRoutes");
const disputeRouter = require("./routes/disputeRoutes");
const reportRouter = require("./routes/reportRoutes");
const engagementRouter = require("./routes/engagementRoutes");
const leadRouter = require("./routes/leadRoutes");
const legalDocController = require("./controllers/legalDocController");
const { globalLimiter } = require("./middleware/rateLimiter");

const listingRoutes = require("./routes/listingRoutes");
const listingDraftRoutes = require("./routes/listingDraftRoutes");
const adminRouter = require("./routes/adminRoutes");
const bookingRouter = require("./routes/bookingRoutes");

const normalizeOrigin = (value = "") => value.trim().replace(/\/+$/, "");
const defaultAllowedOrigins = [
  "https://townruins.com",
  "https://www.townruins.com",
  "https://app.townruins.com",
];
const configuredOrigins = [
  ...defaultAllowedOrigins,
  process.env.FRONTEND_URL,
  process.env.CORS_ALLOWED_ORIGINS,
]
  .filter(Boolean)
  .flatMap((value) => value.split(","))
  .map(normalizeOrigin)
  .filter(Boolean);
const configuredOriginSet = new Set(configuredOrigins);

const allowedOriginPatterns = [
  /^https?:\/\/localhost(?::\d+)?$/i,
  /^https?:\/\/127\.0\.0\.1(?::\d+)?$/i,
  /^https:\/\/[a-z0-9-]+\.[a-z0-9-]+\.amplifyapp\.com$/i,
  /^https:\/\/([a-z0-9-]+\.)*townruins\.com$/i,
];

const corsOrigin = (origin, callback) => {
  if (!origin) {
    callback(null, true);
    return;
  }

  const normalizedOrigin = normalizeOrigin(origin);
  const isConfiguredOrigin = configuredOriginSet.has(normalizedOrigin);
  const matchesKnownPattern = allowedOriginPatterns.some((pattern) =>
    pattern.test(normalizedOrigin)
  );

  if (isConfiguredOrigin || matchesKnownPattern) {
    callback(null, true);
    return;
  }

  callback(new Error(`CORS blocked for origin: ${normalizedOrigin}`));
};

const corsOptions = {
  origin: corsOrigin,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "Accept",
    "Origin",
    "X-Requested-With",
    "X-Seed-Api-Key",
    "Access-Control-Allow-Origin",
  ],
  credentials: true,
  optionsSuccessStatus: 204,
};

const app = express();
app.set("trust proxy", 1);
app.use(cors(corsOptions));
app.options("*", cors(corsOptions));
app.use(globalLimiter);

if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}
app.use("/webhooks", webhookRouter);
const jsonBodyLimit = process.env.JSON_BODY_LIMIT || "50mb";
app.use(express.json({ limit: jsonBodyLimit }));

// Serve uploaded files from disk for development fallback
const uploadsDir = process.env.UPLOADS_DIR || '/srv/uploads';
app.use('/uploads', express.static(uploadsDir, { index: false, dotfiles: 'ignore' }));

app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  next();
});

// ROUTES
app.get("/api/v1", (req, res) => {
  res.status(200).json({
    status: "ok",
    message: "Town Ruins API v1 is running.",
  });
});
app.use("/api/v1/users", userRouter);
app.use("/api/v1/saved-searches", savedSearchRouter);
app.use("/api/v1/payments", paymentRouter);
app.use("/api/v1/uploads", uploadRouter);
app.use("/api/v1/rooms", roomRouter);
app.use("/api/v1/accommodations", accommodationRouter);
app.use("/api/v1/providers", providerRouter);
app.use("/api/v1/pricing", pricingRouter);
app.use("/api/v1/notifications", notificationRouter);
app.use("/api/v1/disputes", disputeRouter);
app.use("/api/v1/reports", reportRouter);
// Listings routes
// Primary (matches client + SRS)
app.use("/api/v1/listings", listingRoutes);
// Backwards-compatible alias (older code may still call /api/listings)
app.use("/api/listings", listingRoutes);
app.use("/api/v1/listing-drafts", listingDraftRoutes);
app.use("/api/v1/admin", adminRouter);
app.use("/api/v1/bookings", bookingRouter);
app.use("/api/v1/engagements", engagementRouter);
app.use("/api/v1/leads", leadRouter);
app.use("/api/v1/stays", stayRouter);
app.get("/api/v1/legal-docs/:slug", legalDocController.getPublicDoc);
app.get("/legal-docs/:slug", legalDocController.getPublicDoc);

// PRODUCTION SETUP
app.get("/", (req, res) => {
  res.status(200).json({ status: "ok", message: "Town Ruins API is running." });
});

app.all("*", (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

app.use(globalErrorHandler);

module.exports = app;
