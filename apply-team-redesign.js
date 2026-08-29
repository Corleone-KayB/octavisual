#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const root = process.cwd();
const sourceRoot = path.join(__dirname, 'team-update-assets');
const backupRoot = path.join(root, '.team-update-backup');

const files = {
  app: path.join(root, 'app.js'),
  home: path.join(root, 'views', 'home.ejs'),
  css: path.join(root, 'public', 'css', 'style.css'),
  ui: path.join(root, 'public', 'js', 'app-ui.js'),
  animations: path.join(root, 'public', 'js', 'animations.js'),
};

for (const [label, file] of Object.entries(files)) {
  if (!fs.existsSync(file)) {
    console.error(`Missing ${label}: ${file}`);
    process.exit(1);
  }
}

fs.mkdirSync(backupRoot, { recursive: true });

function backup(file) {
  const rel = path.relative(root, file);
  const dest = path.join(backupRoot, rel);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  if (!fs.existsSync(dest)) fs.copyFileSync(file, dest);
}

function write(file, text) {
  backup(file);
  fs.writeFileSync(file, text, 'utf8');
}

function copyTree(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) copyTree(from, to);
    else fs.copyFileSync(from, to);
  }
}

function requireReplace(text, regex, replacement, label) {
  if (!regex.test(text)) {
    throw new Error(`Could not locate ${label}. No files were intentionally deleted; restore from ${backupRoot} if needed.`);
  }
  return text.replace(regex, replacement);
}

const teamMembersBlock = `const teamMembers = [
  {
    slug: 'fiette',
    image: '/images/team/fiette.webp',
    name: 'Fiette',
    role: 'Team member',
    bio: 'Profile details coming soon.',
    cv: '',
    instagram: '',
    linkedin: '',
    vimeo: '',
    website: ''
  },
  {
    slug: 'serge',
    image: '/images/team/serge.webp',
    name: 'Serge',
    role: 'Team member',
    bio: 'Profile details coming soon.',
    cv: '',
    instagram: '',
    linkedin: '',
    vimeo: '',
    website: ''
  },
  {
    slug: 'octave',
    image: '/images/team/octave-placeholder.svg',
    name: 'Octave',
    role: 'Team member',
    bio: 'Profile details coming soon.',
    cv: '',
    instagram: '',
    linkedin: '',
    vimeo: '',
    website: ''
  },
  {
    slug: 'innocent',
    image: '/images/team/innocent.webp',
    name: 'Innocent',
    role: 'Team member',
    bio: 'Profile details coming soon.',
    cv: '',
    instagram: '',
    linkedin: '',
    vimeo: '',
    website: ''
  },
  {
    slug: 'ice',
    image: '/images/team/ice.webp',
    name: 'Ice',
    role: 'Team member',
    bio: 'Profile details coming soon.',
    cv: '/cv/cedric-cv.pdf',
    instagram: '',
    linkedin: '',
    vimeo: '',
    website: ''
  }
];`;

