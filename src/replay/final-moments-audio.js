const DEFAULT_TRACK_URL = 'assets/audio/final-moments-o-serpens.mp3';

function audioContextConstructor() {
  return globalThis.AudioContext || globalThis.webkitAudioContext || null;
}

export function createFinalMomentsAudio({ trackUrl = DEFAULT_TRACK_URL } = {}) {
  let context = null;
  let captureDestination = null;
  let outputGain = null;
  let musicGain = null;
  let effectsGain = null;
  let soundtrackBuffer = null;
  let soundtrackPromise = null;
  let soundtrackSource = null;
  let heartbeatNextAt = 0;
  let sonicDuckUntil = 0;

  function ensureContext() {
    if (context && context.state !== 'closed') return true;
    const Context = audioContextConstructor();
    if (!Context) return false;
    context = new Context();
    captureDestination = context.createMediaStreamDestination();
    outputGain = context.createGain();
    musicGain = context.createGain();
    effectsGain = context.createGain();
    outputGain.gain.value = 0.92;
    musicGain.gain.value = 0;
    effectsGain.gain.value = 0.9;
    musicGain.connect(outputGain);
    effectsGain.connect(outputGain);
    outputGain.connect(context.destination);
    outputGain.connect(captureDestination);
    return true;
  }

  async function prepare() {
    if (!ensureContext()) return false;
    if (soundtrackBuffer) return true;
    if (!soundtrackPromise) {
      soundtrackPromise = fetch(trackUrl)
        .then(response => {
          if (!response.ok) throw new Error(`Replay soundtrack failed to load (${response.status})`);
          return response.arrayBuffer();
        })
        .then(bytes => context.decodeAudioData(bytes))
        .then(buffer => {
          soundtrackBuffer = buffer;
          return true;
        })
        .catch(error => {
          console.warn('Final Moments soundtrack unavailable:', error);
          return false;
        });
    }
    return soundtrackPromise;
  }

  function stopSource() {
    if (!soundtrackSource) return;
    try { soundtrackSource.stop(); } catch {}
    soundtrackSource.disconnect();
    soundtrackSource = null;
  }

  function setMusicLevel(value, timeConstant = 0.06) {
    if (!context || !musicGain) return;
    const now = context.currentTime;
    musicGain.gain.cancelScheduledValues(now);
    musicGain.gain.setTargetAtTime(value, now, timeConstant);
  }

  async function start() {
    if (!ensureContext()) return null;
    await Promise.allSettled([prepare(), context.resume()]);
    stopSource();
    heartbeatNextAt = 0;
    sonicDuckUntil = 0;
    setMusicLevel(0);

    if (soundtrackBuffer) {
      const now = context.currentTime;
      soundtrackSource = context.createBufferSource();
      soundtrackSource.buffer = soundtrackBuffer;
      soundtrackSource.connect(musicGain);
      musicGain.gain.cancelScheduledValues(now);
      musicGain.gain.setValueAtTime(0.001, now);
      musicGain.gain.exponentialRampToValueAtTime(0.64, now + 0.32);
      // Let the full composition continue after the visual replay resolves.
      // The player owns its lifetime through Watch Again, Results, or Play Again.
      soundtrackSource.start(now, 0);
    }
    return captureDestination?.stream || null;
  }

  function scheduleHeartbeat(progress) {
    if (!context || !effectsGain) return;
    const now = context.currentTime;
    const pulse = (startAt, frequency, volume) => {
      const thump = context.createOscillator();
      const thumpGain = context.createGain();
      thump.type = 'sine';
      thump.frequency.setValueAtTime(frequency, startAt);
      thump.frequency.exponentialRampToValueAtTime(frequency * 0.68, startAt + 0.14);
      thumpGain.gain.setValueAtTime(volume, startAt);
      thumpGain.gain.exponentialRampToValueAtTime(0.001, startAt + 0.18);
      thump.connect(thumpGain); thumpGain.connect(effectsGain);
      thump.start(startAt); thump.stop(startAt + 0.19);

      const knock = context.createOscillator();
      const knockGain = context.createGain();
      knock.type = 'triangle';
      knock.frequency.setValueAtTime(frequency * 2.15, startAt);
      knock.frequency.exponentialRampToValueAtTime(frequency * 1.45, startAt + 0.075);
      knockGain.gain.setValueAtTime(volume * 0.34, startAt);
      knockGain.gain.exponentialRampToValueAtTime(0.001, startAt + 0.09);
      knock.connect(knockGain); knockGain.connect(effectsGain);
      knock.start(startAt); knock.stop(startAt + 0.1);
    };
    pulse(now, 96, 0.55);
    pulse(now + 0.19, 78, 0.42);
    heartbeatNextAt = now + (920 - progress * 470) / 1000;
  }

  function playSonicBoom() {
    if (!context || !effectsGain) return;
    const startAt = context.currentTime + 0.025;
    const duration = 0.42;
    const buffer = context.createBuffer(1, Math.ceil(context.sampleRate * duration), context.sampleRate);
    const samples = buffer.getChannelData(0);
    for (let index = 0; index < samples.length; index++) {
      const decay = Math.pow(1 - index / samples.length, 2.4);
      samples[index] = (Math.random() < 0.5 ? -1 : 1) * decay;
    }
    const noise = context.createBufferSource();
    const lowpass = context.createBiquadFilter();
    const noiseGain = context.createGain();
    noise.buffer = buffer;
    lowpass.type = 'lowpass';
    lowpass.frequency.setValueAtTime(2400, startAt);
    lowpass.frequency.exponentialRampToValueAtTime(180, startAt + duration);
    noiseGain.gain.setValueAtTime(0.52, startAt);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, startAt + duration);
    noise.connect(lowpass); lowpass.connect(noiseGain); noiseGain.connect(effectsGain);
    noise.start(startAt); noise.stop(startAt + duration);

    const sub = context.createOscillator();
    const subGain = context.createGain();
    sub.type = 'triangle';
    sub.frequency.setValueAtTime(150, startAt);
    sub.frequency.exponentialRampToValueAtTime(38, startAt + 0.58);
    subGain.gain.setValueAtTime(0.6, startAt);
    subGain.gain.exponentialRampToValueAtTime(0.001, startAt + 0.62);
    sub.connect(subGain); subGain.connect(effectsGain);
    sub.start(startAt); sub.stop(startAt + 0.64);

    const crack = context.createOscillator();
    const crackGain = context.createGain();
    crack.type = 'square';
    crack.frequency.setValueAtTime(920, startAt);
    crack.frequency.exponentialRampToValueAtTime(110, startAt + 0.115);
    crackGain.gain.setValueAtTime(0.18, startAt);
    crackGain.gain.exponentialRampToValueAtTime(0.001, startAt + 0.13);
    crack.connect(crackGain); crackGain.connect(effectsGain);
    crack.start(startAt); crack.stop(startAt + 0.14);
    sonicDuckUntil = context.currentTime + 0.78;
    setMusicLevel(0.045, 0.025);
  }

  function update({ recordHeartbeatProgress = null, sonicBoom = false } = {}) {
    if (!context || context.state !== 'running') return;
    const heartbeatProgress = Number.isFinite(recordHeartbeatProgress)
      ? Math.max(0, Math.min(1, Number(recordHeartbeatProgress)))
      : null;
    if (sonicBoom) playSonicBoom();
    if (heartbeatProgress !== null && context.currentTime >= heartbeatNextAt && context.currentTime >= sonicDuckUntil) {
      scheduleHeartbeat(heartbeatProgress);
    }
    const target = context.currentTime < sonicDuckUntil ? 0.045 : (heartbeatProgress === null ? 0.64 : 0.11);
    setMusicLevel(target);
  }

  function enterMenu() {
    heartbeatNextAt = Infinity;
    sonicDuckUntil = 0;
    setMusicLevel(0.38, 0.16);
  }

  function stop() {
    stopSource();
    heartbeatNextAt = 0;
    sonicDuckUntil = 0;
    setMusicLevel(0, 0.025);
  }

  prepare();
  return { prepare, start, update, enterMenu, stop };
}
