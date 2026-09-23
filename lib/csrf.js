// Synchronizer-token CSRF protection for the admin.
// The token lives in the session; forms send it as `_csrf`, fetch() calls send
// it in the `X-CSRF-Token` header.
//
// Multipart bodies are not parsed yet when `protect` runs, so multipart
// requests are handed to lib/uploads.js `parseMultipart`, which is mounted for
// every authenticated admin route and verifies the token right after parsing,
// before any route handler runs. Multipart from signed-out visitors is refused.
const crypto = require('crypto');

function token(req) {
  if (!req.session.csrfToken) req.session.csrfToken = crypto.randomBytes(32).toString('hex');
  return req.session.csrfToken;
}

function matches(req) {
  const expected = req.session?.csrfToken;
  const supplied = req.get('x-csrf-token') || req.body?._csrf;
  if (!expected || typeof supplied !== 'string' || supplied.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(supplied), Buffer.from(expected));
}

function reject(req, res) {
  const message = 'Your form expired. Please reload the page and try again.';
  if (req.xhr || (req.get('accept') || '').includes('application/json')) {
    return res.status(403).json({ error: message });
  }
  return res.status(403).render('admin/error', { title: 'Form expired', message });
}

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function protect(req, res, next) {
  res.locals.csrfToken = token(req);
  if (SAFE_METHODS.has(req.method)) return next();
  if (req.is('multipart/form-data')) {
    // Verified by parseMultipart after parsing; only signed-in admins may upload.
    return req.session?.adminId ? next() : reject(req, res);
  }
  return matches(req) ? next() : reject(req, res);
}

module.exports = { token, protect, matches, reject };