const teamSection = `      <section id="team" class="workspace-panel team-panel team-kinetic" data-nav-section="team">
        <div class="panel-header">
          <span class="panel-number">04</span>
          <span class="panel-title">People</span>
          <span class="panel-meta">Small team · big stories</span>
        </div>

        <div class="team-scroll-shell">
          <div class="team-stage" id="teamStage">
            <div class="team-stage-copy" aria-hidden="true">
              <span class="team-stage-kicker">Small team,</span>
              <div class="team-stage-title">
                <strong>big</strong>
                <em>stories.</em>
              </div>
            </div>

            <div class="team-card-cloud" aria-label="Meet the Octavisual team">
              <% team.forEach(function(member, index) { %>
                <article class="team-float-card" data-team-card data-member-index="<%= index %>">
                  <button
                    class="team-card-hit"
                    type="button"
                    aria-label="Open <%= member.name %> profile"
                    data-cursor-text="VIEW PROFILE"
                  >
                    <span class="team-portrait-frame">
                      <img src="<%= member.image %>" alt="<%= member.name %>" loading="lazy" decoding="async">
                      <span class="team-index"><%= String(index + 1).padStart(2, '0') %></span>
                      <span class="team-card-open">Profile ↗</span>
                    </span>

                    <span class="team-card-caption">
                      <strong><%= member.name %></strong>
                      <small><%= member.role %></small>
                    </span>
                  </button>

                  <div class="team-member-data" hidden>
                    <span data-team-name><%= member.name %></span>
                    <span data-team-role><%= member.role %></span>
                    <p data-team-bio><%= member.bio %></p>
                    <% if (member.cv) { %><a data-team-link data-label="View CV" href="<%= member.cv %>">CV</a><% } %>
                    <% if (member.instagram) { %><a data-team-link data-label="Instagram" href="<%= member.instagram %>">Instagram</a><% } %>
                    <% if (member.linkedin) { %><a data-team-link data-label="LinkedIn" href="<%= member.linkedin %>">LinkedIn</a><% } %>
                    <% if (member.vimeo) { %><a data-team-link data-label="Vimeo" href="<%= member.vimeo %>">Vimeo</a><% } %>
                    <% if (member.website) { %><a data-team-link data-label="Website" href="<%= member.website %>">Website</a><% } %>
                  </div>
                </article>
              <% }); %>
            </div>

            <div class="team-stage-footer">
              <span>Click a portrait to meet the person</span>
              <span>Scroll to compose · scroll back to rewind</span>
            </div>
          </div>
        </div>
      </section>

      <div class="team-profile" id="teamProfile" aria-hidden="true">
        <button class="team-profile-backdrop" type="button" aria-label="Close team profile"></button>

        <section class="team-profile-panel" role="dialog" aria-modal="true" aria-labelledby="teamProfileName">
          <button class="team-profile-close" id="teamProfileClose" type="button" aria-label="Close team profile">×</button>

          <div class="team-profile-media">
            <img id="teamProfileImage" src="" alt="">
            <span class="team-profile-mark">OCTAVISUAL / PEOPLE</span>
          </div>

          <div class="team-profile-copy">
            <span class="team-profile-eyebrow">Meet the team</span>
            <h2 id="teamProfileName"></h2>
            <p class="team-profile-role" id="teamProfileRole"></p>
            <p class="team-profile-bio" id="teamProfileBio"></p>

            <div class="team-profile-links" id="teamProfileLinks"></div>
            <p class="team-profile-empty" id="teamProfileEmpty">CV & social links coming soon.</p>
          </div>
        </section>
      </div>`;

