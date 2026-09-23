// Multipart handling for the admin. Mounted once for all authenticated admin
// routes: parses the body into memory (never to disk), verifies the CSRF token,
// and checks that any uploaded file really is an allowed image type.
// Routes read `req.file` (or `req.uploadError` when the file was rejected).
const multer = require('multer');
const csrf = require('./csrf');
const { MAX_BYTES, detectImageType } = require('./images');

const EXTENSIONS = /\.(jpe?g|png|webp|avif)$/i;
const IMAGE_FIELDS = new Set(['image', 'thumbnail']);

const parser = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_BYTES, files: 1, fields: 60, fieldSize: 20 * 1024 },
  fileFilter(req, file, callback) {
    if (!IMAGE_FIELDS.has(file.fieldname)) {
      return callback(new Error('Unexpected file field.'));
    }
    // First pass on the declared name/type; the bytes are checked below.
    if (!EXTENSIONS.test(file.originalname) && !/^image\/(jpeg|png|webp|avif)$/.test(file.mimetype)) {
      return callback(new Error('Only JPG, PNG, WebP or AVIF images are allowed.'));
    }
    return callback(null, true);
  }
}).any();

function parseMultipart(req, res, next) {
  if (!req.is('multipart/form-data')) return next();

  return parser(req, res, error => {
    req.body = req.body || {};
    // The token is checked even when the upload itself failed.
    if (!csrf.matches(req)) return csrf.reject(req, res);

    if (error) {
      req.uploadError = error.code === 'LIMIT_FILE_SIZE'
        ? `Images must be ${MAX_BYTES / 1024 / 1024}MB or smaller.`
        : (error.code === 'LIMIT_FILE_COUNT' ? 'Upload one image at a time.' : error.message);
      req.files = [];
    }

    const file = (req.files || [])[0];
    if (file && file.size > 0) {
      const type = detectImageType(file.buffer);
      if (type) {
        file.detectedType = type;
        req.file = file;
      } else {
        req.uploadError = 'That file is not a valid JPG, PNG, WebP or AVIF image.';
      }
    }
    return next();
  });
}

module.exports = { parseMultipart, MAX_BYTES };
