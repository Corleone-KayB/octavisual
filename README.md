# Octavisual

Cinematic photography and film portfolio for Octavisual (Kigali), with a built-in admin CMS.

- **Public site:** Express 5 + EJS, GSAP / ScrollTrigger + Lenis motion.
- **Content:** MongoDB (Mongoose). Every section, text, link, team member and work item is editable in `/admin`.
- **Media:** Cloudinary. Images are delivered with `f_auto,q_auto` and responsive `srcset`.

> **Why MongoDB + Cloudinary?** Render's filesystem is ephemeral: anything written to disk disappears on the next deploy or restart. So content lives in MongoDB, images live in Cloudinary, and the server never writes uploads to disk.

## Contents

1. [Local setup](#local-setup)
2. [Seeding the original content](#seeding-the-original-content)
3. [Using the admin](#using-the-admin)
4. [Deploying to Render](#deploying-to-render)
5. [Environment variables](#environment-variables)
6. [Project structure](#project-structure)
7. [Security notes](#security-notes)

## Local setup

Requirements: Node.js 18+ (tested on 24), a MongoDB database (MongoDB Atlas free tier is fine), and a Cloudinary account (free tier is fine).

```powershell
cd path\to\octavisual
npm install
Copy-Item .env.example .env   # then fill in the values
npm run seed                  # import the original site content
npm start
```

- Site: http://localhost:3000
- Admin: http://localhost:3000/admin

`npm run verify` runs a quick dependency-free integrity check of the project files.

## Seeding the original content

`npm run seed` (`scripts/seed.js`) imports everything that used to be hardcoded in `app.js` and the templates. That covers the hero slides, About copy and image, services, the 12 portfolio items (6 films, 6 photos) with their categories, the 5 team members, contact details, social links and footer. The portfolio images, team portraits, hero slides and About image are uploaded to Cloudinary. The public site looks the same after migration.

It is **safe to run more than once**:

- **No duplicates.** Records are matched on stable keys and only created when missing.
- **Admin edits survive.** Existing records are never overwritten by a normal run.
- **Late Cloudinary setup is fine.** If Cloudinary isn't configured, images keep their local `/images/...` paths and the site still works. Once it's configured, running the seed again moves those images to Cloudinary.
- **Reset option.** `npm run seed -- --force` resets the seeded records to the original copy. Anything you added yourself is left alone.

## Using the admin

Go to `/admin` and sign in. The admin account is created automatically the first time the app starts, from `ADMIN_EMAIL` and `ADMIN_PASSWORD`. Only a bcrypt hash of the password is stored.

To change the password later, update `ADMIN_PASSWORD` and run `npm run admin:reset`. This also signs out all existing sessions.

| Page | What you can do |
| --- | --- |
| **Dashboard** | See counts of published/draft work, jump to common tasks. |
| **Sections** | Reorder the homepage sections (drag the handle, or focus it and use arrow keys), hide/show, edit titles and copy, delete, or add a *Text block* section. Built-in sections (Hero, About, Selected work, Team, Contact) can each appear once. |
| **Hero slides** | Upload, replace, reorder, hide and delete the book-style hero pages (alt text required); edit the hero headline and copy. |
| **About** | Replace the background photo and edit the statement lines. |
| **Services** | The disciplines shown above the hero headline (“Film · Photography · Direction”). |
| **Team** | Add/edit members (portrait, role, bio, CV and social links), reorder, hide. Also edits the team stage copy. |
| **Contact & socials** | Public email, location, phone numbers, Instagram / YouTube / LinkedIn (empty links are hidden). |
| **Footer** | Copyright name, tagline, “back to top” label. |
| **Film** | See below. |
| **Photography** | See below. |
| **Categories** | Create, rename, reorder and delete the categories used as filters under each tab. Deleting a category removes it from its items. |

Every list supports add, edit, delete (with a confirmation dialog), drag-to-reorder and a visible/published toggle. Use **View site ↗** in the sidebar to check your changes; they appear immediately.

### Film

- **Add film:** paste any YouTube link. Watch, `youtu.be`, `/shorts/` and `/embed/` links all work, with or without extra parameters.
- **Validation:** the server extracts and checks the video ID, and rejects links that aren't YouTube, missing or private videos, and duplicates.
- **Auto-fill:** the title is fetched from YouTube and pre-filled (you can edit it). A live preview appears as soon as you paste.
- **Thumbnail:** YouTube's `maxresdefault.jpg` is used when it exists, otherwise `hqdefault.jpg`. You can upload a custom thumbnail instead.
- **Categories and tags:** pick one or more categories, or type a new one and press **Create**. Tags autocomplete from the tags you have used before.
- **Bulk add:** paste up to 25 links, one per line. Each becomes a draft with its YouTube title and thumbnail, ready to review and publish.
- **Featured** films span the full width of the grid. A film without a link shows as “Soon”.

On the site, clicking a film opens a responsive `youtube-nocookie.com` player that autoplays. It is removed when closed, which stops playback. No player loads until a film is opened.

### Photography

**Add photos** offers two ways to add images, and both can be used in one batch:

- **From your computer:** drag and drop (or browse) several JPG, PNG, WebP or AVIF files, up to `MAX_UPLOAD_MB` each. Each file shows a preview and its own progress bar. The server checks each file's real type from its contents, not its extension.
- **From links:** paste image URLs, one per line. The server downloads each one, checks that it really is an image, and re-hosts it on Cloudinary, so the site never depends on the original link.

Each photo needs a **title and alt text**. Categories, tags and “publish immediately” apply to the whole batch. Edit a photo later to change its details, replace the image, or mark it **featured**.

## Deploying to Render

1. Push the repository to GitHub.
2. In Render: **New → Web Service**, then connect the repo.
   - Runtime: Node
   - Build command: `npm install`
   - Start command: `npm start`
3. Under **Environment**, add every variable from the table below. Set `NODE_ENV=production` and a long random `SESSION_SECRET`.
4. In MongoDB Atlas, go to **Network Access** and allow Render's outbound IPs. `0.0.0.0/0` also works, protected by the database password.
5. Deploy. Then, once, open the Render **Shell** and run `npm run seed`. You can also run it locally against the same `MONGODB_URI`.
6. Visit `https://<your-app>.onrender.com/admin` and sign in.

Notes:

- The app sets `trust proxy`, so secure cookies and the login rate limiter work behind Render's proxy.
- Admin sessions are stored in MongoDB (the `sessions` collection), so logins survive restarts and deploys.
- Nothing is written to local disk at runtime. That's why deploys and restarts never lose content or uploads.

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `NODE_ENV` | yes (prod) | `production` enables secure cookies and static caching. |
| `PORT` | no | Port to listen on (Render sets it). |
| `SITE_URL` | no | Public URL of the site. |
| `MONGODB_URI` | **yes** | MongoDB connection string. The app will not start without it. |
| `CLOUDINARY_CLOUD_NAME` | **yes** | Cloudinary cloud name. |
| `CLOUDINARY_API_KEY` | **yes** | Cloudinary API key. |
| `CLOUDINARY_API_SECRET` | **yes** | Cloudinary API secret. |
| `CLOUDINARY_FOLDER` | no | Root folder for uploads (default `octavisual`). |
| `ADMIN_EMAIL` | first run | Email for the admin account created on first start. |
| `ADMIN_PASSWORD` | first run | Its password (12+ characters recommended). |
| `SESSION_SECRET` | **yes** (prod) | Long random string used to sign session cookies. |
| `MAX_UPLOAD_MB` | no | Max size per uploaded/imported image (default 15). |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` | for contact form | SMTP server used to send contact-form messages (Gmail: use an App Password). |
| `CONTACT_TO_EMAIL` | for contact form | Inbox that receives contact-form messages. |

## Project structure

```text
app.js                   Express bootstrap: helmet/CSP, sessions (/admin only), routes
lib/                     db, Cloudinary media helpers, YouTube, image validation + SSRF-safe
                         downloads, content loader (cached), auth, CSRF, uploads, validation
models/                  Section, Category, WorkItem, HeroSlide, Service, TeamMember, Settings, AdminUser
routes/public.js         Homepage + contact form
routes/admin/            Admin CMS routes
views/home.ejs           Renders visible sections in order via views/sections/<type>.ejs
views/admin/             Admin templates
public/css/tokens.css    Shared design tokens (site + admin)
public/css/style.css     Public design system
public/css/admin.css     Admin styles
public/js/app-ui.js      Hero book, Selected Work tabs/filters, team profile, lightbox
public/js/animations.js  Lenis + ScrollTrigger motion, nav tracking, cursor
public/js/admin.js       Admin interactions (reorder, uploads, YouTube preview, tags)
scripts/seed.js          Idempotent content import
scripts/reset-admin.js   Reset the admin password from ADMIN_PASSWORD
scripts/verify-project.js
```

`apply-team-redesign.js`, `.team-update-backup/` and `team-update-assets/` are leftovers from a one-off team redesign that has already been applied. They are not used at runtime and can be deleted.

## Security notes

- **Auth:** a single admin, with a bcrypt password hash and a rate-limited login (8 failed attempts per 15 minutes per IP). The session is regenerated on login.
- **Session cookies:** httpOnly, `SameSite=Lax`, scoped to `/admin`, `Secure` in production, and expire after 8 hours of inactivity.
- **CSRF:** a token is required on every admin write (forms, JSON and uploads).
- **Headers:** helmet adds a strict Content-Security-Policy (no inline scripts), `frame-ancestors 'none'`, and `noindex` on admin pages.
- **Validation and escaping:** every write is validated on the server, links must be `http(s)` (no `javascript:` URLs), and all content is HTML-escaped when rendered.
- **Uploads:** processed in memory, with a size limit, and the real file type is checked from the bytes. SVG is not accepted.
- **Link imports:** requests to private, loopback and link-local addresses are refused, including after redirects.
- **Contact form:** rate-limited (5 per 15 minutes per IP), with input escaped in the notification email.