const teamCss = `/* ---------- Team kinetic editorial stage ---------- */
.team-panel {
  position: relative;
  padding-bottom: 0;
  overflow: clip;
  background:
    radial-gradient(circle at 50% 42%, rgba(214,91,61,.08), transparent 29rem),
    linear-gradient(180deg, #11161a 0%, #0b0f12 100%);
}

.team-scroll-shell {
  position: relative;
  height: 260svh;
  min-height: 1700px;
}

.team-stage {
  position: sticky;
  top: 10px;
  height: calc(100svh - 20px);
  min-height: 640px;
  overflow: hidden;
  isolation: isolate;
  perspective: 1600px;
  transform-style: preserve-3d;
}

.team-stage::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: -2;
  background:
    radial-gradient(circle at 16% 20%, rgba(255,255,255,.045), transparent 22rem),
    linear-gradient(120deg, rgba(255,255,255,.018), transparent 42%);
  pointer-events: none;
}

.team-stage-copy {
  position: absolute;
  inset: 0;
  z-index: 0;
  display: grid;
  place-content: center;
  justify-items: center;
  pointer-events: none;
  text-align: center;
  transform: translateZ(-80px);
}

.team-stage-kicker {
  margin-bottom: clamp(4px, .7vw, 12px);
  color: rgba(242,240,234,.6);
  font-size: clamp(1rem, 1.7vw, 1.65rem);
  font-weight: 580;
  letter-spacing: -.03em;
}

.team-stage-title {
  display: grid;
  line-height: .73;
}

.team-stage-title strong {
  color: var(--text);
  font-size: clamp(8rem, 20vw, 22rem);
  font-weight: 560;
  letter-spacing: -.105em;
}

.team-stage-title em {
  margin-top: -.03em;
  color: var(--brand-rust);
  font-family: var(--serif);
  font-size: clamp(4.2rem, 10.2vw, 11rem);
  font-weight: 400;
  font-style: italic;
  letter-spacing: -.055em;
  transform: rotate(-2deg);
}

.team-card-cloud {
  position: absolute;
  inset: 0;
  z-index: 2;
  transform-style: preserve-3d;
}

.team-float-card {
  position: absolute;
  width: clamp(160px, 14.8vw, 270px);
  transform-style: preserve-3d;
  will-change: transform, opacity;
}

.team-float-card:nth-child(1) { left: 7%; top: 25%; }
.team-float-card:nth-child(2) { left: 34%; top: 11%; }
.team-float-card:nth-child(3) { right: 6%; top: 23%; }
.team-float-card:nth-child(4) { left: 18%; bottom: 7%; }
.team-float-card:nth-child(5) { right: 22%; bottom: 5%; }

.team-card-hit {
  width: 100%;
  display: block;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
  transform-style: preserve-3d;
}

.team-card-hit:focus-visible {
  outline: 2px solid var(--brand-coral);
  outline-offset: 8px;
  border-radius: 20px;
}

.team-portrait-frame {
  position: relative;
  display: block;
  aspect-ratio: 4 / 5;
  overflow: hidden;
  border: 1px solid rgba(255,255,255,.14);
  border-radius: 18px;
  background: #171c20;
  box-shadow: 0 24px 60px rgba(0,0,0,.28);
  transition: border-color .3s ease, box-shadow .35s ease;
}

.team-portrait-frame::after {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: linear-gradient(0deg, rgba(5,7,9,.62), transparent 42%);
}

.team-portrait-frame img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  filter: saturate(.8) contrast(1.02);
  transform: scale(1.015);
  transition: transform .65s cubic-bezier(.22,1,.36,1), filter .45s ease;
}

.team-card-hit:hover .team-portrait-frame,
.team-card-hit:focus-visible .team-portrait-frame {
  border-color: rgba(214,91,61,.72);
  box-shadow: 0 34px 78px rgba(0,0,0,.36);
}

.team-card-hit:hover .team-portrait-frame img,
.team-card-hit:focus-visible .team-portrait-frame img {
  transform: scale(1.045);
  filter: saturate(1) contrast(1.01);
}

.team-index,
.team-card-open {
  position: absolute;
  z-index: 2;
  bottom: 12px;
  color: rgba(255,255,255,.84);
  font-size: 9px;
  font-weight: 650;
  letter-spacing: .1em;
  text-transform: uppercase;
}

.team-index { left: 13px; }
.team-card-open { right: 13px; opacity: 0; transform: translateY(5px); transition: opacity .3s ease, transform .3s ease; }

.team-card-hit:hover .team-card-open,
.team-card-hit:focus-visible .team-card-open {
  opacity: 1;
  transform: translateY(0);
}

.team-card-caption {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 2px 0;
}

.team-card-caption strong {
  font-size: 13px;
  font-weight: 570;
  letter-spacing: -.02em;
}

.team-card-caption small {
  color: rgba(242,240,234,.48);
  font-size: 8px;
  letter-spacing: .1em;
  text-transform: uppercase;
}

.team-stage-footer {
  position: absolute;
  z-index: 4;
  left: clamp(22px, 3vw, 48px);
  right: clamp(22px, 3vw, 48px);
  bottom: 20px;
  display: flex;
  justify-content: space-between;
  gap: 20px;
  color: rgba(242,240,234,.42);
  font-size: 8px;
  font-weight: 650;
  letter-spacing: .1em;
  text-transform: uppercase;
  pointer-events: none;
}

/* ---------- Team profile expansion ---------- */
.team-profile {
  position: fixed;
  inset: 0;
  z-index: 3500;
  display: grid;
  place-items: center;
  padding: clamp(16px, 3vw, 42px);
  visibility: hidden;
  pointer-events: none;
}

.team-profile.is-open {
  visibility: visible;
  pointer-events: auto;
}

.team-profile-backdrop {
  position: absolute;
  inset: 0;
  border: 0;
  background: rgba(5,7,9,.86);
  cursor: default;
  opacity: 0;
}

.team-profile-panel {
  position: relative;
  z-index: 2;
  width: min(1040px, 94vw);
  max-height: min(760px, 90svh);
  display: grid;
  grid-template-columns: minmax(280px, .88fr) minmax(340px, 1.12fr);
  overflow: hidden;
  border: 1px solid rgba(255,255,255,.14);
  border-radius: 24px;
  background: #10151a;
  box-shadow: 0 44px 120px rgba(0,0,0,.48);
  opacity: 0;
  transform-origin: 50% 50%;
}

.team-profile-media {
  position: relative;
  min-height: min(72svh, 680px);
  overflow: hidden;
  background: #171c20;
}

.team-profile-media::after {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: linear-gradient(0deg, rgba(5,7,9,.48), transparent 46%);
}

.team-profile-media img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.team-profile-mark {
  position: absolute;
  z-index: 2;
  left: 20px;
  bottom: 18px;
  color: rgba(255,255,255,.68);
  font-size: 8px;
  font-weight: 650;
  letter-spacing: .11em;
}

.team-profile-copy {
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: clamp(34px, 5vw, 72px);
}

.team-profile-eyebrow {
  margin-bottom: 22px;
  color: var(--brand-coral);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: .15em;
  text-transform: uppercase;
}

.team-profile-copy h2 {
  font-size: clamp(3.4rem, 6vw, 6.8rem);
  font-weight: 520;
  letter-spacing: -.07em;
  line-height: .88;
}

.team-profile-role {
  margin-top: 14px;
  color: rgba(242,240,234,.55);
  font-size: 10px;
  font-weight: 650;
  letter-spacing: .12em;
  text-transform: uppercase;
}

.team-profile-bio {
  max-width: 34ch;
  margin-top: 34px;
  color: rgba(242,240,234,.72);
  font-family: var(--serif);
  font-size: clamp(1.15rem, 1.7vw, 1.5rem);
  line-height: 1.45;
}

.team-profile-links {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 38px;
}

.team-profile-links a {
  display: inline-flex;
  align-items: center;
  gap: 16px;
  min-height: 42px;
  padding: 0 15px;
  border: 1px solid rgba(255,255,255,.16);
  border-radius: 999px;
  color: rgba(242,240,234,.82);
  font-size: 9px;
  font-weight: 650;
  letter-spacing: .09em;
  text-transform: uppercase;
  transition: background .25s ease, color .25s ease, border-color .25s ease;
}

.team-profile-links a:hover,
.team-profile-links a:focus-visible {
  border-color: var(--brand-coral);
  background: var(--brand-coral);
  color: #0b0e10;
}

.team-profile-empty {
  margin-top: 24px;
  color: rgba(242,240,234,.35);
  font-size: 9px;
  letter-spacing: .08em;
  text-transform: uppercase;
}

.team-profile-empty[hidden] { display: none; }

.team-profile-close {
  position: absolute;
  z-index: 5;
  top: 18px;
  right: 18px;
  width: 44px;
  height: 44px;
  border: 1px solid rgba(255,255,255,.2);
  border-radius: 50%;
  background: rgba(5,7,9,.46);
  color: #fff;
  font-size: 24px;
  line-height: 1;
  cursor: pointer;
}

body.team-profile-open { overflow: hidden; }

@media (max-width: 1100px) {
  .team-float-card { width: clamp(150px, 17vw, 230px); }
  .team-float-card:nth-child(1) { left: 5%; }
  .team-float-card:nth-child(3) { right: 4%; }
}

@media (max-width: 900px) {
  .team-scroll-shell {
    height: auto;
    min-height: 0;
  }

  .team-stage {
    position: relative;
    top: auto;
    height: auto;
    min-height: 0;
    overflow: hidden;
    padding: 72px 18px 34px;
    perspective: none;
  }

  .team-stage-copy {
    position: relative;
    inset: auto;
    display: block;
    text-align: left;
    transform: none;
  }

  .team-stage-title {
    display: flex;
    align-items: baseline;
    gap: .14em;
    line-height: .82;
  }

  .team-stage-title strong {
    font-size: clamp(6.2rem, 25vw, 11rem);
  }

  .team-stage-title em {
    margin: 0;
    font-size: clamp(3rem, 12vw, 5.2rem);
  }

  .team-card-cloud {
    position: relative;
    inset: auto;
    display: flex;
    gap: 14px;
    margin: 36px -18px 0;
    padding: 0 18px 14px;
    overflow-x: auto;
    scrollbar-width: none;
    scroll-snap-type: x mandatory;
  }

  .team-card-cloud::-webkit-scrollbar { display: none; }

  .team-float-card,
  .team-float-card:nth-child(n) {
    position: relative;
    inset: auto;
    left: auto;
    right: auto;
    top: auto;
    bottom: auto;
    flex: 0 0 min(72vw, 310px);
    width: min(72vw, 310px);
    opacity: 1 !important;
    transform: none !important;
    scroll-snap-align: center;
  }

  .team-stage-footer {
    position: relative;
    inset: auto;
    margin-top: 12px;
  }

  .team-stage-footer span:last-child { display: none; }

  .team-profile-panel {
    width: min(620px, 94vw);
    max-height: 92svh;
    grid-template-columns: 1fr;
    overflow-y: auto;
  }

  .team-profile-media {
    min-height: 42svh;
    max-height: 430px;
  }

  .team-profile-copy { padding: 30px 24px 38px; }
}

@media (max-width: 520px) {
  .team-stage { padding-top: 56px; }
  .team-stage-kicker { font-size: .9rem; }
  .team-card-cloud { margin-top: 26px; }
  .team-float-card,
  .team-float-card:nth-child(n) {
    flex-basis: min(79vw, 300px);
    width: min(79vw, 300px);
  }
  .team-profile { padding: 10px; }
  .team-profile-panel { width: 100%; border-radius: 18px; }
  .team-profile-media { min-height: 38svh; }
  .team-profile-copy h2 { font-size: clamp(3rem, 17vw, 4.6rem); }
}

@media (prefers-reduced-motion: reduce) {
  .team-scroll-shell { height: auto; min-height: 0; }
  .team-stage { position: relative; top: auto; height: auto; min-height: 0; padding: 70px 20px 34px; }
  .team-stage-copy { position: relative; inset: auto; transform: none; }
  .team-card-cloud { position: relative; inset: auto; display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 18px; margin-top: 36px; }
  .team-float-card,
  .team-float-card:nth-child(n) { position: relative; inset: auto; width: 100%; opacity: 1 !important; transform: none !important; }
  .team-stage-footer { position: relative; inset: auto; margin-top: 24px; }
}`;

