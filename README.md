# Octavisual — Visual Workspace v2

A complete redesign of the Octavisual photography / film portfolio using a cinematic dashboard-inspired interface.

## Included (Roadmap Steps 1–10)

1. **Dashboard shell** — every major section is contained in a static, rounded workspace panel.
2. **Vertical sidebar** — fixed icon rail on desktop; individual navigation items expand into text labels on hover/focus without shifting the page.
3. **Global design system** — consistent canvas, panel, border, typography, spacing, radius and accent variables.
4. **Cinematic book hero** — five photographs are arranged as a visible page stack with forward/backward 3D page turns, manual arrow controls, dot navigation, keyboard arrows, swipe gestures, autoplay, progress controls and subtle pointer parallax.
5. **About panel** — editorial split layout, large statement, structured studio copy and service index.
6. **Portfolio** — curated asymmetric grid, segmented filters, animated filtering, metadata, image lightbox, contextual cursor states and project hover motion.
7. **Team** — contained horizontal carousel with controls, subtle autoplay and grayscale-to-color portrait treatment.
8. **Contact** — redesigned form and contact information while preserving the existing Express/Nodemailer POST route.
9. **Motion system** — GSAP + ScrollTrigger + Lenis, panel entrances, active navigation tracking, magnetic controls and contextual cursor.
10. **Responsive system** — desktop sidebar, tablet adaptation and a touch-friendly floating bottom dock on mobile.

### Bonus included

The project also contains locally generated web-sized portfolio/team derivatives and WebP hero images so the supplied build does not reference missing portfolio or team image files.

## Project structure

```text
octavisual/
├─ app.js
├─ package.json
├─ package-lock.json
├─ .env.example
├─ public/
│  ├─ css/
│  │  └─ style.css
│  ├─ js/
│  │  ├─ app-ui.js
│  │  └─ animations.js
│  └─ images/
│     ├─ optimized/
│     ├─ portfolio/
│     └─ team/
└─ views/
   ├─ home.ejs
   └─ partials/
      ├─ header.ejs
      └─ footer.ejs
```

## Run locally

Requirements: Node.js 18+.

```powershell
cd path\to\octavisual
npm install
npm start
```

Open:

```text
http://localhost:3000
```

## Contact form setup

Copy `.env.example` to `.env`:

```powershell
Copy-Item .env.example .env
```

Then set:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-sending-address@gmail.com
SMTP_PASS=your-app-password
CONTACT_TO_EMAIL=your-inbox@example.com
```

For Gmail, use an App Password rather than your normal account password.

## Content you should replace before production

The redesign keeps/template-fills a few values because the original ZIP did not contain their final assets/data:

- phone numbers
- Instagram / YouTube / LinkedIn URLs
- five portfolio video URLs that were placeholders in the original project
- final team portraits/names if the generated local derivatives are only temporary

Portfolio data and team data live in `app.js`.

## Main files to customize

- **Content/data:** `app.js`
- **Page sections:** `views/home.ejs`
- **Desktop sidebar + mobile dock:** `views/partials/header.ejs`
- **Full visual system/responsiveness:** `public/css/style.css`
- **Hero/filter/carousel/lightbox behavior:** `public/js/app-ui.js`
- **GSAP/Lenis motion + active navigation:** `public/js/animations.js`

## Deployment

This remains a standard Express application. For Render or a similar Node host, use:

- Build command: `npm install`
- Start command: `npm start`

Add the SMTP environment variables through your hosting provider rather than committing a `.env` file.


## Hero page-turn controls

The `#home` hero behaves like a photographic lookbook rather than a conventional cross-fade slider.

- Click the left/right circular arrows to turn pages manually.
- Click a progress segment to jump to a page.
- Swipe left/right across the hero image on touch screens.
- Use the keyboard Left/Right arrows while the hero is visible.
- Autoplay advances every 6.5 seconds and resets after manual interaction.
- `prefers-reduced-motion` automatically falls back to immediate page changes.

No extra npm package is required for the page-turn effect; it uses the existing GSAP CDN already loaded by `home.ejs`.


## Cinematic About section

The About section is a scroll-scrubbed photographic chapter. As it enters the viewport the supplied background photograph expands from a centred frame to the full Octavisual workspace. It stays open through the reading zone and compresses again before Portfolio. Scrolling back upward reverses the same sequence automatically.
