(() => {
  const wrapper = document.getElementById('search-wrapper');
  const input = document.getElementById('search-query');
  const output = document.getElementById('search-results');
  const closeButton = document.getElementById('close-search-button');
  const status = document.getElementById('search-status');
  const retryButton = document.getElementById('search-retry');
  const openButtons = [...document.querySelectorAll('#search-button, #search-button-mobile')];
  if (!wrapper || !input || !output || !closeButton || !status || !retryButton) return;

  let engine = null;
  let pending = null;
  let visible = false;
  let returnFocus = null;
  let previousOverflow = '';

  const setStatus = (message, failed = false) => {
    status.textContent = message;
    status.hidden = !message;
    retryButton.hidden = !failed;
  };
  const resultLinks = () => [...output.querySelectorAll('a[href]')];
  const addText = (parent, tag, className, text) => {
    const element = document.createElement(tag);
    element.className = className;
    element.textContent = text || '';
    parent.append(element);
    return element;
  };

  const runQuery = () => {
    if (!visible || !engine) return;
    output.replaceChildren();
    const term = input.value.trim();
    if (!term) {
      setStatus('');
      return;
    }
    const results = engine.search(term);
    setStatus(results.length ? '' : 'No matching pages found.');
    results.forEach(({ item }) => {
      const url = new URL(item.externalUrl || item.permalink, location.origin);
      if (!['https:', 'http:'].includes(url.protocol)) return;
      const li = document.createElement('li');
      li.className = 'mb-2';
      const link = document.createElement('a');
      link.className = 'flex items-center px-3 py-2 rounded-md appearance-none bg-neutral-100 dark:bg-neutral-700 focus:bg-primary-100 hover:bg-primary-100 dark:hover:bg-primary-900 dark:focus:bg-primary-900 focus:outline-dotted focus:outline-transparent focus:outline-2';
      link.href = url.href;
      if (item.externalUrl) {
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
      }
      const copy = document.createElement('div');
      copy.className = 'grow';
      addText(copy, 'div', '-mb-1 text-lg font-bold', item.title);
      addText(copy, 'div', 'text-sm text-neutral-500 dark:text-neutral-400', [item.section, item.date].filter(Boolean).join(' · '));
      addText(copy, 'div', 'text-sm', item.summary);
      link.append(copy);
      const arrow = addText(link, 'div', 'ml-2 text-neutral-500', '\u2192');
      arrow.setAttribute('aria-hidden', 'true');
      li.append(link);
      output.append(li);
    });
  };

  const loadIndex = () => {
    if (engine) return Promise.resolve();
    if (pending) return pending;
    setStatus('Loading search…');
    output.setAttribute('aria-busy', 'true');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    const url = new URL('index.json', wrapper.dataset.url);
    pending = fetch(url, { signal: controller.signal })
      .then(response => {
        if (!response.ok) throw new Error('Search index request failed');
        return response.json();
      })
      .then(data => {
        if (!Array.isArray(data)) throw new Error('Invalid search index');
        engine = new Fuse(data, {
          shouldSort: true,
          ignoreLocation: true,
          threshold: 0,
          // The case-study body is long; do not penalize matches for its length.
          ignoreFieldNorm: true,
          keys: [
            { name: 'title', weight: 0.8 },
            { name: 'section', weight: 0.2 },
            { name: 'summary', weight: 0.6 },
            { name: 'content', weight: 0.4 }
          ]
        });
        runQuery();
      })
      .catch(() => {
        if (visible) setStatus('Search could not load. Please try again.', true);
      })
      .finally(() => {
        clearTimeout(timeout);
        output.setAttribute('aria-busy', 'false');
        pending = null;
      });
    return pending;
  };

  const open = trigger => {
    if (visible) return;
    visible = true;
    returnFocus = trigger;
    previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    wrapper.style.visibility = 'visible';
    wrapper.setAttribute('aria-hidden', 'false');
    input.focus();
    if (engine) runQuery();
    else if (pending) setStatus('Loading search…');
    else loadIndex();
  };
  const close = () => {
    if (!visible) return;
    visible = false;
    wrapper.style.visibility = 'hidden';
    wrapper.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = previousOverflow;
    input.value = '';
    output.replaceChildren();
    setStatus('');
    const target = returnFocus?.isConnected && returnFocus.getClientRects().length
      ? returnFocus : openButtons.find(button => button.getClientRects().length);
    target?.focus();
    returnFocus = null;
  };

  openButtons.forEach(button => button.addEventListener('click', () => open(button)));
  closeButton.addEventListener('click', close);
  wrapper.addEventListener('click', event => {
    if (event.target === wrapper) close();
  });
  input.addEventListener('input', () => {
    if (engine) runQuery();
  });
  retryButton.addEventListener('click', () => {
    input.focus();
    loadIndex();
  });
  input.closest('form').addEventListener('submit', event => {
    event.preventDefault();
    resultLinks()[0]?.focus();
  });
  document.addEventListener('keydown', event => {
    const active = document.activeElement;
    if (!visible) {
      if (event.key === '/' && !event.ctrlKey && !event.metaKey && !event.altKey &&
          !active.closest('input, textarea, select, [contenteditable], [role="dialog"], dialog')) {
        event.preventDefault();
        open(active);
      }
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
      return;
    }
    if (event.key === 'Tab') {
      const focusable = [...wrapper.querySelectorAll('a[href], button, input')]
        .filter(element => !element.disabled && !element.hidden && element.getClientRects().length);
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (event.shiftKey && (active === first || !wrapper.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || !wrapper.contains(active))) {
        event.preventDefault();
        first.focus();
      }
      return;
    }
    const links = resultLinks();
    const position = links.indexOf(active);
    if (!links.length || (active !== input && position < 0)) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      links[Math.min(position + 1, links.length - 1)].focus();
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      (position <= 0 ? input : links[position - 1]).focus();
    }
  });
})();