const teamUi = `  // ---------- Team profile expansion ----------
  const teamProfile = document.getElementById('teamProfile');
  const teamProfilePanel = teamProfile?.querySelector('.team-profile-panel');
  const teamProfileBackdrop = teamProfile?.querySelector('.team-profile-backdrop');
  const teamProfileClose = document.getElementById('teamProfileClose');
  const teamProfileImage = document.getElementById('teamProfileImage');
  const teamProfileName = document.getElementById('teamProfileName');
  const teamProfileRole = document.getElementById('teamProfileRole');
  const teamProfileBio = document.getElementById('teamProfileBio');
  const teamProfileLinks = document.getElementById('teamProfileLinks');
  const teamProfileEmpty = document.getElementById('teamProfileEmpty');
  let activeTeamCard = null;

  function teamField(card, selector) {
    return card?.querySelector(selector)?.textContent?.trim() || '';
  }

  function populateTeamProfile(card) {
    if (!card) return;
    const data = card.querySelector('.team-member-data');
    const image = card.querySelector('.team-portrait-frame img');
    const name = teamField(data, '[data-team-name]');
    const role = teamField(data, '[data-team-role]');
    const bio = teamField(data, '[data-team-bio]');

    if (teamProfileImage && image) {
      teamProfileImage.src = image.currentSrc || image.src;
      teamProfileImage.alt = name || image.alt || 'Octavisual team member';
    }
    if (teamProfileName) teamProfileName.textContent = name;
    if (teamProfileRole) teamProfileRole.textContent = role;
    if (teamProfileBio) teamProfileBio.textContent = bio;

    if (teamProfileLinks) {
      teamProfileLinks.replaceChildren();
      data?.querySelectorAll('[data-team-link]').forEach(source => {
        const link = document.createElement('a');
        link.href = source.href;
        link.target = '_blank';
        link.rel = 'noopener';
        link.textContent = \`\${source.dataset.label || source.textContent.trim()} ↗\`;
        teamProfileLinks.appendChild(link);
      });
      if (teamProfileEmpty) teamProfileEmpty.hidden = teamProfileLinks.children.length > 0;
    }
  }

  function openTeamProfile(card) {
    if (!teamProfile || !teamProfilePanel || !card || teamProfile.classList.contains('is-open')) return;
    activeTeamCard = card;
    populateTeamProfile(card);

    const sourceRect = card.getBoundingClientRect();
    teamProfile.classList.add('is-open');
    teamProfile.setAttribute('aria-hidden', 'false');
    document.body.classList.add('team-profile-open');
    window.__octaLenis?.stop?.();

    requestAnimationFrame(() => {
      const panelRect = teamProfilePanel.getBoundingClientRect();
      const dx = sourceRect.left + sourceRect.width / 2 - (panelRect.left + panelRect.width / 2);
      const dy = sourceRect.top + sourceRect.height / 2 - (panelRect.top + panelRect.height / 2);
      const scale = Math.max(.28, Math.min(.62, sourceRect.width / panelRect.width));

      if (window.gsap && !reducedMotion) {
        gsap.set(teamProfileBackdrop, { opacity: 0 });
        gsap.fromTo(teamProfilePanel,
          { x: dx, y: dy, scale, rotation: -2, opacity: .2 },
          { x: 0, y: 0, scale: 1, rotation: 0, opacity: 1, duration: .72, ease: 'power4.out', clearProps: 'transform' }
        );
        gsap.to(teamProfileBackdrop, { opacity: 1, duration: .45, ease: 'power2.out' });
        gsap.fromTo(teamProfilePanel.querySelectorAll('.team-profile-copy > *'),
          { y: 18, opacity: 0 },
          { y: 0, opacity: 1, duration: .48, stagger: .045, delay: .18, ease: 'power3.out' }
        );
      } else {
        teamProfilePanel.style.opacity = '1';
        if (teamProfileBackdrop) teamProfileBackdrop.style.opacity = '1';
      }

      teamProfileClose?.focus({ preventScroll: true });
    });
  }

  function closeTeamProfile() {
    if (!teamProfile?.classList.contains('is-open')) return;

    const finish = () => {
      teamProfile.classList.remove('is-open');
      teamProfile.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('team-profile-open');
      teamProfilePanel?.removeAttribute('style');
      teamProfileBackdrop?.removeAttribute('style');
      window.__octaLenis?.start?.();
      activeTeamCard?.querySelector('.team-card-hit')?.focus({ preventScroll: true });
      activeTeamCard = null;
    };

    if (window.gsap && !reducedMotion && activeTeamCard && teamProfilePanel) {
      const targetRect = activeTeamCard.getBoundingClientRect();
      const panelRect = teamProfilePanel.getBoundingClientRect();
      const dx = targetRect.left + targetRect.width / 2 - (panelRect.left + panelRect.width / 2);
      const dy = targetRect.top + targetRect.height / 2 - (panelRect.top + panelRect.height / 2);
      const scale = Math.max(.28, Math.min(.62, targetRect.width / panelRect.width));
      gsap.to(teamProfileBackdrop, { opacity: 0, duration: .28, ease: 'power2.in' });
      gsap.to(teamProfilePanel, { x: dx, y: dy, scale, opacity: 0, duration: .48, ease: 'power3.in', onComplete: finish });
    } else {
      finish();
    }
  }

  document.querySelectorAll('[data-team-card]').forEach(card => {
    card.querySelector('.team-card-hit')?.addEventListener('click', () => openTeamProfile(card));
  });

  teamProfileClose?.addEventListener('click', closeTeamProfile);
  teamProfileBackdrop?.addEventListener('click', closeTeamProfile);

  document.addEventListener('keydown', event => {
    if (!teamProfile?.classList.contains('is-open')) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      closeTeamProfile();
      return;
    }
    if (event.key === 'Tab' && teamProfilePanel) {
      const focusable = [...teamProfilePanel.querySelectorAll('button:not([disabled]), a[href]')];
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  });`;

