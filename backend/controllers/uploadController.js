const crypto = require('crypto');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const AppError = require('../utils/appError');

const s3ClientConfig = {
  region: process.env.S3_REGION || process.env.AWS_REGION,
  requestChecksumCalculation: 'WHEN_REQUIRED',
};

// Allow custom S3 endpoint (MinIO, LocalStack, etc.)
if (process.env.S3_ENDPOINT) {
  s3ClientConfig.endpoint = process.env.S3_ENDPOINT;
  // For S3-compatible servers like MinIO, use path-style addressing by default
  s3ClientConfig.forcePathStyle = process.env.S3_FORCE_PATH_STYLE ? process.env.S3_FORCE_PATH_STYLE === 'true' : true;
}

if (process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY) {
  s3ClientConfig.credentials = {
    accessKeyId: process.env.S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
  };
}

const s3 = new S3Client(s3ClientConfig);
const signingClients = new Map();

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '0.0.0.0', '::1']);

const normalizeBaseUrl = (value) => {
  if (!value) {
    return null;
  }

  return new URL(String(value).trim().replace(/\/+$/, ''));
};

const getRequestHost = (req) =>
  String(
    req.get?.('x-forwarded-host') ||
      req.headers?.['x-forwarded-host'] ||
      req.get?.('host') ||
      req.headers?.host ||
      ''
  )
    .split(',')[0]
    .trim()
    .toLowerCase();

const getRequestOriginUrl = (req) => {
  const origin = req.get?.('origin') || req.headers?.origin;
  if (origin) {
    return normalizeBaseUrl(origin);
  }

  const referer = req.get?.('referer') || req.headers?.referer;
  if (referer) {
    const refererUrl = normalizeBaseUrl(referer);
    refererUrl.pathname = '';
    refererUrl.search = '';
    refererUrl.hash = '';
    return refererUrl;
  }

  return null;
};

const isLocalHost = (hostname) => LOCAL_HOSTS.has(String(hostname || '').toLowerCase());

const isSecureRequest = (req) => {
  const forwardedProto = String(req.get?.('x-forwarded-proto') || req.headers?.['x-forwarded-proto'] || req.protocol || '').toLowerCase();
  return forwardedProto === 'https' || req.secure || req.protocol === 'https';
};

