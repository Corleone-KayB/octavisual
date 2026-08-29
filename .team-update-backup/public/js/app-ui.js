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

  // ---------- Portfolio segmented filters ----------
  const filterTabs = Array.from(document.querySelectorAll('.filter-tab'));
  const filterIndicator = document.querySelector('.filter-indicator');
  const gallery = document.getElementById('galleryGrid');
  const projectCards = gallery ? Array.from(gallery.querySelectorAll('.project-card')) : [];

  function positionFilterIndicator(activeButton) {
    if (!filterIndicator || !activeButton) return;
    filterIndicator.style.left = `${activeButton.offsetLeft}px`;
    filterIndicator.style.width = `${activeButton.offsetWidth}px`;
  }

  function filterProjects(filter) {
    if (!gallery) return;
    gallery.classList.toggle('is-filtered', filter !== 'all');

    if (window.gsap && !reducedMotion) {
      gsap.to(projectCards, {
        opacity: 0,
        scale: 0.985,
        duration: 0.22,
        stagger: 0.015,
        ease: 'power2.in',
        onComplete: () => {
          projectCards.forEach(card => {
            const visible = filter === 'all' || card.dataset.type === filter;
            card.classList.toggle('is-hidden', !visible);
          });
          const visibleCards = projectCards.filter(card => !card.classList.contains('is-hidden'));
          gsap.set(visibleCards, { opacity: 0, y: 20, scale: 0.985 });
          gsap.to(visibleCards, { opacity: 1, y: 0, scale: 1, duration: 0.55, stagger: 0.045, ease: 'power3.out' });
        }
      });
    } else {
      projectCards.forEach(card => {
        const visible = filter === 'all' || card.dataset.type === filter;
        card.classList.toggle('is-hidden', !visible);
      });
    }
  }

  filterTabs.forEach(button => {
    button.addEventListener('click', () => {
      filterTabs.forEach(tab => tab.classList.remove('is-active'));
      button.classList.add('is-active');
      positionFilterIndicator(button);
      filterProjects(button.dataset.filter);
    });
  });

  const initialFilter = document.querySelector('.filter-tab.is-active');
  requestAnimationFrame(() => positionFilterIndicator(initialFilter));
  window.addEventListener('resize', () => positionFilterIndicator(document.querySelector('.filter-tab.is-active')));

  // ---------- Team controlled carousel + quiet autoplay ----------
  const teamViewport = document.getElementById('teamViewport');
  const teamPrev = document.getElementById('teamPrev');
  const teamNext = document.getElementById('teamNext');
  let teamTimer = null;

  function teamStep() {
    if (!teamViewport) return 0;
    const card = teamViewport.querySelector('.team-card');
    const track = teamViewport.querySelector('.team-track');
    if (!card || !track) return 0;
    const gap = parseFloat(getComputedStyle(track).gap) || 0;
    return card.getBoundingClientRect().width + gap;
  }

  function scrollTeam(direction) {
    if (!teamViewport) return;
    const step = teamStep();
    const max = teamViewport.scrollWidth - teamViewport.clientWidth;
    if (direction > 0 && teamViewport.scrollLeft >= max - step * .35) {
      teamViewport.scrollTo({ left: 0, behavior: 'smooth' });
    } else if (direction < 0 && teamViewport.scrollLeft <= step * .35) {
      teamViewport.scrollTo({ left: max, behavior: 'smooth' });
    } else {
      teamViewport.scrollBy({ left: direction * step, behavior: 'smooth' });
    }
  }

  function startTeamAutoplay() {
    clearInterval(teamTimer);
    if (window.innerWidth > 760 && !reducedMotion) {
      teamTimer = setInterval(() => scrollTeam(1), 4800);
    }
  }

  teamPrev?.addEventListener('click', () => { scrollTeam(-1); startTeamAutoplay(); });
  teamNext?.addEventListener('click', () => { scrollTeam(1); startTeamAutoplay(); });
  teamViewport?.addEventListener('mouseenter', () => clearInterval(teamTimer));
  teamViewport?.addEventListener('mouseleave', startTeamAutoplay);
  teamViewport?.addEventListener('focusin', () => clearInterval(teamTimer));
  teamViewport?.addEventListener('focusout', startTeamAutoplay);
  window.addEventListener('resize', startTeamAutoplay);
  startTeamAutoplay();

  // ---------- Photography lightbox ----------
  const lightbox = document.getElementById('lightbox');
  const lightboxImage = document.getElementById('lightboxImage');
  const lightboxCaption = document.getElementById('lightboxCaption');
  const lightboxClose = document.querySelector('.lightbox-close');

  function openLightbox(src, title) {
    if (!lightbox || !lightboxImage) return;
    lightboxImage.src = src;
    lightboxImage.alt = title || 'Octavisual image preview';
    if (lightboxCaption) lightboxCaption.textContent = title || '';
    lightbox.classList.add('is-open');
    lightbox.setAttribute('aria-hidden', 'false');
    document.body.classList.add('lightbox-open');
    if (window.gsap && !reducedMotion) {
      gsap.fromTo(lightbox, { opacity: 0 }, { opacity: 1, duration: .35, ease: 'power2.out' });
      gsap.fromTo(lightbox.querySelector('figure'), { opacity: 0, scale: .97 }, { opacity: 1, scale: 1, duration: .55, ease: 'power3.out' });
    } else {
      lightbox.style.opacity = '1';
    }
  }

  function closeLightbox() {
    if (!lightbox) return;
    const finish = () => {
      lightbox.classList.remove('is-open');
      lightbox.setAttribute('aria-hidden', 'true');
      lightbox.style.opacity = '';
      document.body.classList.remove('lightbox-open');
    };
    if (window.gsap && !reducedMotion) gsap.to(lightbox, { opacity: 0, duration: .25, onComplete: finish });
    else finish();
  }

  document.querySelectorAll('.lightbox-trigger').forEach(trigger => {
    trigger.addEventListener('click', () => openLightbox(trigger.dataset.image, trigger.dataset.title));
  });
  lightboxClose?.addEventListener('click', closeLightbox);
  lightbox?.addEventListener('click', event => { if (event.target === lightbox) closeLightbox(); });
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && lightbox?.classList.contains('is-open')) closeLightbox(); });
})();