const teamAnimation = `  // ---------- Team kinetic scroll choreography ----------
  const teamStage = document.getElementById('teamStage');
  const teamShell = document.querySelector('.team-scroll-shell');
  const teamCards = gsap.utils.toArray('[data-team-card]');

  if (teamStage && teamShell && teamCards.length) {
    const teamMM = gsap.matchMedia();

    teamMM.add('(min-width: 901px) and (prefers-reduced-motion: no-preference)', () => {
      const choreography = [
        { fromX: -260, fromY: 240, fromRY: 82, fromR: -18, settleR: -8, outX: -180, outY: -260, outRY: -66 },
        { fromX: -40, fromY: -230, fromRY: -86, fromR: 10, settleR: 5, outX: 70, outY: -300, outRY: 74 },
        { fromX: 280, fromY: 110, fromRY: -82, fromR: 17, settleR: 8, outX: 240, outY: -170, outRY: 68 },
        { fromX: -230, fromY: 250, fromRY: 76, fromR: 12, settleR: 6, outX: -260, outY: 200, outRY: -70 },
        { fromX: 230, fromY: 260, fromRY: -78, fromR: -16, settleR: -6, outX: 290, outY: 170, outRY: 72 }
      ];

      const titleBig = teamStage.querySelector('.team-stage-title strong');
      const titleStories = teamStage.querySelector('.team-stage-title em');
      const footer = teamStage.querySelector('.team-stage-footer');

      teamCards.forEach((card, index) => {
        const p = choreography[index % choreography.length];
        gsap.set(card, {
          x: p.fromX,
          y: p.fromY,
          rotationY: p.fromRY,
          rotation: p.fromR,
          scale: .76,
          opacity: 0,
          transformOrigin: '50% 50%',
          force3D: true
        });
      });

      gsap.set(titleBig, { scale: .78, opacity: .24, force3D: true });
      gsap.set(titleStories, { y: 24, opacity: .18, force3D: true });
      gsap.set(footer, { opacity: .18 });

      const hold = { value: 0 };
      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          trigger: teamShell,
          start: 'top top',
          end: 'bottom bottom',
          scrub: true,
          invalidateOnRefresh: true
        }
      });

      tl.to(titleBig, { scale: 1.04, opacity: .92, duration: .9 }, 0)
        .to(titleStories, { y: 0, opacity: 1, duration: .72 }, .16)
        .to(footer, { opacity: .75, duration: .42 }, .44);

      teamCards.forEach((card, index) => {
        const p = choreography[index % choreography.length];
        tl.to(card, {
          x: 0,
          y: 0,
          rotationY: 0,
          rotation: p.settleR,
          scale: 1,
          opacity: 1,
          duration: .82
        }, .18 + index * .09);
      });

      tl.to(hold, { value: 1, duration: .88 }, 1.04);

      teamCards.forEach((card, index) => {
        const p = choreography[index % choreography.length];
        tl.to(card, {
          x: p.outX,
          y: p.outY,
          rotationY: p.outRY,
          rotation: p.settleR * 1.4,
          scale: .82,
          opacity: .06,
          duration: .78
        }, 1.72 + index * .055);
      });

      tl.to(titleBig, { scale: .88, opacity: .18, duration: .62 }, 1.74)
        .to(titleStories, { y: -18, opacity: .12, duration: .62 }, 1.78)
        .to(footer, { opacity: .1, duration: .38 }, 1.80);

      return () => {
        tl.scrollTrigger?.kill();
        tl.kill();
        gsap.set(teamCards, { clearProps: 'transform,opacity' });
        gsap.set([titleBig, titleStories, footer], { clearProps: 'transform,opacity' });
      };
    });
  }`;

