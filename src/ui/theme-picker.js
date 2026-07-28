export function createThemePicker({
  themes,
  themeIconUrls,
  drawFoodSprite,
  onThemeSelected,
  onRandomSelected,
  onModeSelected
} = {}) {
  const optionsButton = document.getElementById('options-btn');
  const panel = document.getElementById('options-panel');
  const backButton = document.getElementById('options-back');
  const randomButton = document.getElementById('random-theme-btn');
  const themeButtons = [...document.querySelectorAll('.theme-btn[data-theme]')];
  const modeButtons = [...document.querySelectorAll('.game-mode-btn')];

  function renderIcons() {
    Object.keys(themes).forEach(key => {
      const host = document.getElementById(`ti-${key}`);
      if (!host) return;
      if (themeIconUrls[key]) {
        const image = document.createElement('img');
        image.src = themeIconUrls[key];
        image.style.cssText = 'width:48px;height:48px;image-rendering:pixelated';
        host.replaceChildren(image);
        return;
      }
      const canvas = document.createElement('canvas');
      canvas.width = 48;
      canvas.height = 48;
      drawFoodSprite(canvas.getContext('2d'), 24, 24, 48, themes[key], 1, key);
      host.replaceChildren(canvas);
    });
  }

  function setDailyThemeLock(locked) {
    if (randomButton) {
      randomButton.hidden = locked;
      randomButton.disabled = locked;
    }
    if (optionsButton) optionsButton.hidden = locked;
  }

  function bind() {
    optionsButton?.addEventListener('click', () => panel?.classList.add('visible'));
    backButton?.addEventListener('click', () => panel?.classList.remove('visible'));
    randomButton?.addEventListener('click', () => onRandomSelected?.());
    themeButtons.forEach(button => button.addEventListener('click', () => onThemeSelected?.(button.dataset.theme)));
    modeButtons.forEach(button => button.addEventListener('click', () => onModeSelected?.(button.dataset.gameMode)));
  }

  function syncModeSelection(mode) {
    modeButtons.forEach(button => {
      const selected = button.dataset.gameMode === mode;
      button.classList.toggle('active', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
    setDailyThemeLock(mode === 'daily');
  }

  function syncThemeSelection(selection) {
    themeButtons.forEach(button => button.classList.toggle('selected', selection !== 'random' && button.dataset.theme === selection));
    randomButton?.classList.toggle('selected', selection === 'random');
  }

  renderIcons();
  return { bind, syncModeSelection, syncThemeSelection, setDailyThemeLock };
}
