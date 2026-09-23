(() => {
  if (!window.gsap || !window.ScrollTrigger) return;
  gsap.registerPlugin(ScrollTrigger);

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- Lenis smooth scroll ----------
  if (window.Lenis && !reducedMotion) {
    const lenis = new Lenis({
      duration: 1.08,
      smoothWheel: true,
      syncTouch: false,
      anchors: { offset: 0, duration: 1.05 }
    });
  window.__octaLenis = lenis;
    window.octavisualLenis = lenis;
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(time => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
  }

  // ---------- Active section navigation ----------
  const desktopNav = Array.from(document.querySelectorAll('.nav-item[data-section]'));
  const mobileNav = Array.from(document.querySelectorAll('.mobile-nav-item[data-section]'));

  function setActiveSection(id) {
    [...desktopNav, ...mobileNav].forEach(link => {
      link.classList.toggle('is-active', link.dataset.section === id);
    });
  }

  document.querySelectorAll('[data-nav-section]').forEach(section => {
    ScrollTrigger.create({
      trigger: section,
      start: 'top 48%',
      end: 'bottom 48%',
      onToggle: self => {
        if (self.isActive) setActiveSection(section.dataset.navSection);
      }
    });
  });

  if (reducedMotion) return;

  // ---------- Panel entrances ----------
  gsap.utils.toArray('.workspace-panel:not(.hero-panel):not(.about-panel)').forEach(panel => {
    gsap.from(panel, {
      y: 26,
      scale: .993,
      opacity: .35,
      duration: 1,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: panel,
        start: 'top 91%',
        once: true
      }
    });
  });

  gsap.from('.hero-slider', { scale: .992, opacity: .72, duration: 1.1, delay: .08, ease: 'power3.out' });
  gsap.from('.hero-topline', { y: -14, opacity: 0, duration: .8, delay: .15, ease: 'power3.out' });
  gsap.from('.hero-copy .eyebrow', { y: 14, opacity: 0, duration: .7, delay: .3, ease: 'power3.out' });
  gsap.from('.hero-copy h1', { y: 44, opacity: 0, duration: 1.15, delay: .32, ease: 'power4.out' });
  gsap.from('.hero-copy p', { y: 20, opacity: 0, duration: .85, delay: .58, ease: 'power3.out' });
  gsap.from('.hero-bottom', { y: 16, opacity: 0, duration: .8, delay: .72, ease: 'power3.out' });

  // ---------- About cinematic scroll chapter ----------
  // The About image behaves like a photographic object that opens from the
  // centre into the full workspace, then compresses again before Portfolio.
  // The animation is scrubbed, so scrolling upward produces the exact inverse.
  const aboutPanel = document.querySelector('.about-panel');
  const aboutFrame = document.querySelector('.about-cinematic-frame');
  const aboutImage = document.querySelector('.about-cinematic-image');
  const aboutOverlay = document.querySelector('.about-cinematic-overlay');
  const aboutCopy = document.querySelector('.about-cinematic-copy');
  const aboutHeader = document.querySelector('.about-panel-header');
  const aboutFootnote = document.querySelector('.about-cinematic-footnote');

  if (aboutPanel && aboutFrame && aboutImage && aboutCopy) {
    // Timing: the panel is ~150svh tall (style.css), so the sticky stage pins
    // for ~50svh. Expand runs while the panel scrolls in, the hold covers the
    // pinned stretch, and compress runs while it scrolls out — one scroll
    // gesture each way. matchMedia rebuilds the timeline when the breakpoint
    // changes so mobile/desktop scale values never go stale.
    const aboutMM = gsap.matchMedia();

    aboutMM.add({
      isMobile: '(max-width: 760px)',
      isDesktop: '(min-width: 761px)'
    }, context => {
      const { isMobile } = context.conditions;
      const compactScaleX = isMobile ? .92 : .80;
      const compactScaleY = isMobile ? .84 : .72;
      const compactRadius = isMobile ? 24 : 34;
      const fullRadius = isMobile ? 12 : 8;
      const hold = { progress: 0 };

      gsap.set(aboutFrame, {
        scaleX: compactScaleX,
        scaleY: compactScaleY,
        borderRadius: compactRadius,
        transformOrigin: '50% 50%'
      });
      gsap.set(aboutImage, { scale: 1.115, yPercent: -1.4 });
      gsap.set(aboutCopy, { opacity: 0, y: 42 });
      if (aboutHeader) gsap.set(aboutHeader, { opacity: .34 });
      if (aboutFootnote) gsap.set(aboutFootnote, { opacity: 0, y: 10 });
      if (aboutOverlay) gsap.set(aboutOverlay, { opacity: .96 });

      const aboutTimeline = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          trigger: aboutPanel,
          start: 'top 88%',
          end: 'bottom 12%',
          // Short catch-up only: Lenis already smooths the wheel, and a long
          // scrub lag makes the chapter keep moving after the gesture ends.
          scrub: .45,
          invalidateOnRefresh: true
        }
      });

      // Open from the centre.
      aboutTimeline
        .to(aboutFrame, { scaleX: 1, scaleY: 1, borderRadius: fullRadius, duration: 1 }, 0)
        .to(aboutImage, { scale: 1.018, yPercent: 0, duration: 1.12 }, 0)
        .to(aboutOverlay, { opacity: .82, duration: .9 }, .08)
        .to(aboutHeader, { opacity: 1, duration: .46 }, .34)
        .to(aboutCopy, { opacity: 1, y: 0, duration: .58 }, .42)
        .to(aboutFootnote, { opacity: .72, y: 0, duration: .45 }, .58)

        // Hold the full-frame chapter while the stage is pinned.
        .to(hold, { progress: 1, duration: 1.18 }, 1.02)

        // Leave the chapter: copy softens first, then the photograph folds
        // visually back into the centre before Portfolio enters.
        .to(aboutCopy, { opacity: 0, y: -30, duration: .46 }, 2.18)
        .to(aboutFootnote, { opacity: 0, y: -8, duration: .34 }, 2.20)
        .to(aboutHeader, { opacity: .34, duration: .45 }, 2.27)
        .to(aboutOverlay, { opacity: .96, duration: .75 }, 2.34)
        .to(aboutFrame, { scaleX: compactScaleX, scaleY: compactScaleY, borderRadius: compactRadius, duration: 1 }, 2.38)
        .to(aboutImage, { scale: 1.115, yPercent: 1.4, duration: 1 }, 2.38);

      return () => {
        gsap.set([aboutFrame, aboutImage, aboutCopy, aboutHeader, aboutFootnote, aboutOverlay].filter(Boolean), { clearProps: 'all' });
      };
    });
  }

  // ---------- Portfolio cards ----------
  // Cards are re-rendered by the Selected Work filters (app-ui.js), which
  // announce each render so the entrance batch always targets what is shown.
  let cardTriggers = [];
  function batchProjectCards(cards) {
    cardTriggers.forEach(trigger => trigger.kill());
    cardTriggers = cards.length ? ScrollTrigger.batch(cards, {
      start: 'top 90%',
      once: true,
      onEnter: batch => gsap.fromTo(batch,
        { y: 26, opacity: 0, scale: .99 },
        { y: 0, opacity: 1, scale: 1, stagger: .07, duration: .75, ease: 'power3.out', overwrite: true, clearProps: 'transform' }
      )
    }) : [];
  }
  batchProjectCards(gsap.utils.toArray('#galleryGrid .project-card'));
  document.addEventListener('octavisual:work-rendered', event => {
    batchProjectCards(event.detail.cards);
    ScrollTrigger.refresh();
  });

  // ---------- Team kinetic scroll choreography ----------
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
  }



  // ---------- Contact ----------
  gsap.from('.contact-hero .statement, .contact-mail', {
    y: 24,
    opacity: 0,
    stagger: .12,
    duration: .9,
    ease: 'power3.out',
    scrollTrigger: { trigger: '.contact-hero', start: 'top 78%', once: true }
  });

  gsap.from('.field, .submit-button, .contact-detail', {
    y: 18,
    opacity: 0,
    stagger: .07,
    duration: .7,
    ease: 'power2.out',
    scrollTrigger: { trigger: '.contact-layout', start: 'top 82%', once: true }
  });

  // ---------- Hero pointer parallax: image moves, panel stays fixed ----------
  const hero = document.querySelector('.hero-panel');
  const heroCopy = document.querySelector('.hero-copy');
  if (hero && window.matchMedia('(pointer: fine)').matches) {
    hero.addEventListener('pointermove', event => {
      if (hero.classList.contains('is-turning') || hero.classList.contains('is-grabbing')) return;
      const rect = hero.getBoundingClientRect();
      const px = (event.clientX - rect.left) / rect.width - .5;
      const py = (event.clientY - rect.top) / rect.height - .5;
      const activeImage = hero.querySelector('.hero-slide.is-active img');
      if (activeImage) {
        gsap.to(activeImage, { x: px * 12, y: py * 10, duration: 1.15, ease: 'power2.out', overwrite: 'auto' });
      }
      if (heroCopy) {
        gsap.to(heroCopy, { x: px * -3, y: py * -2, duration: 1.2, ease: 'power2.out', overwrite: 'auto' });
      }
    });

    hero.addEventListener('pointerleave', () => {
      gsap.to('.hero-slide.is-active img', { x: 0, y: 0, duration: 1.2, ease: 'power3.out' });
      gsap.to(heroCopy, { x: 0, y: 0, duration: 1.2, ease: 'power3.out' });
    });
  }

  // ---------- Magnetic controls ----------
  if (window.matchMedia('(pointer: fine)').matches) {
    document.querySelectorAll('.magnetic').forEach(element => {
      element.addEventListener('pointermove', event => {
        const rect = element.getBoundingClientRect();
        const x = event.clientX - rect.left - rect.width / 2;
        const y = event.clientY - rect.top - rect.height / 2;
        gsap.to(element, { x: x * .12, y: y * .12, duration: .35, ease: 'power2.out' });
      });
      element.addEventListener('pointerleave', () => {
        gsap.to(element, { x: 0, y: 0, duration: .55, ease: 'elastic.out(1,.45)' });
      });
    });
  }

  // ---------- Contextual cursor ----------
  const cursor = document.getElementById('cursor');
  if (cursor && window.matchMedia('(pointer: fine) and (min-width: 901px)').matches) {
    const label = cursor.querySelector('.cursor-label');
    const moveX = gsap.quickTo(cursor, 'x', { duration: .18, ease: 'power3.out' });
    const moveY = gsap.quickTo(cursor, 'y', { duration: .18, ease: 'power3.out' });

    window.addEventListener('pointermove', event => {
      cursor.classList.add('is-visible');
      moveX(event.clientX);
      moveY(event.clientY);
    });

    document.documentElement.addEventListener('mouseleave', () => cursor.classList.remove('is-visible'));

    // Delegated so cards re-rendered by the Selected Work filters keep their
    // contextual cursor state.
    let cursorTarget = null;
    document.addEventListener('pointerover', event => {
      const target = event.target.closest?.('[data-cursor-text]') || null;
      if (target === cursorTarget) return;
      cursorTarget = target;
      cursor.classList.toggle('is-expanded', Boolean(target));
      if (label) label.textContent = target ? (target.dataset.cursorText || 'VIEW') : '';
    });
  }

  window.addEventListener('load', () => ScrollTrigger.refresh());
  document.fonts?.ready?.then(() => ScrollTrigger.refresh());
})();
