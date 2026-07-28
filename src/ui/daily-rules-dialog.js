export function createDailyRulesDialog({ onBegin, onDismiss } = {}) {
  const dialog = document.getElementById('dailyRulesDialog');
  const beginButton = document.getElementById('dailyRulesBegin');
  const laterButton = document.getElementById('dailyRulesLater');
  const footnote = document.getElementById('dailyRulesFootnote');

  function show({ authoritative }) {
    footnote.textContent = authoritative
      ? 'Your ranked run is reserved after you press Begin, immediately before the countdown.'
      : 'Preview results remain on this device until ranked Daily Run is available.';
    dialog.classList.add('visible');
    dialog.setAttribute('aria-hidden', 'false');
    setTimeout(() => beginButton.focus(), 0);
  }

  function hide({ restoreFocus = false } = {}) {
    dialog.classList.remove('visible');
    dialog.setAttribute('aria-hidden', 'true');
    if (restoreFocus) document.getElementById('startBtn')?.focus();
  }

  function bind() {
    beginButton.addEventListener('click', () => onBegin?.());
    laterButton.addEventListener('click', () => onDismiss?.());
    dialog.addEventListener('keydown', event => {
      if (event.key === 'Escape') onDismiss?.();
    });
  }

  return { show, hide, bind };
}
