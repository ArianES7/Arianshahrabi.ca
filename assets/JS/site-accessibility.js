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

  window.addEventListener('DOMContentLoaded', () => {
    syncAppearanceControls();

    const observer = new MutationObserver(syncAppearanceControls);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  });
})();
