const test = require('node:test');
const assert = require('node:assert/strict');

process.env.S3_ACCESS_KEY_ID = 'test-access-key';
process.env.S3_SECRET_ACCESS_KEY = 'test-secret-key';
process.env.S3_BUCKET = 'test-upload-bucket';
process.env.S3_PUBLIC_BASE_URL = 'https://test-upload-bucket.s3.us-east-1.amazonaws.com';
process.env.S3_REGION = 'us-east-1';
process.env.S3_ENDPOINT = 'http://minio:9000';
process.env.S3_FORCE_PATH_STYLE = 'true';
process.env.FRONTEND_URL = 'https://app.townruins.com';
delete process.env.S3_BROWSER_ENDPOINT;
delete process.env.S3_BROWSER_FORCE_PATH_STYLE;

const uploadController = require('../controllers/uploadController');

const invokeController = (handler, req) =>
  new Promise((resolve, reject) => {
    const res = {
      statusCode: 200,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(body) {
        resolve({ statusCode: this.statusCode, body });
      },
    };

    handler(req, res, reject);
  });

test('signed upload URLs do not bind browser uploads to an empty-body checksum', async () => {
  const result = await invokeController(uploadController.getSignedUploadUrl, {
    query: { contentType: 'image/png', folder: 'avatars' },
    user: { _id: 'user_1', role: 'tenant' },
  });

  assert.equal(result.statusCode, 200);
  assert.equal(result.body.status, 'success');

  const uploadUrl = new URL(result.body.data.uploadUrl);
  assert.equal(uploadUrl.searchParams.has('x-amz-checksum-crc32'), false);
  assert.equal(uploadUrl.searchParams.has('x-amz-sdk-checksum-algorithm'), false);
  assert.equal(uploadUrl.searchParams.get('X-Amz-Expires'), '60');
  assert.match(result.body.data.key, /^avatars\/user_1\/\d+-[a-f0-9]{20}\.png$/);
});

