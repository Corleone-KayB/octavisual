# Octavisual Book Hero — project changes

This build starts from `octavisual-visual-workspace-v2-hero-typography` and keeps the existing Express/EJS application intact.

## Changed files

- `views/home.ejs` — the five hero photographs are now marked up as stacked manual pages, with previous/next page buttons, progress controls, swipe-ready semantics, and an accessible live page counter.
- `public/css/style.css` — adds the book-page stack, visible paper edges, depth offsets, 3D perspective, turn shadows, page sheen, responsive mobile layout, and reduced-motion behavior.
- `public/js/app-ui.js` — replaces the old wipe slider with native browser page-turn animations. It supports manual previous/next, dot jumps, left/right keyboard arrows, horizontal swipe/drag gestures, autoplay, and autoplay reset after manual input.
- `public/js/animations.js` — keeps the existing GSAP/Lenis motion system while preventing pointer parallax from fighting a page turn; also adds a subtle hero-stack entrance.
- `README.md` — documents the new hero controls.
- `package.json` — adds `npm run verify`.
- `scripts/verify-project.js` — dependency-free project/hero integrity check.

## Important reliability change

The hero page turn itself uses the browser's native Web Animations API rather than depending on GSAP. The rest of the site's optional GSAP effects are preserved. This means the hero still turns pages even if the external animation CDN is unavailable.

## Run

```powershell
npm install
npm run verify
npm start
```

Then open `http://localhost:3000`.


## Cinematic About chapter

- Replaced the old two-column About layout with the confirmed full-background treatment.
- Added the supplied field photograph as `public/images/about-cinematic.jpg`.
- About now opens from a centred compressed frame into the full content workspace, holds for reading, then compresses back to centre before Portfolio.
- The entire transformation is driven by GSAP ScrollTrigger with scrub, so downward and upward scrolling are exact reversible counterparts.
- Added layered image opacity, gradients and vignette treatment for text readability.
- Replaced the old copy with the supplied 2017/Kigali statement.
- Styled the second paragraph in the same Instrument Serif italic / orange-rust visual language as “stay with you.”
- Added tablet, mobile and reduced-motion fallbacks.
