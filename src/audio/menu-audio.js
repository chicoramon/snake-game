const DEFAULT_AUDIO_URL = 'assets/audio/snake-arcade-intro-96.mp3';
const DEFAULT_VOLUME = 0.32;

export function createMenuAudio({
  audioUrl = DEFAULT_AUDIO_URL,
  volume = DEFAULT_VOLUME,
  AudioClass = globalThis.Audio
} = {}) {
  let audio = null;
  let active = false;
  let unlocked = false;
  let muted = false;
  let playPromise = null;

  function ensureAudio() {
    if (audio || !AudioClass) return audio;
    audio = new AudioClass(audioUrl);
    audio.preload = 'auto';
    audio.loop = true;
    audio.playsInline = true;
    audio.volume = volume;
    audio.muted = muted;
    audio.addEventListener?.('error', () => {
      console.warn('Menu music could not be loaded.');
    });
    return audio;
  }

  function play() {
    const player = ensureAudio();
    if (!player || !active || !unlocked || muted || document.hidden) {
      return Promise.resolve(false);
    }
    if (!player.paused) return Promise.resolve(true);
    if (playPromise) return playPromise;

    try {
      const result = player.play();
      playPromise = Promise.resolve(result)
        .then(() => true)
        .catch(() => false)
        .finally(() => { playPromise = null; });
      return playPromise;
    } catch {
      return Promise.resolve(false);
    }
  }

  function open({ startNow = false } = {}) {
    active = true;
    ensureAudio();
    if (startNow) unlocked = true;
    return play();
  }

  function unlock() {
    unlocked = true;
    return play();
  }

  function close({ reset = false } = {}) {
    active = false;
    if (!audio) return;
    audio.pause();
    if (reset) {
      try { audio.currentTime = 0; } catch {}
    }
  }

  function setMuted(value) {
    muted = Boolean(value);
    if (audio) audio.muted = muted;
    if (muted) {
      audio?.pause();
      return;
    }
    play();
  }

  document.addEventListener('visibilitychange', () => {
    if (!audio) return;
    if (document.hidden) audio.pause();
    else play();
  });
  window.addEventListener('pageshow', () => { play(); });

  return {
    close,
    open,
    setMuted,
    unlock,
    get active() { return active; },
    get muted() { return muted; }
  };
}
