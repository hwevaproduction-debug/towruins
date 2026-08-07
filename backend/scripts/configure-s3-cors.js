const { PutBucketCorsCommand, S3Client } = require("@aws-sdk/client-s3");
require("dotenv").config();

const normalizeOrigin = (value = "") => value.trim().replace(/\/+$/, "");

const origins = [
  "https://app.townruins.com",
  "https://townruins.com",
  "https://www.townruins.com",
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:4173",
  "http://localhost:5173",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:3001",
  "http://127.0.0.1:4173",
  "http://127.0.0.1:5173",
  process.env.FRONTEND_URL,
  process.env.CORS_ALLOWED_ORIGINS,
]
  .filter(Boolean)
  .flatMap((value) => value.split(","))
  .map(normalizeOrigin)
  .filter(Boolean);

const s3ClientConfig = {
  region: process.env.S3_REGION || process.env.AWS_REGION,
};

if (process.env.S3_ENDPOINT) {
  s3ClientConfig.endpoint = process.env.S3_ENDPOINT;
  // Use path-style addressing for S3-compatible endpoints by default
  s3ClientConfig.forcePathStyle = process.env.S3_FORCE_PATH_STYLE ? process.env.S3_FORCE_PATH_STYLE === 'true' : true;
}

if (process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY) {
  s3ClientConfig.credentials = {
    accessKeyId: process.env.S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
  };
}

const client = new S3Client(s3ClientConfig);

const main = async () => {
  if (!process.env.S3_BUCKET) {
    throw new Error("S3_BUCKET is required");
  }

  if (!s3ClientConfig.region) {
    throw new Error("S3_REGION or AWS_REGION is required");
  }

  const uniqueOrigins = [...new Set(origins)];

  if (!uniqueOrigins.length) {
    throw new Error("At least one allowed origin is required");
  }

  await client.send(
    new PutBucketCorsCommand({
      Bucket: process.env.S3_BUCKET,
      CORSConfiguration: {
        CORSRules: [
          {
            AllowedOrigins: uniqueOrigins,
            AllowedMethods: ["PUT", "GET", "HEAD"],
            AllowedHeaders: ["*"],
            ExposeHeaders: ["ETag", "x-amz-request-id", "x-amz-id-2"],
            MaxAgeSeconds: 3000,
          },
        ],
      },
    })
  );

  console.log(`Updated CORS for s3://${process.env.S3_BUCKET}`);
  console.log(`Allowed origins: ${uniqueOrigins.join(", ")}`);
};

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});
