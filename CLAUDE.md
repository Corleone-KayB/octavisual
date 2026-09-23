# Octavisual — notes for Claude

Cinematic photography/film portfolio for a Kigali studio. Express 5 + EJS, server-rendered.
Front-end motion is GSAP + ScrollTrigger + Lenis loaded from jsDelivr (no bundler).

## Structure

```text
app.js                  Express bootstrap: security middleware, session, routes, listen
lib/                    Server helpers (db, cloudinary, youtube, image validation, content loading, auth)
models/                 Mongoose models (Section, Category, WorkItem, HeroSlide, Service, TeamMember, Settings, AdminUser)
routes/public.js        Home page + contact form (Nodemailer)
routes/admin/           Admin CMS routes (all behind requireAdmin + CSRF)
views/home.ejs          Public page shell; renders DB sections in order via views/sections/*.ejs
views/sections/         One partial per Section type (hero, about, work, team, contact, text)
views/partials/         Sidebar/mobile dock (header.ejs) and footer
views/admin/            Admin CMS templates (layout partials in views/admin/partials)
public/css/style.css    Entire public design system (tokens on :root)
public/css/admin.css    Admin styles, reusing style.css tokens
public/js/app-ui.js     Hero book, Selected Work tabs/filters, team profile, lightbox
public/js/animations.js Lenis, ScrollTrigger (About chapter, team choreography, entrances, nav tracking, cursor)
public/js/admin.js      Admin interactions (drag reorder, uploads, YouTube preview, confirmations)
scripts/seed.js         Idempotent import of the original hardcoded content (+ Cloudinary uploads)
scripts/verify-project.js  Dependency-free integrity check (npm run verify)
```

Legacy one-off files (not used at runtime, kept for history): `apply-team-redesign.js`,
`.team-update-backup/`, `team-update-assets/`.

## Commands

- `npm start` / `npm run dev` — run on PORT (default 3000)
- `npm run seed` — import original content into MongoDB (safe to re-run)
- `npm run verify` — static integrity check

## Conventions

- CommonJS, 2-space indent, single quotes, semicolons — match existing files.
- Content lives in MongoDB, media in Cloudinary. Never write uploads to local disk (Render disk is ephemeral);
  use memory buffers and stream to Cloudinary.
- EJS: always `<%= %>` for content. `<%-` only for `include()` and trusted, server-sanitized markup.
- Every admin write is validated server-side; every admin POST carries a CSRF token.
- Public JS must work on dynamically rendered items: bind with event delegation, not per-element listeners.
- Respect `prefers-reduced-motion` in both CSS and JS.
- After layout-changing DOM updates, call `ScrollTrigger.refresh()`.
- CSS: extend `style.css` at the end of the relevant section; use the `:root` tokens, not new hex values.
- Commit per logical phase with a descriptive message.
