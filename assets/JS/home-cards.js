(() => {
  const demoReel = document.querySelector('[data-demo-reel]');
  const demoReelButton = demoReel?.querySelector('.demo-reel-play');
  const demoReelFrame = demoReel?.querySelector('iframe');

  if (demoReelButton && demoReelFrame) {
    demoReelButton.addEventListener('click', () => {
      demoReelFrame.src = demoReelFrame.dataset.src;
      demoReelFrame.hidden = false;
      demoReelButton.hidden = true;
      demoReelFrame.focus();
    }, { once: true });
  }

  const cards = Array.from(document.querySelectorAll('.project-card'));
  if (!cards.length) return;

  const visualLoadPromises = new WeakMap();

  const waitForImage = (image) => new Promise((resolve) => {
    const finish = () => {
      if (!image.naturalWidth || typeof image.decode !== 'function') {
        resolve();
        return;
      }

      image.decode().catch(() => {}).then(resolve);
    };

    if (image.complete) {
      finish();
      return;
    }

    image.addEventListener('load', finish, { once: true });
    image.addEventListener('error', resolve, { once: true });
  });

  const loadCardVisuals = (card) => {
    if (card.dataset.visualsLoaded === 'true') return Promise.resolve();
    if (visualLoadPromises.has(card)) return visualLoadPromises.get(card);

    card.querySelectorAll('source[data-srcset]').forEach((source) => {
      source.srcset = source.dataset.srcset;
      source.removeAttribute('data-srcset');
    });

    card.querySelectorAll('img[data-src]').forEach((image) => {
      if (image.dataset.srcset) {
        image.srcset = image.dataset.srcset;
        image.removeAttribute('data-srcset');
      }
      image.src = image.dataset.src;
      image.removeAttribute('data-src');
    });

    const images = Array.from(card.querySelectorAll('.project-card-visual img'));
    const loadPromise = Promise.all(images.map(waitForImage)).then(() => {
      card.dataset.visualsLoaded = 'true';
      card.classList.add('visuals-ready');
    });

    visualLoadPromises.set(card, loadPromise);
    return loadPromise;
  };

  cards.forEach((card) => {
    card.addEventListener('pointerenter', () => loadCardVisuals(card), { once: true });
    card.addEventListener('focusin', () => loadCardVisuals(card), { once: true });
  });

  if ('IntersectionObserver' in window) {
    const visualObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        loadCardVisuals(entry.target);
        visualObserver.unobserve(entry.target);
      });
    }, { threshold: 0.01, rootMargin: '0px 0px 80px' });

    cards.forEach((card) => visualObserver.observe(card));
  } else {
    cards.forEach(loadCardVisuals);
  }

  const touchContext = window.matchMedia('(hover: none), (pointer: coarse)');
  if (!touchContext.matches) return;

  let activeCard = null;
  let pendingCard = null;
  let activationTimer = null;
  let framePending = false;

  const measureCard = (card) => {
    const viewport = window.visualViewport;
    const top = viewport?.offsetTop || 0;
    const left = viewport?.offsetLeft || 0;
    const height = viewport?.height || window.innerHeight;
    const width = viewport?.width || window.innerWidth;
    const bounds = card.getBoundingClientRect();
    const visibleHeight = Math.max(0, Math.min(bounds.bottom, top + height) - Math.max(bounds.top, top));
    const visibleWidth = Math.max(0, Math.min(bounds.right, left + width) - Math.max(bounds.left, left));
    // A tall card should qualify when it fills the available viewport.
    const availableArea = Math.min(bounds.height, height) * Math.min(bounds.width, width);
    return {
      card,
      ratio: availableArea > 0 ? visibleHeight * visibleWidth / availableArea : 0,
      distance: Math.abs(bounds.top + bounds.height / 2 - (top + height / 2))
    };
  };

  const chooseCard = () => {
    const measurements = cards.map(measureCard);
    if (activeCard && measurements.find(({ card }) => card === activeCard).ratio > 0) return;
    if (activeCard) {
      activeCard.classList.remove('is-active');
      activeCard = null;
    }

    const candidate = measurements
      .filter(({ ratio }) => ratio >= 0.7)
      .sort((a, b) => {
        const ratioDifference = b.ratio - a.ratio;
        if (Math.abs(ratioDifference) > 0.05) return ratioDifference;
        return a.distance - b.distance;
      })[0]?.card;

    if (candidate === pendingCard) return;
    window.clearTimeout(activationTimer);
    pendingCard = candidate;
    if (!candidate) return;

    activationTimer = window.setTimeout(() => {
      pendingCard = null;
      if (measureCard(candidate).ratio < 0.7 || activeCard) return;
      activeCard = candidate;
      activeCard.classList.add('is-active');
    }, 160);
  };

  const scheduleSelection = () => {
    if (framePending) return;
    framePending = true;
    window.requestAnimationFrame(() => {
      framePending = false;
      chooseCard();
    });
  };

  window.addEventListener('scroll', scheduleSelection, { passive: true });
  window.addEventListener('resize', scheduleSelection);
  window.visualViewport?.addEventListener('resize', scheduleSelection);
  window.visualViewport?.addEventListener('scroll', scheduleSelection, { passive: true });
  if ('ResizeObserver' in window) {
    const sizeObserver = new ResizeObserver(scheduleSelection);
    cards.forEach((card) => sizeObserver.observe(card));
  }
  scheduleSelection();
})();
