const express = require('express');
const rateLimit = require('express-rate-limit');
const csrf = require('../../lib/csrf');
const { verifyCredentials, requireAdmin } = require('../../lib/auth');
const { parseMultipart } = require('../../lib/uploads');
const content = require('../../lib/content');
const media = require('../../lib/media');
const { wrap } = require('./helpers');

const Section = require('../../models/Section');
const HeroSlide = require('../../models/HeroSlide');
const Service = require('../../models/Service');
const TeamMember = require('../../models/TeamMember');
const Category = require('../../models/Category');
const WorkItem = require('../../models/WorkItem');

const router = express.Router();

router.use(express.json({ limit: '200kb' }));
router.use(csrf.protect);

// Flash message (set by the previous request) for the admin layout.
router.use((req, res, next) => {
  res.locals.flash = req.session.flash || null;
  delete req.session.flash;
  res.locals.currentPath = req.path;
  res.locals.cloudinaryReady = media.isConfigured();
  next();
});

// ---------- Login / logout ----------
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 8,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  handler: (req, res) => res.status(429).render('admin/login', {
    title: 'Sign in',
    email: String(req.body?.email || ''),
    error: 'Too many sign-in attempts. Please wait 15 minutes and try again.'
  })
});

router.get('/login', (req, res) => {
  if (req.session.adminId) return res.redirect('/admin');
  return res.render('admin/login', { title: 'Sign in', email: '', error: null });
});

router.post('/login', loginLimiter, wrap(async (req, res, next) => {
  const email = String(req.body.email || '').slice(0, 200);
  const user = await verifyCredentials(email, String(req.body.password || '').slice(0, 500));
  if (!user) {
    return res.status(401).render('admin/login', { title: 'Sign in', email, error: 'Email or password is incorrect.' });
  }

  const returnTo = req.session.returnTo;
  // New session id on login prevents session fixation.
  return req.session.regenerate(error => {
    if (error) return next(error);
    req.session.adminId = String(user._id);
    user.lastLoginAt = new Date();
    user.save().catch(() => {});
    const safeReturn = typeof returnTo === 'string' && /^\/admin(\/[\w\-/?=&.%]*)?$/.test(returnTo) ? returnTo : '/admin';
    return req.session.save(saveError => (saveError ? next(saveError) : res.redirect(safeReturn)));
  });
}));

router.post('/logout', (req, res, next) => {
  req.session.destroy(error => {
    if (error) return next(error);
    res.clearCookie('ov.sid', { path: '/admin' });
    return res.redirect('/admin/login');
  });
});

// ---------- Everything below requires a signed-in admin ----------
router.use(requireAdmin);
router.use(parseMultipart);

// Any successful write clears the public page cache.
router.use((req, res, next) => {
  if (req.method !== 'GET') res.on('finish', () => { if (res.statusCode < 400) content.invalidate(); });
  next();
});

router.get('/', wrap(async (req, res) => {
  const [sections, hiddenSections, slides, services, team, filmPublished, filmDrafts, photoPublished, photoDrafts, categories] = await Promise.all([
    Section.countDocuments({ visible: true }),
    Section.countDocuments({ visible: false }),
    HeroSlide.countDocuments({ visible: true }),
    Service.countDocuments({ visible: true }),
    TeamMember.countDocuments({ visible: true }),
    WorkItem.countDocuments({ mediaType: 'film', published: true }),
    WorkItem.countDocuments({ mediaType: 'film', published: false }),
    WorkItem.countDocuments({ mediaType: 'photography', published: true }),
    WorkItem.countDocuments({ mediaType: 'photography', published: false }),
    Category.countDocuments()
  ]);
  const recent = await WorkItem.find().sort({ updatedAt: -1 }).limit(6).lean();
  res.render('admin/dashboard', {
    title: 'Dashboard',
    counts: { sections, hiddenSections, slides, services, team, filmPublished, filmDrafts, photoPublished, photoDrafts, categories },
    recent
  });
}));

router.use('/sections', require('./sections'));
router.use('/hero', require('./hero'));
router.use('/about', require('./about'));
router.use('/services', require('./services'));
router.use('/film', require('./film'));
router.use('/photography', require('./photography'));
router.use('/categories', require('./categories'));
router.use('/team', require('./team'));
router.use('/', require('./settings'));

router.use((req, res) => {
  res.status(404).render('admin/error', { title: 'Not found', message: 'That admin page does not exist.' });
});

// eslint-disable-next-line no-unused-vars
router.use((err, req, res, next) => {
  console.error(err);
  const message = err.name === 'ValidationError'
    ? Object.values(err.errors).map(e => e.message).join(' ')
    : 'Something went wrong. Please try again.';
  if (req.get('accept')?.includes('application/json') || req.is('application/json')) {
    return res.status(err.name === 'ValidationError' ? 400 : 500).json({ error: message });
  }
  return res.status(err.name === 'ValidationError' ? 400 : 500).render('admin/error', { title: 'Error', message });
});

module.exports = router;
