// Single-admin authentication.
const bcrypt = require('bcryptjs');
const AdminUser = require('../models/AdminUser');

const BCRYPT_ROUNDS = 12;
// Compared against when the email is unknown so response time does not reveal
// whether an account exists.
const DUMMY_HASH = bcrypt.hashSync('octavisual-timing-equaliser', BCRYPT_ROUNDS);

// Creates the admin from ADMIN_EMAIL / ADMIN_PASSWORD the first time the app
// starts. Existing accounts are never overwritten (use scripts/reset-admin.js).
async function ensureAdminUser() {
  const email = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const password = String(process.env.ADMIN_PASSWORD || '');

  if (!email || !password) {
    if (!(await AdminUser.exists({}))) {
      console.warn('No admin account exists. Set ADMIN_EMAIL and ADMIN_PASSWORD and restart to create one.');
    }
    return;
  }
  if (password.length < 12) {
    console.warn('WARNING: ADMIN_PASSWORD is shorter than 12 characters. Use a long, unique password.');
  }
  if (await AdminUser.exists({ email })) return;

  await AdminUser.create({ email, passwordHash: await bcrypt.hash(password, BCRYPT_ROUNDS) });
  console.log(`Created admin account for ${email}.`);
}

async function verifyCredentials(email, password) {
  const user = await AdminUser.findOne({ email: String(email || '').trim().toLowerCase() });
  const ok = await bcrypt.compare(String(password || ''), user ? user.passwordHash : DUMMY_HASH);
  return ok && user ? user : null;
}

async function hashPassword(password) {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

function wantsJson(req) {
  return req.xhr || (req.get('accept') || '').includes('application/json') || req.is('application/json');
}

async function requireAdmin(req, res, next) {
  try {
    const user = req.session?.adminId ? await AdminUser.findById(req.session.adminId).lean() : null;
    if (!user) {
      if (wantsJson(req)) return res.status(401).json({ error: 'Your session has expired. Please sign in again.' });
      if (req.method === 'GET') req.session.returnTo = req.originalUrl;
      return res.redirect('/admin/login');
    }
    req.admin = user;
    res.locals.admin = { email: user.email };
    return next();
  } catch (error) {
    return next(error);
  }
}

module.exports = { ensureAdminUser, verifyCredentials, hashPassword, requireAdmin, wantsJson };