try {
  // app.js: replace only team data block.
  let app = fs.readFileSync(files.app, 'utf8');
  app = requireReplace(
    app,
    /const\s+teamMembers\s*=\s*\[[\s\S]*?\n\];/,
    teamMembersBlock,
    'const teamMembers = [...] in app.js'
  );
  write(files.app, app);

  // home.ejs: replace only Team section and inject profile overlay before Contact.
  let home = fs.readFileSync(files.home, 'utf8');
  home = requireReplace(
    home,
    /\s*<section\s+id="team"[\s\S]*?<\/section>\s*(?=<section\s+id="contact")/,
    `\n\n${teamSection}\n\n      `,
    'Team section in views/home.ejs'
  );
  write(files.home, home);

  // style.css: replace Team CSS only.
  let css = fs.readFileSync(files.css, 'utf8');
  css = requireReplace(
    css,
    /\/\* ---------- Team ---------- \*\/[\s\S]*?(?=\/\* ---------- Contact ---------- \*\/)/,
    `${teamCss}\n\n`,
    'Team CSS block in public/css/style.css'
  );
  write(files.css, css);

  // app-ui.js: replace old carousel logic only.
  let ui = fs.readFileSync(files.ui, 'utf8');
  ui = requireReplace(
    ui,
    /\s*\/\/ ---------- Team controlled carousel \+ quiet autoplay ----------[\s\S]*?(?=\s*\/\/ ---------- Photography lightbox ----------)/,
    `\n\n${teamUi}\n\n`,
    'old Team carousel logic in public/js/app-ui.js'
  );
  write(files.ui, ui);

  // animations.js: expose Lenis for modal pause + replace Team animation only.
  let animations = fs.readFileSync(files.animations, 'utf8');
  if (!animations.includes('window.__octaLenis = lenis;')) {
    animations = animations.replace(
      /(const\s+lenis\s*=\s*new\s+Lenis\([\s\S]*?\);)/,
      `$1\n  window.__octaLenis = lenis;`
    );
  }
  animations = requireReplace(
    animations,
    /\s*\/\/ ---------- Team cards ----------[\s\S]*?(?=\s*\/\/ ---------- Contact ----------)/,
    `\n\n${teamAnimation}\n\n`,
    'old Team card animation in public/js/animations.js'
  );
  write(files.animations, animations);

  // Copy provided/optimized assets.
  copyTree(path.join(sourceRoot, 'public', 'images', 'team'), path.join(root, 'public', 'images', 'team'));
  copyTree(path.join(sourceRoot, 'public', 'cv'), path.join(root, 'public', 'cv'));

  console.log('\nOctavisual Team redesign applied successfully.');
  console.log('Backups:', backupRoot);
  console.log('Edited: app.js, views/home.ejs, public/css/style.css, public/js/app-ui.js, public/js/animations.js');
  console.log('Added: optimized team images + public/cv/cedric-cv.pdf');
  console.log('\nImportant asset notes:');
  console.log('- Octave archive contained only a macOS ._ metadata entry, so a temporary Octave placeholder is used.');
  console.log('- Serge/Innocent archives referenced CV files only as macOS ._ metadata entries; those CV buttons remain hidden.');
  console.log('- Fiette archive did not contain a CV.');
  console.log('- Social links were not supplied, so the profile UI supports them but does not invent URLs.');
} catch (error) {
  console.error('\nTeam update failed:', error.message);
  process.exit(1);
}
