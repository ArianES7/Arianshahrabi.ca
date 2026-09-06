(() => {
  const syncAppearanceControls = () => {
    const isDark = document.documentElement.classList.contains('dark');
    const label = isDark ? 'Switch to light mode' : 'Switch to dark mode';
    document.querySelectorAll('#appearance-switcher, #appearance-switcher-mobile').forEach((button) => {
      button.setAttribute('aria-label', label);
      button.setAttribute('title', label);
      button.setAttribute('aria-pressed', String(isDark));
    });
  };

  const setupSearchDialog = () => {
    const wrapper = document.getElementById('search-wrapper');
    const closeButton = document.getElementById('close-search-button');
    const openButtons = Array.from(document.querySelectorAll('#search-button, #search-button-mobile'));
    if (!wrapper || !closeButton || !openButtons.length) return;

    let trigger = null;
    const isOpen = () => wrapper.getAttribute('aria-hidden') === 'false';
    const focusableElements = () => Array.from(wrapper.querySelectorAll(
      'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )).filter((element) => element.getClientRects().length > 0);

    const markOpen = (button) => {
      trigger = button;
      wrapper.setAttribute('aria-hidden', 'false');
    };

    const markClosed = () => {
      window.setTimeout(() => {
        wrapper.setAttribute('aria-hidden', 'true');
        if (trigger && document.contains(trigger) && typeof trigger.focus === 'function') trigger.focus();
      }, 0);
    };

    openButtons.forEach((button) => button.addEventListener('click', () => markOpen(button), true));
    closeButton.addEventListener('click', markClosed);
    wrapper.addEventListener('click', (event) => {
      if (event.target === wrapper) markClosed();
    });

    wrapper.addEventListener('keydown', (event) => {
      if (!isOpen() || event.key !== 'Tab') return;
      const focusable = focusableElements();
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
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === '/' && !isOpen()) trigger = document.activeElement;
      if (event.key === 'Escape' && isOpen()) markClosed();
    });

    const visibilityObserver = new MutationObserver(() => {
      const visible = wrapper.style.visibility === 'visible';
      wrapper.setAttribute('aria-hidden', String(!visible));
    });
    visibilityObserver.observe(wrapper, { attributes: true, attributeFilter: ['style'] });
  };

  window.addEventListener('DOMContentLoaded', () => {
    syncAppearanceControls();
    setupSearchDialog();

    const observer = new MutationObserver(syncAppearanceControls);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  });
})();
