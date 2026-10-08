const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
const arrivalKey = 'icu-arrival';

function veil() {
  let element = document.querySelector('.route-glow');
  if (!element) {
    element = document.createElement('div');
    element.className = 'route-glow';
    element.setAttribute('aria-hidden', 'true');
    document.body.append(element);
  }
  return element;
}

export function revealArrival() {
  try {
    const arrival = JSON.parse(sessionStorage.getItem(arrivalKey) || 'null');
    sessionStorage.removeItem(arrivalKey);
    if (!arrival || arrival.path !== location.pathname || Date.now() - arrival.time > 10000 || reduced.matches) return;
    const element = veil();
    element.classList.add('is-covered');
    document.documentElement.classList.add('route-arriving');
    // Reveal independently of remote images or content loading.
    requestAnimationFrame(() => requestAnimationFrame(() => {
      element.classList.add('is-revealing');
      setTimeout(() => {
        element.className = 'route-glow';
        document.documentElement.classList.remove('route-arriving');
      }, 750);
    }));
  } catch { /* Navigation remains available without storage. */ }
}

export function initExperience() {
  let navigating = false;
  document.addEventListener('click', (event) => {
    const link = event.target.closest('a[data-route]');
    if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || link.target === '_blank') return;
    const destination = new URL(link.href);
    if (destination.origin !== location.origin || destination.pathname === location.pathname || reduced.matches) return;
    event.preventDefault();
    if (navigating) return;
    navigating = true;
    const rect = link.getBoundingClientRect();
    const element = veil();
    element.style.setProperty('--glow-x', (rect.left + rect.width / 2) + 'px');
    element.style.setProperty('--glow-y', (rect.top + rect.height / 2) + 'px');
    document.querySelectorAll('dialog[open]').forEach((dialog) => dialog.close());
    element.classList.add('is-leaving');
    document.documentElement.classList.add('route-leaving');
    try { sessionStorage.setItem(arrivalKey, JSON.stringify({ path: destination.pathname, time: Date.now() })); } catch { /* optional */ }
    setTimeout(() => location.assign(destination.href), 560);
  });
  window.addEventListener('pageshow', () => {
    navigating = false;
    document.querySelector('.route-glow')?.classList.remove('is-leaving', 'is-covered', 'is-revealing');
    document.documentElement.classList.remove('route-leaving');
  });

  const descent = document.querySelector('.cloud-descent');
  if (!descent) return;
  const hero = document.querySelector('.hero');
  const memories = document.querySelector('.universe-memories');
  let scheduled = false;
  function paint() {
    scheduled = false;
    const bounds = descent.getBoundingClientRect();
    const progress = Math.max(0, Math.min(1, (innerHeight - bounds.top) / (bounds.height + innerHeight * 0.15)));
    descent.style.setProperty('--fall', reduced.matches ? 0.55 : progress.toFixed(4));
    if (memories && hero) {
      const heroBounds = hero.getBoundingClientRect();
      const travel = Math.max(0, -heroBounds.top);
      // Let the photos recede before the band introduction reaches the sky.
      const fade = Math.max(0, 1 - travel / (heroBounds.height * .95));
      memories.style.setProperty('--memory-fade', fade.toFixed(3));
      memories.style.setProperty('--memory-scroll', (reduced.matches ? 0 : -Math.min(travel, heroBounds.height) * .25) + 'px');
    }
  }
  function schedule() {
    if (!scheduled) { scheduled = true; requestAnimationFrame(paint); }
  }
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule);
  reduced.addEventListener('change', schedule);
  paint();
}
