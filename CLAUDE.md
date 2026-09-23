# Octavisual — notes for Claude

Cinematic photography/film portfolio for a Kigali studio with an admin CMS.
Express 5 + EJS, server-rendered. Content in MongoDB (Mongoose), media in Cloudinary.
Front-end motion is GSAP + ScrollTrigger + Lenis loaded from jsDelivr (no bundler).

## Structure

```text
app.js                  Express bootstrap: helmet/CSP, sessions (mounted on /admin only), routes, listen
lib/db.js               Mongo connection
lib/media.js            Cloudinary upload/destroy + delivery helpers (sized/transform/responsive srcset)
lib/youtube.js          URL -> video ID parsing, oEmbed title, maxres/hq thumbnail resolution
lib/images.js           Magic-byte type detection, SSRF-safe remote download
lib/content.js          Loads + caches everything the homepage needs; invalidate() after admin writes
lib/auth.js, csrf.js, uploads.js, validate.js, section-fields.js, view-helpers.js (safeUrl)
models/                 Section, Category, WorkItem (film + photography), HeroSlide, Service, TeamMember, Settings, AdminUser
routes/public.js        Home page + contact form (Nodemailer, rate-limited)
routes/admin/           Admin CMS; index.js wires login, requireAdmin, parseMultipart, cache invalidation
views/home.ejs          Renders visible sections in DB order via views/sections/<type>.ejs
views/admin/            Admin templates; partials/top.ejs + bottom.ejs wrap every page
public/css/tokens.css   Design tokens shared by style.css and admin.css
public/js/app-ui.js     Hero book, Selected Work tabs/filters, team profile, lightbox (image + YouTube)
public/js/animations.js Lenis, ScrollTrigger (About chapter, team choreography, entrances, nav tracking, cursor)
public/js/admin.js      Admin interactions (drag/keyboard reorder, uploads, YouTube preview, tags, confirm dialog)
scripts/seed.js         Idempotent import of the original content (+ Cloudinary uploads); --force resets
scripts/reset-admin.js  Reset admin password from ADMIN_PASSWORD
scripts/verify-project.js  Dependency-free integrity check (npm run verify)
```

Legacy one-off files (not used at runtime): `apply-team-redesign.js`, `.team-update-backup/`, `team-update-assets/`.

## Commands

- `npm start` / `npm run dev` — run on PORT (default 3000)
- `npm run seed` — import original content into MongoDB (safe to re-run)
- `npm run admin:reset` — set the admin password from ADMIN_PASSWORD
- `npm run verify` — static integrity check

## Conventions

- CommonJS, 2-space indent, single quotes, semicolons — match existing files.
- Content lives in MongoDB, media in Cloudinary. Never write uploads to local disk (Render disk is ephemeral);
  use memory buffers and stream to Cloudinary (`routes/admin/upload-helper.js`).
- EJS: always `<%= %>` for content. `<%-` only for `include()` and the static SVG icon constants in header.ejs.
  Links from the DB go through `safeUrl()`.
- Every admin write is validated server-side (`lib/validate.js`) and carries a CSRF token
  (`_csrf` field or `X-CSRF-Token` header). Multipart is parsed once in `lib/uploads.js` before routes run.
- CSP forbids inline scripts, inline event handlers and `style=""` attributes in markup — use external JS and CSS classes.
- Adding a section type: add it to `models/Section.js`, `lib/section-fields.js`, `views/sections/<type>.ejs`
  and the icon maps in `views/partials/header.ejs`.
- Public JS must work on dynamically rendered items: use event delegation. Selected Work cards are moved in/out of
  `#galleryGrid`; app-ui.js dispatches `octavisual:work-rendered` so animations.js can re-batch and refresh.
- Respect `prefers-reduced-motion` in both CSS and JS. Call `ScrollTrigger.refresh()` after layout-changing DOM updates.
- The About chapter length is `.about-panel` height (style.css) minus the sticky stage; keep it in sync with its timeline.
- CSS: extend `style.css` at the end of the relevant section; use the tokens, not new hex values.
- Commit per logical change with a descriptive message.
