require('dotenv').config();

const express = require('express');
const path = require('path');
const helmet = require('helmet');
const session = require('express-session');
const { MongoStore } = require('connect-mongo');
const { connectDB } = require('./lib/db');
const { safeUrl } = require('./lib/view-helpers');
const { ensureAdminUser } = require('./lib/auth');
const publicRoutes = require('./routes/public');

const app = express();
const PORT = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';

if (isProduction && !process.env.SESSION_SECRET) {
  console.error('SESSION_SECRET must be set in production.');
  process.exit(1);
}

// Connect first: the session store and the listener both wait on this.
const dbReady = connectDB();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
// Render (and most PaaS) terminate TLS at a proxy; needed for secure cookies
// and for the login rate limiter to see the real client IP.
app.set('trust proxy', 1);
app.disable('x-powered-by');
app.locals.safeUrl = safeUrl;

// ---------- Security headers ----------
const publicCsp = {
  defaultSrc: ["'self'"],
  scriptSrc: ["'self'", 'https://cdn.jsdelivr.net'],
  styleSrc: ["'self'", 'https://fonts.googleapis.com'],
  fontSrc: ["'self'", 'https://fonts.gstatic.com'],
  imgSrc: ["'self'", 'data:', 'https://res.cloudinary.com', 'https://i.ytimg.com'],
  frameSrc: ['https://www.youtube-nocookie.com'],
  connectSrc: ["'self'"],
  objectSrc: ["'none'"],
  baseUri: ["'self'"],
  formAction: ["'self'"],
  frameAncestors: ["'none'"],
  upgradeInsecureRequests: isProduction ? [] : null
};

app.use(helmet({
  contentSecurityPolicy: { directives: publicCsp },
  crossOriginEmbedderPolicy: false
}));

app.use(express.static(path.join(__dirname, 'public'), { maxAge: isProduction ? '7d' : 0 }));
app.use(express.urlencoded({ extended: true, limit: '200kb' }));

app.use('/', publicRoutes);

// ---------- Admin ----------
// Sessions exist only under /admin; public visitors never get a cookie.
app.use('/admin',
  helmet.contentSecurityPolicy({
    // Admin previews show pasted image links (any https host) and local files (blob:).
    directives: { ...publicCsp, imgSrc: ["'self'", 'data:', 'blob:', 'https:'] }
  }),
  (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    res.set('X-Robots-Tag', 'noindex, nofollow');
    next();
  },
  session({
    name: 'ov.sid',
    secret: process.env.SESSION_SECRET || 'dev-only-insecure-secret',
    resave: false,
    saveUninitialized: false,
    rolling: true,
    store: MongoStore.create({
      clientPromise: dbReady.then(connection => connection.getClient()),
      collectionName: 'sessions',
      ttl: 8 * 60 * 60,
      touchAfter: 10 * 60
    }),
    cookie: {
      path: '/admin',
      httpOnly: true,
      sameSite: 'lax',
      secure: isProduction,
      maxAge: 8 * 60 * 60 * 1000
    }
  }),
  require('./routes/admin')
);

app.use((req, res) => {
  res.status(404).type('text').send('Not found');
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).type('text').send('Something went wrong.');
});

dbReady
  .then(ensureAdminUser)
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Octavisual running at http://localhost:${PORT}`);
    });
  })
  .catch(error => {
    console.error('Startup failed:', error.message);
    process.exit(1);
  });
