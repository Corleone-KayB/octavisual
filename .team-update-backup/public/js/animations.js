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
    const compactScaleX = window.matchMedia('(max-width: 760px)').matches ? .92 : .80;
    const compactScaleY = window.matchMedia('(max-width: 760px)').matches ? .84 : .72;
    const compactRadius = window.matchMedia('(max-width: 760px)').matches ? 24 : 34;
    const fullRadius = window.matchMedia('(max-width: 760px)').matches ? 12 : 8;
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
        scrub: 1.05,
        invalidateOnRefresh: true
      }
    });

    // Open from the centre.
    aboutTimeline
      .to(aboutFrame, {
        scaleX: 1,
        scaleY: 1,
        borderRadius: fullRadius,
        duration: 1
      }, 0)
      .to(aboutImage, {
        scale: 1.018,
        yPercent: 0,
        duration: 1.12
      }, 0)
      .to(aboutOverlay, {
        opacity: .82,
        duration: .9
      }, .08)
      .to(aboutHeader, {
        opacity: 1,
        duration: .46
      }, .34)
      .to(aboutCopy, {
        opacity: 1,
        y: 0,
        duration: .58
      }, .42)
      .to(aboutFootnote, {
        opacity: .72,
        y: 0,
        duration: .45
      }, .58)

      // Hold the full-frame chapter long enough to read it.
      .to(hold, {
        progress: 1,
        duration: 1.18
      }, 1.02)

      // Leave the chapter: copy softens first, then the photograph folds
      // visually back into the centre before Portfolio enters.
      .to(aboutCopy, {
        opacity: 0,
        y: -30,
        duration: .46
      }, 2.18)
      .to(aboutFootnote, {
        opacity: 0,
        y: -8,
        duration: .34
      }, 2.20)
      .to(aboutHeader, {
        opacity: .34,
        duration: .45
      }, 2.27)
      .to(aboutOverlay, {
        opacity: .96,
        duration: .75
      }, 2.34)
      .to(aboutFrame, {
        scaleX: compactScaleX,
        scaleY: compactScaleY,
        borderRadius: compactRadius,
        duration: 1
      }, 2.38)
      .to(aboutImage, {
        scale: 1.115,
        yPercent: 1.4,
        duration: 1
      }, 2.38);
  }

  // ---------- Portfolio cards ----------
  ScrollTrigger.batch('.project-card', {
    start: 'top 90%',
    once: true,
    onEnter: batch => gsap.from(batch, {
      y: 26,
      opacity: 0,
      scale: .99,
      stagger: .07,
      duration: .75,
      ease: 'power3.out',
      overwrite: true
    })
  });

  // ---------- Team cards ----------
  gsap.from('.team-card', {
    y: 28,
    opacity: 0,
    stagger: .08,
    duration: .85,
    ease: 'power3.out',
    scrollTrigger: { trigger: '.team-viewport', start: 'top 84%', once: true }
  });

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

    document.querySelectorAll('[data-cursor-text]').forEach(element => {
      element.addEventListener('mouseenter', () => {
        cursor.classList.add('is-expanded');
        if (label) label.textContent = element.dataset.cursorText || 'VIEW';
      });
      element.addEventListener('mouseleave', () => {
        cursor.classList.remove('is-expanded');
        if (label) label.textContent = '';
      });
    });
  }

  window.addEventListener('load', () => ScrollTrigger.refresh());
})();
