export function createWhatsNewDialog({
  releases,
  force = false,
  canOpen = () => true,
  onBeforeOpen = () => {},
  onAfterClose = () => {},
  storage = window.localStorage
} = {}) {
  const button = document.getElementById('whats-new-btn');
  const badge = document.getElementById('whats-new-badge');
  const panel = document.getElementById('whats-new-panel');
  const current = document.getElementById('whats-new-current');
  const releaseList = document.getElementById('whats-new-releases');
  const closeButton = document.getElementById('whats-new-close');
  const currentReleaseId = releases?.[0]?.id;
  const seenKey = 'snake_whats_new_seen';

  function hasSeenCurrentRelease() {
    try { return storage.getItem(seenKey) === currentReleaseId; }
    catch { return false; }
  }

  function markCurrentReleaseSeen() {
    try { storage.setItem(seenKey, currentReleaseId); } catch {}
    if (badge) badge.hidden = true;
  }

  function createReleaseSection(release) {
    const section = document.createElement('section');
    section.className = 'whats-new-release';
    const heading = document.createElement('h3');
    heading.textContent = release.title;
    const meta = document.createElement('div');
    meta.className = 'whats-new-release-meta';
    meta.textContent = release.version;
    const list = document.createElement('ul');
    release.items.forEach(item => {
      const entry = document.createElement('li');
      entry.textContent = item;
      list.appendChild(entry);
    });
    section.append(heading, meta, list);
    return section;
  }

  function render() {
    const latest = releases?.[0];
    if (!latest || !current || !releaseList) return;
    current.textContent = `Latest release • ${latest.version}`;
    releaseList.replaceChildren(createReleaseSection(latest));
    const older = releases.slice(1);
    if (!older.length) return;

    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.setAttribute('aria-expanded', 'false');
    toggle.textContent = `View Older Updates (${older.length})`;
    const archive = document.createElement('div');
    archive.className = 'whats-new-archive';
    archive.hidden = true;
    older.forEach(release => {
      const entry = document.createElement('details');
      const summary = document.createElement('summary');
      const date = document.createElement('time');
      date.dateTime = release.id.slice(0, 10);
      date.textContent = release.version.replace(/^Update\s+/i, '');
      const title = document.createElement('span');
      title.textContent = release.title;
      summary.append(date, title);
      entry.append(summary, createReleaseSection(release));
      archive.appendChild(entry);
    });
    toggle.addEventListener('click', () => {
      const expanded = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', String(!expanded));
      toggle.textContent = expanded ? `View Older Updates (${older.length})` : 'Hide Older Updates';
      archive.hidden = expanded;
    });
    releaseList.append(toggle, archive);
  }

  function open({ suppressDisplayNameInvite = false } = {}) {
    if (!panel || !canOpen()) return false;
    onBeforeOpen({ suppressDisplayNameInvite });
    render();
    panel.classList.add('visible');
    panel.setAttribute('aria-hidden', 'false');
    closeButton?.focus();
    return true;
  }

  function close({ restoreFocus = true } = {}) {
    if (!panel) return;
    markCurrentReleaseSeen();
    panel.classList.remove('visible');
    panel.setAttribute('aria-hidden', 'true');
    onAfterClose();
    if (restoreFocus) button?.focus();
  }

  function bind() {
    if (badge) badge.hidden = !force && hasSeenCurrentRelease();
    button?.addEventListener('click', () => open());
    closeButton?.addEventListener('click', () => close());
    panel?.addEventListener('click', event => { if (event.target === panel) close(); });
    panel?.addEventListener('keydown', event => { if (event.key === 'Escape') close(); });
  }

  function scheduleInitialOpen(delay = 350) {
    setTimeout(() => {
      if (force || !hasSeenCurrentRelease()) open({ suppressDisplayNameInvite: true });
      else onAfterClose();
    }, delay);
  }

  return { bind, close, hasSeenCurrentRelease, open, scheduleInitialOpen };
}