test('signed upload public URLs use https when the request is secure', async () => {
  process.env.S3_PUBLIC_BASE_URL = 'http://test-upload-bucket.s3.us-east-1.amazonaws.com';

  const result = await invokeController(uploadController.getSignedUploadUrl, {
    query: { contentType: 'image/png', folder: 'avatars' },
    user: { _id: 'user_1', role: 'tenant' },
    protocol: 'https',
    headers: { 'x-forwarded-proto': 'https' },
    get(name) {
      return this.headers[name.toLowerCase()];
    },
  });

  assert.equal(result.statusCode, 200);
  assert.equal(result.body.status, 'success');
  assert.match(result.body.data.publicUrl, /^https:\/\//);
});

test('signed upload URLs use the browser-facing https endpoint for internal S3 services', async () => {
  process.env.S3_PUBLIC_BASE_URL = 'https://app.townruins.com/test-upload-bucket';

  const result = await invokeController(uploadController.getSignedUploadUrl, {
    query: { contentType: 'image/png', folder: 'avatars' },
    user: { _id: 'user_1', role: 'tenant' },
    protocol: 'https',
    headers: { 'x-forwarded-proto': 'https' },
    get(name) {
      return this.headers[name.toLowerCase()];
    },
  });

  assert.equal(result.statusCode, 200);
  assert.equal(result.body.status, 'success');

  const uploadUrl = new URL(result.body.data.uploadUrl);
  assert.equal(uploadUrl.protocol, 'https:');
  assert.equal(uploadUrl.host, 'app.townruins.com');
  assert.match(uploadUrl.pathname, /^\/test-upload-bucket\/avatars\/user_1\//);
});

test('signed upload URLs do not expose localhost MinIO to production browsers', async () => {
  process.env.S3_BUCKET = 'creapy-uploads';
  process.env.S3_PUBLIC_BASE_URL = 'http://localhost:9000/creapy-uploads';
  delete process.env.S3_BROWSER_ENDPOINT;

  const result = await invokeController(uploadController.getSignedUploadUrl, {
    query: { contentType: 'image/png', folder: 'avatars' },
    user: { _id: 'user_1', role: 'tenant' },
    protocol: 'https',
    headers: {
      host: 'api.townruins.com',
      'x-forwarded-host': 'api.townruins.com',
      'x-forwarded-proto': 'https',
    },
    get(name) {
      return this.headers[name.toLowerCase()];
    },
  });

  assert.equal(result.statusCode, 200);
  assert.equal(result.body.status, 'success');

  const uploadUrl = new URL(result.body.data.uploadUrl);
  assert.equal(uploadUrl.protocol, 'https:');
  assert.equal(uploadUrl.host, 'app.townruins.com');
  assert.match(uploadUrl.pathname, /^\/creapy-uploads\/avatars\/user_1\//);
  assert.match(result.body.data.publicUrl, /^https:\/\/app\.townruins\.com\/creapy-uploads\/avatars\/user_1\//);
});

test('explicit browser endpoints do not expose localhost MinIO to production browsers', async () => {
  process.env.S3_BUCKET = 'creapy-uploads';
  process.env.S3_PUBLIC_BASE_URL = 'http://localhost:9000/creapy-uploads';
  process.env.S3_BROWSER_ENDPOINT = 'http://localhost:9000';

  const result = await invokeController(uploadController.getSignedUploadUrl, {
    query: { contentType: 'image/png', folder: 'avatars' },
    user: { _id: 'user_1', role: 'tenant' },
    protocol: 'https',
    headers: {
      host: 'api.townruins.com',
      'x-forwarded-host': 'api.townruins.com',
      'x-forwarded-proto': 'https',
    },
    get(name) {
      return this.headers[name.toLowerCase()];
    },
  });

  assert.equal(result.statusCode, 200);
  assert.equal(result.body.status, 'success');

  const uploadUrl = new URL(result.body.data.uploadUrl);
  assert.equal(uploadUrl.protocol, 'https:');
  assert.equal(uploadUrl.host, 'app.townruins.com');
  assert.match(uploadUrl.pathname, /^\/creapy-uploads\/avatars\/user_1\//);

  delete process.env.S3_BROWSER_ENDPOINT;
});

test('signed upload URLs derive the app origin from browser requests when env app URL is missing', async () => {
  process.env.S3_BUCKET = 'creapy-uploads';
  process.env.S3_PUBLIC_BASE_URL = 'http://localhost:9000/creapy-uploads';
  process.env.S3_BROWSER_ENDPOINT = 'http://localhost:9000';
  delete process.env.FRONTEND_URL;
  delete process.env.APP_BASE_URL;

  const result = await invokeController(uploadController.getSignedUploadUrl, {
    query: { contentType: 'image/png', folder: 'avatars' },
    user: { _id: 'user_1', role: 'tenant' },
    protocol: 'https',
    headers: {
      host: 'api.townruins.com',
      origin: 'https://app.townruins.com',
      'x-forwarded-host': 'api.townruins.com',
      'x-forwarded-proto': 'https',
    },
    get(name) {
      return this.headers[name.toLowerCase()];
    },
  });

  assert.equal(result.statusCode, 200);
  assert.equal(result.body.status, 'success');

  const uploadUrl = new URL(result.body.data.uploadUrl);
  assert.equal(uploadUrl.protocol, 'https:');
  assert.equal(uploadUrl.host, 'app.townruins.com');
  assert.match(uploadUrl.pathname, /^\/creapy-uploads\/avatars\/user_1\//);
  assert.match(result.body.data.publicUrl, /^https:\/\/app\.townruins\.com\/creapy-uploads\/avatars\/user_1\//);

  process.env.FRONTEND_URL = 'https://app.townruins.com';
  delete process.env.S3_BROWSER_ENDPOINT;
});

test('signed upload URLs fail closed instead of returning local MinIO to production browsers', async () => {
  process.env.S3_BUCKET = 'creapy-uploads';
  process.env.S3_PUBLIC_BASE_URL = 'http://localhost:9000/creapy-uploads';
  process.env.S3_BROWSER_ENDPOINT = 'http://localhost:9000';
  delete process.env.FRONTEND_URL;
  delete process.env.APP_BASE_URL;
  delete process.env.CORS_ALLOWED_ORIGINS;

  await assert.rejects(
    invokeController(uploadController.getSignedUploadUrl, {
      query: { contentType: 'image/png', folder: 'avatars' },
      user: { _id: 'user_1', role: 'tenant' },
      protocol: 'https',
      headers: {
        host: 'api.townruins.com',
        'x-forwarded-host': 'api.townruins.com',
        'x-forwarded-proto': 'https',
      },
      get(name) {
        return this.headers[name.toLowerCase()];
      },
    }),
    /local host for production browser uploads/
  );

  process.env.FRONTEND_URL = 'https://app.townruins.com';
  delete process.env.S3_BROWSER_ENDPOINT;
});

test('signed upload URLs use the browser-facing http endpoint for local docker', async () => {
  process.env.S3_BUCKET = 'test-upload-bucket';
  process.env.S3_PUBLIC_BASE_URL = 'http://localhost:9000/test-upload-bucket';
  delete process.env.S3_BROWSER_ENDPOINT;

  const result = await invokeController(uploadController.getSignedUploadUrl, {
    query: { contentType: 'image/png', folder: 'avatars' },
    user: { _id: 'user_1', role: 'tenant' },
    protocol: 'http',
    headers: { host: 'localhost:5000' },
    get() {
      return undefined;
    },
  });

  assert.equal(result.statusCode, 200);
  assert.equal(result.body.status, 'success');

  const uploadUrl = new URL(result.body.data.uploadUrl);
  assert.equal(uploadUrl.protocol, 'http:');
  assert.equal(uploadUrl.host, 'localhost:9000');
  assert.match(uploadUrl.pathname, /^\/test-upload-bucket\/avatars\/user_1\//);
});
