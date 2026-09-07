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

  const touchContext = window.matchMedia('(hover: none), (pointer: coarse)');
  if (!touchContext.matches || !('IntersectionObserver' in window)) return;

  const cards = Array.from(document.querySelectorAll('.project-card'));
  if (!cards.length) return;

  const ratios = new Map(cards.map((card) => [card, 0]));
  let activeCard = null;
  let activationTimer = null;

  const chooseCard = () => {
    if (activeCard && ratios.get(activeCard) > 0) return;
    if (activeCard) {
      activeCard.classList.remove('is-active');
      activeCard = null;
    }

    const candidate = cards
      .filter((card) => ratios.get(card) >= 0.7)
      .sort((a, b) => {
        const ratioDifference = ratios.get(b) - ratios.get(a);
        if (Math.abs(ratioDifference) > 0.05) return ratioDifference;
        const viewportCentre = window.innerHeight / 2;
        const aBounds = a.getBoundingClientRect();
        const bBounds = b.getBoundingClientRect();
        const aDistance = Math.abs(aBounds.top + aBounds.height / 2 - viewportCentre);
        const bDistance = Math.abs(bBounds.top + bBounds.height / 2 - viewportCentre);
        return aDistance - bDistance;
      })[0];

    window.clearTimeout(activationTimer);
    if (!candidate) return;

    activationTimer = window.setTimeout(() => {
      if (ratios.get(candidate) < 0.7 || activeCard) return;
      activeCard = candidate;
      activeCard.classList.add('is-active');
    }, 160);
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => ratios.set(entry.target, entry.intersectionRatio));
    chooseCard();
  }, {
    threshold: [0, 0.25, 0.5, 0.7, 0.85, 1],
    rootMargin: '0px'
  });

  cards.forEach((card) => observer.observe(card));
})();
