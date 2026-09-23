(() => {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- Hero book / manual-page slider ----------
  const hero = document.querySelector('.hero-panel');
  const slider = document.getElementById('heroBook');
  const slides = Array.from(document.querySelectorAll('.hero-slide'));
  const dots = Array.from(document.querySelectorAll('.hero-dot'));
  const currentLabel = document.getElementById('heroCurrent');
  const slideStatus = document.getElementById('heroSlideStatus');
  const previousButton = document.getElementById('heroPrev');
  const nextButton = document.getElementById('heroNext');

  let current = Math.max(0, slides.findIndex(slide => slide.classList.contains('is-active')));
  let heroTimer = null;
  let isTurning = false;
  let pointerStartX = null;
  let pointerStartY = null;
  let pointerId = null;
  const autoplayDelay = 6500;
  const canAnimatePages = !reducedMotion && typeof Element !== 'undefined' && typeof Element.prototype.animate === 'function';

  function wrap(index) {
    if (!slides.length) return 0;
    return (index + slides.length) % slides.length;
  }

  function pageDepth(index, from = current) {
    return wrap(index - from);
  }

  function stackState(index, from = current) {
    const depth = Math.min(pageDepth(index, from), 4);
    return {
      zIndex: 30 - depth,
      x: depth * 5,
      y: depth * 4,
      scale: 1 - depth * 0.006,
      opacity: 1 - depth * 0.055
    };
  }

  function stackTransform(state) {
    return `translate3d(${state.x}px, ${state.y}px, 0) scale(${state.scale}) rotateY(0deg)`;
  }

  function applyStackState(slide, state) {
    slide.style.zIndex = String(state.zIndex);
    slide.style.opacity = String(state.opacity);
    slide.style.filter = 'brightness(1)';
    slide.style.transformOrigin = '0% 50%';
    slide.style.transform = stackTransform(state);
  }

  function resetImage(image) {
    if (!image) return;
    image.getAnimations?.().forEach(animation => animation.cancel());
    image.style.transform = 'translate3d(0,0,0) scale(1.02)';
  }

  function setSlideAccessibility(activeIndex) {
    slides.forEach((slide, index) => {
      const active = index === activeIndex;
      slide.classList.toggle('is-active', active);
      slide.setAttribute('aria-hidden', active ? 'false' : 'true');
    });

    dots.forEach((dot, index) => {
      const active = index === activeIndex;
      dot.classList.toggle('is-active', active);
      dot.setAttribute('aria-current', active ? 'true' : 'false');
    });

    if (currentLabel) currentLabel.textContent = String(activeIndex + 1).padStart(2, '0');
    if (slideStatus) slideStatus.textContent = `Hero page ${activeIndex + 1} of ${slides.length}`;
  }

  function restartDot(index) {
    dots.forEach((dot, dotIndex) => {
      dot.classList.toggle('is-active', dotIndex === index);
      dot.setAttribute('aria-current', dotIndex === index ? 'true' : 'false');
      const bar = dot.querySelector('span');
      if (!bar) return;
      bar.style.animation = 'none';
      void bar.offsetWidth;
      bar.style.animation = '';
    });
  }

  function arrangeStack() {
    slides.forEach((slide, index) => {
      slide.getAnimations?.().forEach(animation => animation.cancel());
      slide.classList.remove('is-turning-out', 'is-turning-in');
      applyStackState(slide, stackState(index));
      resetImage(slide.querySelector('img'));
    });
    slider?.classList.add('is-book-ready');
  }

  function finishTurn(normalized) {
    current = normalized;
    isTurning = false;
    hero?.classList.remove('is-turning');
    setSlideAccessibility(current);
    restartDot(current);
    arrangeStack();
  }

  function animatePage(element, keyframes, options) {
    const animation = element.animate(keyframes, { fill: 'forwards', ...options });
    return animation.finished.catch(() => undefined);
  }

  async function turnForward(normalized) {
    const outgoing = slides[current];
    const incoming = slides[normalized];
    const outgoingImage = outgoing.querySelector('img');
    const incomingImage = incoming.querySelector('img');

    isTurning = true;
    hero?.classList.add('is-turning');
    outgoing.classList.add('is-turning-out');
    incoming.classList.add('is-turning-in');

    outgoing.style.zIndex = '42';
    incoming.style.zIndex = '39';
    incoming.style.opacity = '1';
    incoming.style.filter = 'brightness(.82)';
    incoming.style.transform = 'translate3d(8px, 6px, 0) scale(.988) rotateY(0deg)';

    const easing = 'cubic-bezier(.77, 0, .175, 1)';
    const settle = 'cubic-bezier(.22, 1, .36, 1)';

    await Promise.all([
      animatePage(outgoing, [
        { transform: 'translate3d(0,0,0) scale(1) rotateY(0deg)', opacity: 1, offset: 0 },
        { transform: 'translate3d(-1.5%,0,0) scale(.997) rotateY(-24deg)', opacity: .98, offset: .34 },
        { transform: 'translate3d(-5%,0,0) scale(.993) rotateY(-58deg)', opacity: .58, offset: .72 },
        { transform: 'translate3d(-8%,0,0) scale(.992) rotateY(-76deg)', opacity: .06, offset: 1 }
      ], { duration: 1080, easing }),
      animatePage(incoming, [
        { transform: 'translate3d(8px,6px,0) scale(.988)', filter: 'brightness(.82)' },
        { transform: 'translate3d(2px,2px,0) scale(.997)', filter: 'brightness(.94)', offset: .62 },
        { transform: 'translate3d(0,0,0) scale(1)', filter: 'brightness(1)' }
      ], { duration: 1020, easing: settle }),
      outgoingImage ? animatePage(outgoingImage, [
        { transform: 'translate3d(0,0,0) scale(1.02)' },
        { transform: 'translate3d(2.8%,0,0) scale(1.075)' }
      ], { duration: 1120, easing: settle }) : Promise.resolve(),
      incomingImage ? animatePage(incomingImage, [
        { transform: 'translate3d(-1.2%,0,0) scale(1.055)' },
        { transform: 'translate3d(0,0,0) scale(1.02)' }
      ], { duration: 1220, easing: settle }) : Promise.resolve()
    ]);

    finishTurn(normalized);
  }

  async function turnBackward(normalized) {
    const outgoing = slides[current];
    const incoming = slides[normalized];
    const outgoingImage = outgoing.querySelector('img');
    const incomingImage = incoming.querySelector('img');

    isTurning = true;
    hero?.classList.add('is-turning');
    outgoing.classList.add('is-turning-in');
    incoming.classList.add('is-turning-out');

    outgoing.style.zIndex = '39';
    incoming.style.zIndex = '42';
    incoming.style.opacity = '.08';
    incoming.style.filter = 'brightness(.88)';
    incoming.style.transform = 'translate3d(-8%,0,0) scale(.992) rotateY(-76deg)';

    const easing = 'cubic-bezier(.77, 0, .175, 1)';
    const settle = 'cubic-bezier(.22, 1, .36, 1)';

    await Promise.all([
      animatePage(outgoing, [
        { transform: 'translate3d(0,0,0) scale(1)', filter: 'brightness(1)' },
        { transform: 'translate3d(8px,6px,0) scale(.988)', filter: 'brightness(.83)' }
      ], { duration: 960, easing: settle }),
      animatePage(incoming, [
        { transform: 'translate3d(-8%,0,0) scale(.992) rotateY(-76deg)', opacity: .08, offset: 0 },
        { transform: 'translate3d(-5%,0,0) scale(.994) rotateY(-54deg)', opacity: .58, offset: .3 },
        { transform: 'translate3d(-1%,0,0) scale(.998) rotateY(-18deg)', opacity: .96, offset: .72 },
        { transform: 'translate3d(0,0,0) scale(1) rotateY(0deg)', opacity: 1, offset: 1 }
      ], { duration: 1080, easing }),
      outgoingImage ? animatePage(outgoingImage, [
        { transform: 'translate3d(0,0,0) scale(1.02)' },
        { transform: 'translate3d(-.8%,0,0) scale(1.045)' }
      ], { duration: 1050, easing: settle }) : Promise.resolve(),
      incomingImage ? animatePage(incomingImage, [
        { transform: 'translate3d(2.5%,0,0) scale(1.065)' },
        { transform: 'translate3d(0,0,0) scale(1.02)' }
      ], { duration: 1180, easing: settle }) : Promise.resolve()
    ]);

    finishTurn(normalized);
  }

  function directionTo(targetIndex) {
    const forwardDistance = wrap(targetIndex - current);
    const backwardDistance = wrap(current - targetIndex);
    return forwardDistance <= backwardDistance ? 1 : -1;
  }

  function showSlide(nextIndex, directionHint = 0) {
    if (!slides.length || isTurning) return;
    const normalized = wrap(nextIndex);
    if (normalized === current) return;

    const direction = directionHint || directionTo(normalized);
    if (currentLabel) currentLabel.textContent = String(normalized + 1).padStart(2, '0');
    restartDot(normalized);

    if (!canAnimatePages) {
      current = normalized;
      setSlideAccessibility(current);
      arrangeStack();
      return;
    }

    if (direction > 0) void turnForward(normalized);
    else void turnBackward(normalized);
  }

  function nextSlide() { showSlide(current + 1, 1); }
  function previousSlide() { showSlide(current - 1, -1); }

  function stopHeroAutoplay() {
    clearTimeout(heroTimer);
    heroTimer = null;
  }

  function startHeroAutoplay() {
    stopHeroAutoplay();
    if (slides.length > 1 && !document.hidden) {
      heroTimer = window.setTimeout(() => {
        nextSlide();
        startHeroAutoplay();
      }, autoplayDelay);
    }
  }

  function resetHeroAutoplay() { startHeroAutoplay(); }

  dots.forEach((dot, index) => {
    dot.addEventListener('click', () => {
      showSlide(index);
      resetHeroAutoplay();
    });
  });

  previousButton?.addEventListener('click', () => {
    previousSlide();
    resetHeroAutoplay();
  });

  nextButton?.addEventListener('click', () => {
    nextSlide();
    resetHeroAutoplay();
  });

  // Swipe / drag threshold: horizontal gestures turn pages; vertical touch remains normal scrolling.
  hero?.addEventListener('pointerdown', event => {
    if (isTurning || event.button > 0 || event.target.closest('a, button, input, textarea, select')) return;
    pointerStartX = event.clientX;
    pointerStartY = event.clientY;
    pointerId = event.pointerId;
    hero.classList.add('is-grabbing');
    stopHeroAutoplay();
  });

  hero?.addEventListener('pointerup', event => {
    if (pointerId !== event.pointerId || pointerStartX === null || pointerStartY === null) return;
    const dx = event.clientX - pointerStartX;
    const dy = event.clientY - pointerStartY;
    pointerStartX = null;
    pointerStartY = null;
    pointerId = null;
    hero.classList.remove('is-grabbing');

    if (Math.abs(dx) > 54 && Math.abs(dx) > Math.abs(dy) * 1.2) {
      dx < 0 ? nextSlide() : previousSlide();
    }
    resetHeroAutoplay();
  });

  hero?.addEventListener('pointercancel', () => {
    pointerStartX = null;
    pointerStartY = null;
    pointerId = null;
    hero.classList.remove('is-grabbing');
    resetHeroAutoplay();
  });

  function lightboxIsOpen() {
    return Boolean(document.getElementById('lightbox')?.classList.contains('is-open'));
  }

  document.addEventListener('keydown', event => {
    if (!hero || lightboxIsOpen()) return;
    const rect = hero.getBoundingClientRect();
    const heroVisible = rect.bottom > 0 && rect.top < window.innerHeight * .72;
    if (!heroVisible) return;

    if (event.key === 'ArrowRight') {
      nextSlide();
      resetHeroAutoplay();
    } else if (event.key === 'ArrowLeft') {
      previousSlide();
      resetHeroAutoplay();
    }
  });

  document.addEventListener('visibilitychange', () => {
    document.hidden ? stopHeroAutoplay() : startHeroAutoplay();
  });

  hero?.addEventListener('mouseenter', stopHeroAutoplay);
  hero?.addEventListener('mouseleave', startHeroAutoplay);

  setSlideAccessibility(current);
  restartDot(current);
  arrangeStack();
  startHeroAutoplay();

  // ---------- Selected Work: Film / Photography tabs + category filters ----------
  // Every card is server-rendered once. Filtering moves the matching cards into
  // the grid (and the rest out of it) so the photography grid's nth-child
  // asymmetry always applies to what is visible. Interactions use delegation,
  // so re-inserted cards keep their cursor, lightbox and hover behaviour.
  const gallery = document.getElementById('galleryGrid');
  const workPanel = gallery?.closest('.work-panel');
  const workCount = document.getElementById('workCount');
  const workEmpty = document.getElementById('workEmpty');
  const allCards = gallery ? Array.from(gallery.querySelectorAll('.project-card')) : [];
  const workState = {
    media: gallery?.dataset.media || 'film',
    category: 'all'
  };

  function positionFilterIndicator(group) {
    if (!group || group.hidden) return;
    const indicator = group.querySelector('.filter-indicator');
    const active = group.querySelector('.filter-tab.is-active');
    if (!indicator || !active) return;
    indicator.style.left = `${active.offsetLeft}px`;
    indicator.style.width = `${active.offsetWidth}px`;
  }

  function setActiveButton(group, button) {
    group.querySelectorAll('.filter-tab').forEach(tab => {
      const active = tab === button;
      tab.classList.toggle('is-active', active);
      tab.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
    positionFilterIndicator(group);
  }

  function matchingCards() {
    return allCards.filter(card => card.dataset.media === workState.media
      && (workState.category === 'all' || card.dataset.categories.split(' ').includes(workState.category)));
  }

  function renderCards(cards) {
    cards.forEach((card, index) => {
      const label = card.querySelector('.project-index');
      if (label) label.textContent = String(index + 1).padStart(2, '0');
    });
    gallery.dataset.media = workState.media;
    gallery.replaceChildren(...cards);
    if (workEmpty) workEmpty.hidden = cards.length > 0;
    if (workCount) {
      const total = allCards.filter(card => card.dataset.media === workState.media).length;
      workCount.textContent = `${total} ${total === 1 ? 'project' : 'projects'}`;
    }
  }

  // animations.js listens for this to re-batch entrances and refresh
  // ScrollTrigger positions for the sections below (Team, Contact).
  function announceRender(cards) {
    document.dispatchEvent(new CustomEvent('octavisual:work-rendered', { detail: { cards } }));
    if (reducedMotion) window.ScrollTrigger?.refresh();
  }

  function applyWorkFilter({ animate = true } = {}) {
    if (!gallery) return;
    const next = matchingCards();

    if (!animate || !window.gsap || reducedMotion) {
      renderCards(next);
      announceRender(next);
      return;
    }

    const current = Array.from(gallery.children);
    gsap.killTweensOf(allCards);
    gsap.to(current, {
      opacity: 0,
      scale: 0.985,
      duration: 0.2,
      stagger: 0.012,
      ease: 'power2.in',
      onComplete: () => {
        gsap.set(current, { clearProps: 'opacity,transform' });
        renderCards(next);
        announceRender(next);
      }
    });
  }

  const mediaGroup = workPanel?.querySelector('[data-filter-group="media"]');
  const categoryGroups = workPanel ? Array.from(workPanel.querySelectorAll('[data-filter-group="category"]')) : [];

  mediaGroup?.addEventListener('click', event => {
    const button = event.target.closest('.filter-tab[data-media]');
    if (!button || button.dataset.media === workState.media) return;
    setActiveButton(mediaGroup, button);
    workState.media = button.dataset.media;
    workState.category = 'all';
    categoryGroups.forEach(group => {
      group.hidden = group.dataset.forMedia !== workState.media;
      const all = group.querySelector('[data-category="all"]');
      if (all) setActiveButton(group, all);
    });
    applyWorkFilter();
  });

  categoryGroups.forEach(group => {
    group.addEventListener('click', event => {
      const button = event.target.closest('.filter-tab[data-category]');
      if (!button || button.dataset.category === workState.category) return;
      setActiveButton(group, button);
      workState.category = button.dataset.category;
      applyWorkFilter();
    });
  });

  function positionAllIndicators() {
    [mediaGroup, ...categoryGroups].forEach(positionFilterIndicator);
  }

  applyWorkFilter({ animate: false });
  requestAnimationFrame(positionAllIndicators);
  document.fonts?.ready?.then(positionAllIndicators);
  window.addEventListener('resize', positionAllIndicators);

  // ---------- Team profile expansion ----------
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
      teamProfileImage.src = image.dataset.profileSrc || image.currentSrc || image.src;
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
        link.textContent = `${source.dataset.label || source.textContent.trim()} ↗`;
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
  });



  // ---------- Lightbox: photography images + YouTube films ----------
  // The YouTube iframe is only created when a film is opened and is removed on
  // close, which stops playback and keeps the page free of embeds until needed.
  const lightbox = document.getElementById('lightbox');
  const lightboxFigure = lightbox?.querySelector('figure');
  const lightboxImage = document.getElementById('lightboxImage');
  const lightboxVideo = document.getElementById('lightboxVideo');
  const lightboxCaption = document.getElementById('lightboxCaption');
  const lightboxClose = lightbox?.querySelector('.lightbox-close');
  const youtubeIdPattern = /^[A-Za-z0-9_-]{11}$/;
  let lightboxReturnFocus = null;

  function showLightbox(title, mode) {
    lightbox.classList.toggle('is-video', mode === 'video');
    lightbox.setAttribute('aria-label', title ? `${mode === 'video' ? 'Film' : 'Image'}: ${title}` : 'Media preview');
    if (lightboxCaption) lightboxCaption.textContent = title || '';
    lightboxReturnFocus = document.activeElement;
    lightbox.classList.add('is-open');
    lightbox.setAttribute('aria-hidden', 'false');
    document.body.classList.add('lightbox-open');
    window.__octaLenis?.stop?.();
    if (window.gsap && !reducedMotion) {
      gsap.fromTo(lightbox, { opacity: 0 }, { opacity: 1, duration: .35, ease: 'power2.out' });
      gsap.fromTo(lightboxFigure, { opacity: 0, scale: .97 }, { opacity: 1, scale: 1, duration: .55, ease: 'power3.out' });
    } else {
      lightbox.style.opacity = '1';
    }
    lightboxClose?.focus({ preventScroll: true });
  }

  function openImageLightbox(src, title, alt) {
    if (!lightbox || !lightboxImage || !src) return;
    if (lightboxVideo) {
      lightboxVideo.replaceChildren();
      lightboxVideo.hidden = true;
    }
    lightboxImage.hidden = false;
    lightboxImage.src = src;
    lightboxImage.alt = alt || title || 'Octavisual image preview';
    showLightbox(title, 'image');
  }

  function openVideoLightbox(youtubeId, title) {
    if (!lightbox || !lightboxVideo || !youtubeIdPattern.test(youtubeId || '')) return;
    const iframe = document.createElement('iframe');
    iframe.src = `https://www.youtube-nocookie.com/embed/${youtubeId}?autoplay=1&rel=0&modestbranding=1&playsinline=1`;
    iframe.title = title || 'Octavisual film';
    iframe.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
    iframe.allowFullscreen = true;
    iframe.referrerPolicy = 'strict-origin-when-cross-origin';
    if (lightboxImage) {
      lightboxImage.hidden = true;
      lightboxImage.removeAttribute('src');
    }
    lightboxVideo.replaceChildren(iframe);
    lightboxVideo.hidden = false;
    showLightbox(title, 'video');
  }

  function closeLightbox() {
    if (!lightbox?.classList.contains('is-open')) return;
    const finish = () => {
      lightbox.classList.remove('is-open', 'is-video');
      lightbox.setAttribute('aria-hidden', 'true');
      lightbox.style.opacity = '';
      document.body.classList.remove('lightbox-open');
      window.__octaLenis?.start?.();
      lightboxReturnFocus?.focus?.({ preventScroll: true });
      lightboxReturnFocus = null;
    };
    // Remove the iframe immediately so audio stops even during the fade.
    if (lightboxVideo) {
      lightboxVideo.replaceChildren();
      lightboxVideo.hidden = true;
    }
    if (window.gsap && !reducedMotion) gsap.to(lightbox, { opacity: 0, duration: .25, onComplete: finish });
    else finish();
  }

  document.addEventListener('click', event => {
    const imageTrigger = event.target.closest('.lightbox-trigger');
    if (imageTrigger) {
      openImageLightbox(imageTrigger.dataset.image, imageTrigger.dataset.title, imageTrigger.dataset.alt);
      return;
    }
    const videoTrigger = event.target.closest('.video-trigger');
    if (videoTrigger) openVideoLightbox(videoTrigger.dataset.youtubeId, videoTrigger.dataset.title);
  });

  lightboxClose?.addEventListener('click', closeLightbox);
  lightbox?.addEventListener('click', event => { if (event.target === lightbox) closeLightbox(); });
  document.addEventListener('keydown', event => {
    if (!lightbox?.classList.contains('is-open')) return;
    if (event.key === 'Escape') {
      closeLightbox();
    } else if (event.key === 'Tab' && !lightbox.classList.contains('is-video')) {
      // The close button is the only focusable control in image mode.
      event.preventDefault();
      lightboxClose?.focus();
    }
  });
})();