const getConfiguredAppBaseUrl = (req) => {
  const configuredUrl = process.env.FRONTEND_URL || process.env.APP_BASE_URL;
  if (configuredUrl) {
    return normalizeBaseUrl(configuredUrl);
  }

  const requestOriginUrl = getRequestOriginUrl(req);
  if (requestOriginUrl && !isLocalHost(requestOriginUrl.hostname)) {
    return requestOriginUrl;
  }

  const corsOrigin = String(process.env.CORS_ALLOWED_ORIGINS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
    .find((value) => {
      try {
        return !isLocalHost(new URL(value).hostname);
      } catch {
        return false;
      }
    });

  return corsOrigin ? normalizeBaseUrl(corsOrigin) : null;
};

const applyUrlOrigin = (targetUrl, sourceUrl) => {
  targetUrl.protocol = sourceUrl.protocol;
  targetUrl.hostname = sourceUrl.hostname;
  targetUrl.port = sourceUrl.port;
};

const getBrowserPublicBaseUrl = (req) => {
  const configuredPublicBaseUrl = normalizeBaseUrl(process.env.S3_PUBLIC_BASE_URL);
  if (!configuredPublicBaseUrl) {
    return null;
  }

  const requestHost = getRequestHost(req);
  const configuredHostIsLocal = isLocalHost(configuredPublicBaseUrl.hostname);
  const requestHostIsLocal = isLocalHost(requestHost.split(':')[0]);

  if (configuredHostIsLocal && requestHost && !requestHostIsLocal) {
    const appBaseUrl = getConfiguredAppBaseUrl(req);
    if (appBaseUrl && !isLocalHost(appBaseUrl.hostname)) {
      applyUrlOrigin(configuredPublicBaseUrl, appBaseUrl);
    } else {
      throw new AppError('S3_PUBLIC_BASE_URL cannot use a local host for production browser uploads', 500);
    }
  }

  if (isSecureRequest(req)) {
    configuredPublicBaseUrl.protocol = 'https:';
  }

  return configuredPublicBaseUrl;
};

const getBrowserSigningEndpoint = (req) => {
  const explicitEndpoint = process.env.S3_BROWSER_ENDPOINT;
  if (explicitEndpoint) {
    const endpointUrl = normalizeBaseUrl(explicitEndpoint);
    const requestHost = getRequestHost(req);
    const requestHostIsLocal = isLocalHost(requestHost.split(':')[0]);

    if (isLocalHost(endpointUrl.hostname) && requestHost && !requestHostIsLocal) {
      const appBaseUrl = getConfiguredAppBaseUrl(req);
      if (appBaseUrl && !isLocalHost(appBaseUrl.hostname)) {
        applyUrlOrigin(endpointUrl, appBaseUrl);
      } else {
        throw new AppError('S3_BROWSER_ENDPOINT cannot use a local host for production browser uploads', 500);
      }
    }

    if (isSecureRequest(req)) {
      endpointUrl.protocol = 'https:';
    }

    endpointUrl.pathname = '';
    endpointUrl.search = '';
    endpointUrl.hash = '';
    return endpointUrl.toString().replace(/\/$/, '');
  }

  if (!process.env.S3_ENDPOINT || !process.env.S3_PUBLIC_BASE_URL) {
    return null;
  }

  const publicBaseUrl = getBrowserPublicBaseUrl(req);
  if (!publicBaseUrl) {
    return null;
  }

  publicBaseUrl.pathname = '';
  publicBaseUrl.search = '';
  publicBaseUrl.hash = '';
  return publicBaseUrl.toString().replace(/\/$/, '');
};

const getSigningClient = (req) => {
  const endpoint = getBrowserSigningEndpoint(req);
  if (!endpoint) {
    return s3;
  }

  const cacheKey = `${endpoint}|${process.env.S3_BROWSER_FORCE_PATH_STYLE || process.env.S3_FORCE_PATH_STYLE || 'default'}`;
  if (!signingClients.has(cacheKey)) {
    signingClients.set(
      cacheKey,
      new S3Client({
        ...s3ClientConfig,
        endpoint,
        forcePathStyle: process.env.S3_BROWSER_FORCE_PATH_STYLE
          ? process.env.S3_BROWSER_FORCE_PATH_STYLE === 'true'
          : true,
      })
    );
  }

  return signingClients.get(cacheKey);
};

const buildPublicUrl = (key, req) => {
  const publicBaseUrl = getBrowserPublicBaseUrl(req);
  if (!publicBaseUrl) {
    throw new AppError('S3_PUBLIC_BASE_URL is not configured', 500);
  }

  return new URL(`${publicBaseUrl.toString().replace(/\/$/, '')}/${key}`).toString();
};

exports.getSignedUploadUrl = async (req, res, next) => {
  try {
    const { contentType, folder = 'uploads' } = req.query;
    const normalizedFolder = String(folder || "uploads").toLowerCase();

    if (!contentType) {
      return res.status(400).json({ status: 'fail', message: 'contentType is required' });
    }

    if (normalizedFolder === "listings") {
      if (!req.user || req.user.role !== "landlord") {
        return res.status(403).json({
          status: "fail",
          message: "Landlord role required to publish listings",
        });
      }
    }

    const ext = (contentType.split('/')[1] || 'bin').replace(/[^a-z0-9]/gi, '');
    const random = crypto.randomBytes(10).toString('hex');
    const userId = req.user?._id?.toString() || 'anon';

    const key = `${normalizedFolder}/${userId}/${Date.now()}-${random}.${ext}`;

    const command = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: key,
      ContentType: contentType,
    });

    if (!process.env.S3_PUBLIC_BASE_URL) {
      return next(new AppError('S3_PUBLIC_BASE_URL is not configured', 500));
    }

    const uploadUrl = await getSignedUrl(getSigningClient(req), command, { expiresIn: 60 }); // 60 seconds
    const publicUrl = buildPublicUrl(key, req);

    return res.status(200).json({
      status: 'success',
      data: { uploadUrl, key, publicUrl },
    });
  } catch (err) {
    return next(err);
  }
};
