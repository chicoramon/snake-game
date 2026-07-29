export function createAudioEngine({ getCurrentTheme, isRunActive, isPaused, getSnakeLength }) {
  return (() => {
  let actx, master, musicGain, sfxGain;
  let running = false, muted = false;
  let step = 0, curBPM = 120;
  let stepAccum = 0, lastStepTime = 0;
  let seqRafId = null;
  let wakePromise = null;
  let heartbeatTimer = null;
  let heartbeatProgress = null;
  let nativeThemeAudio = null;
  let nativeThemeAudioUrl = '';
  let nativeAudioFailedUrl = '';
  let nativeMusicDuck = 1;
  let midiSong = null;
  let midiSongUrl = '';
  let midiLoadPromise = null;
  let midiLoadFailedUrl = '';
  let midiCursor = 0;
  let midiStartedAt = 0;
  let midiOffset = 0;
  const midiVoices = new Set();

  function getTheme() { return getCurrentTheme().music; }

  function applyNativeThemeVolume(music = getTheme()) {
    if (!nativeThemeAudio) return;
    nativeThemeAudio.volume = Math.max(
      0,
      Math.min(1, (music.audioGain || 1) * nativeMusicDuck)
    );
    nativeThemeAudio.muted = muted;
  }

  function stopNativeThemeAudio(resetPosition = true) {
    if (!nativeThemeAudio) return;
    nativeThemeAudio.pause();
    if (resetPosition) {
      try { nativeThemeAudio.currentTime = 0; } catch (error) {}
    }
  }

  function startNativeThemeAudio(music, resetPosition = true) {
    if (!music.audioUrl) return false;
    const url = music.audioUrl;
    nativeAudioFailedUrl = '';
    if (!nativeThemeAudio || nativeThemeAudioUrl !== url) {
      stopNativeThemeAudio(true);
      nativeThemeAudio = new Audio(url);
      nativeThemeAudioUrl = url;
      nativeThemeAudio.preload = 'auto';
      nativeThemeAudio.loop = true;
      nativeThemeAudio.playsInline = true;
      nativeThemeAudio.addEventListener('error', () => {
        if (nativeThemeAudioUrl !== url || !running) return;
        nativeAudioFailedUrl = url;
        console.error('Native theme audio failed to load; using MIDI fallback.');
        prepareMidiTheme(getTheme());
        startSeqTimer();
      });
    }
    if (resetPosition) {
      try { nativeThemeAudio.currentTime = 0; } catch (error) {}
    }
    applyNativeThemeVolume(music);

    const playPromise = nativeThemeAudio.play();
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch(error => {
        if (nativeThemeAudioUrl !== url || !running) return;
        nativeAudioFailedUrl = url;
        console.error('Unable to play native theme audio; using MIDI fallback:', error);
        prepareMidiTheme(music);
        startSeqTimer();
      });
    }
    return true;
  }

  function parseMidiFile(arrayBuffer) {
    const view = new DataView(arrayBuffer);
    let offset = 0;
    const readText = length => {
      let value = '';
      for (let i = 0; i < length; i++) value += String.fromCharCode(view.getUint8(offset++));
      return value;
    };
    const readU16 = () => { const value = view.getUint16(offset); offset += 2; return value; };
    const readU32 = () => { const value = view.getUint32(offset); offset += 4; return value; };
    const readVar = () => {
      let value = 0;
      let byte;
      do {
        byte = view.getUint8(offset++);
        value = (value << 7) | (byte & 0x7f);
      } while (byte & 0x80);
      return value;
    };

    if (readText(4) !== 'MThd') throw new Error('Invalid MIDI header');
    const headerLength = readU32();
    const headerEnd = offset + headerLength;
    readU16();
    const trackCount = readU16();
    const division = readU16();
    if (division & 0x8000) throw new Error('SMPTE MIDI timing is not supported');
    offset = headerEnd;

    const tempos = [{ tick: 0, micros: 500000 }];
    const rawNotes = [];
    let finalTick = 0;

    for (let track = 0; track < trackCount && offset < view.byteLength; track++) {
      if (readText(4) !== 'MTrk') throw new Error('Invalid MIDI track');
      const trackLength = readU32();
      const trackEnd = offset + trackLength;
      const programs = new Array(16).fill(0);
      const active = new Map();
      let tick = 0;
      let runningStatus = 0;

      while (offset < trackEnd) {
        tick += readVar();
        finalTick = Math.max(finalTick, tick);
        let status = view.getUint8(offset);
        if (status & 0x80) {
          offset++;
          runningStatus = status;
        } else {
          status = runningStatus;
        }

        if (status === 0xff) {
          const metaType = view.getUint8(offset++);
          const length = readVar();
          if (metaType === 0x51 && length === 3) {
            const micros = (view.getUint8(offset) << 16)
              | (view.getUint8(offset + 1) << 8)
              | view.getUint8(offset + 2);
            tempos.push({ tick, micros });
          }
          offset += length;
          runningStatus = 0;
          continue;
        }
        if (status === 0xf0 || status === 0xf7) {
          const length = readVar();
          offset += length;
          runningStatus = 0;
          continue;
        }

        const type = status & 0xf0;
        const channel = status & 0x0f;
        const data1 = view.getUint8(offset++);
        const data2 = type === 0xc0 || type === 0xd0 ? 0 : view.getUint8(offset++);

        if (type === 0xc0) {
          programs[channel] = data1;
          continue;
        }
        if (type !== 0x80 && type !== 0x90) continue;

        const key = `${channel}:${data1}`;
        if (type === 0x90 && data2 > 0) {
          const queue = active.get(key) || [];
          queue.push({
            tick,
            note: data1,
            velocity: data2,
            channel,
            program: programs[channel],
            track,
          });
          active.set(key, queue);
        } else {
          const queue = active.get(key);
          if (!queue || !queue.length) continue;
          const note = queue.shift();
          rawNotes.push({ ...note, endTick: Math.max(note.tick + 1, tick) });
        }
      }

      for (const queue of active.values()) {
        for (const note of queue) rawNotes.push({ ...note, endTick: Math.max(note.tick + 1, tick) });
      }
      offset = trackEnd;
    }

    const uniqueTempos = [...new Map(
      tempos.sort((a, b) => a.tick - b.tick).map(tempo => [tempo.tick, tempo])
    ).values()];
    let elapsed = 0;
    for (let i = 0; i < uniqueTempos.length; i++) {
      if (i > 0) {
        const previous = uniqueTempos[i - 1];
        elapsed += (uniqueTempos[i].tick - previous.tick) * previous.micros / division / 1000000;
      }
      uniqueTempos[i].seconds = elapsed;
    }

    const tickToSeconds = tick => {
      let tempo = uniqueTempos[0];
      for (let i = 1; i < uniqueTempos.length && uniqueTempos[i].tick <= tick; i++) {
        tempo = uniqueTempos[i];
      }
      return tempo.seconds + (tick - tempo.tick) * tempo.micros / division / 1000000;
    };

    const notes = rawNotes
      .map(note => {
        const start = tickToSeconds(note.tick);
        const end = tickToSeconds(note.endTick);
        return { ...note, start, duration: Math.max(0.025, end - start) };
      })
      .sort((a, b) => a.start - b.start || a.track - b.track);
    return {
      notes,
      duration: Math.max(tickToSeconds(finalTick), ...notes.map(note => note.start + note.duration)),
    };
  }

  function init() {
    if (actx && actx.state !== 'closed') return;
    stopSeqTimer();
    wakePromise = null;
    actx = null; master = null; musicGain = null; sfxGain = null;
    actx = new (window.AudioContext || window.webkitAudioContext)();
    master = actx.createGain();
    master.gain.value = 0.35;
    master.connect(actx.destination);
    musicGain = actx.createGain(); musicGain.gain.value = muted ? 0 : 1; musicGain.connect(master);
    sfxGain  = actx.createGain(); sfxGain.gain.value  = 1; sfxGain.connect(master);
    const context = actx;
    context.addEventListener('statechange', () => {
      if (context !== actx) return;
      if (context.state === 'running') {
        if (running && isRunActive() && !isPaused()) startSeqTimer();
      } else {
        // Mobile Safari may report "interrupted" as well as "suspended".
        stopSeqTimer();
      }
    });
  }

  function wake(forceRetry = false) {
    init();
    if (actx.state === 'running') {
      if (running && isRunActive() && !isPaused()) startSeqTimer();
      return Promise.resolve(true);
    }
    if (wakePromise && !forceRetry) return wakePromise;
    const context = actx;
    let resumeResult;
    try {
      // Call resume synchronously while a mobile user-activation is still live.
      resumeResult = context.resume();
    } catch (e) {
      return Promise.resolve(false);
    }
    const pending = Promise.resolve(resumeResult)
      .then(() => {
        if (context !== actx) return false;
        const awake = context.state === 'running';
        if (awake && running && isRunActive() && !isPaused()) startSeqTimer();
        return awake;
      })
      .catch(() => false);
    wakePromise = pending;
    pending.finally(() => { if (wakePromise === pending) wakePromise = null; });
    return pending;
  }

  function getIntensity(len, music = getTheme()) {
    const thresholds = music.intensityThresholds || [8, 16, 28];
    let intensity = len < thresholds[0] ? 0
      : len < thresholds[1] ? 1
      : len < thresholds[2] ? 2
      : 3;
    // Require musical time as well as score when a theme defines an arc.
    if (music.minStepsPerIntensity) {
      intensity = Math.min(intensity, Math.floor(step / music.minStepsPerIntensity));
    }
    return Math.max(0, Math.min(3, intensity));
  }

  function playNote(freq, duration, type, gainNode, vol) {
    if (!freq || freq === 0) return;
    const t = actx.currentTime;
    const osc = actx.createOscillator();
    const g   = actx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + duration);
    osc.connect(g); g.connect(gainNode);
    osc.start(t); osc.stop(t + duration);
  }

  function stopMidiVoices() {
    for (const oscillator of midiVoices) {
      try { oscillator.stop(); } catch (error) {}
    }
    midiVoices.clear();
  }

  function resetMidiPlayback(resetPosition = true) {
    stopMidiVoices();
    midiCursor = 0;
    midiStartedAt = actx ? actx.currentTime : 0;
    if (resetPosition) midiOffset = 0;
  }

  function findMidiCursor(seconds) {
    if (!midiSong) return 0;
    let low = 0;
    let high = midiSong.notes.length;
    while (low < high) {
      const middle = (low + high) >> 1;
      if (midiSong.notes[middle].start < seconds) low = middle + 1;
      else high = middle;
    }
    return low;
  }

  function prepareMidiTheme(music) {
    if (!music.midiUrl) return;
    const url = music.midiUrl;
    midiLoadFailedUrl = '';

    if (midiSong && midiSongUrl === url) {
      resetMidiPlayback(true);
      return;
    }
    if (midiLoadPromise && midiSongUrl === url) return;

    midiSong = null;
    midiSongUrl = url;
    midiLoadPromise = fetch(url, { cache: 'no-store' })
      .then(response => {
        if (!response.ok) throw new Error(`MIDI request failed: ${response.status}`);
        return response.arrayBuffer();
      })
      .then(buffer => {
        const song = parseMidiFile(buffer);
        if (midiSongUrl !== url) return;
        midiSong = song;
        midiLoadFailedUrl = '';
        resetMidiPlayback(true);
        if (running && getTheme().midiUrl === url && actx?.state === 'running') startSeqTimer();
      })
      .catch(error => {
        if (midiSongUrl !== url) return;
        midiLoadFailedUrl = url;
        console.error('Unable to load theme MIDI; using chiptune fallback:', error);
      })
      .finally(() => {
        if (midiSongUrl === url) midiLoadPromise = null;
      });
  }

  function scheduleMidiNote(note, when, music) {
    const isDrum = note.channel === 9;
    let frequency = 440 * Math.pow(2, (note.note - 69) / 12);
    let duration = Math.max(0.025, note.duration);
    let waveform = note.program >= 32 && note.program <= 39 ? 'triangle' : 'square';

    if (isDrum) {
      if (note.note === 35 || note.note === 36) frequency = 73.42;
      else if (note.note === 38 || note.note === 40) frequency = 196;
      else frequency = 1174.66;
      duration = Math.min(duration, note.note >= 42 ? 0.045 : 0.1);
      waveform = 'square';
    }

    const oscillator = actx.createOscillator();
    const gain = actx.createGain();
    const velocity = Math.max(0.08, note.velocity / 127);
    const peak = velocity * (isDrum ? 0.045 : 0.038) * (music.midiGain || 1);
    const releaseAt = when + Math.max(0.02, duration);

    oscillator.type = waveform;
    oscillator.frequency.setValueAtTime(frequency, when);
    gain.gain.setValueAtTime(0.001, when);
    gain.gain.linearRampToValueAtTime(peak, when + 0.006);
    gain.gain.setValueAtTime(peak * 0.78, Math.max(when + 0.007, releaseAt - 0.025));
    gain.gain.exponentialRampToValueAtTime(0.001, releaseAt);
    oscillator.connect(gain);
    gain.connect(musicGain);
    oscillator.addEventListener('ended', () => midiVoices.delete(oscillator), { once: true });
    midiVoices.add(oscillator);
    oscillator.start(when);
    oscillator.stop(releaseAt + 0.01);
  }

  function scheduleMidiPlayback(music) {
    if (!midiSong || midiSongUrl !== music.midiUrl || !midiSong.duration) return;
    let elapsed = actx.currentTime - midiStartedAt + midiOffset;

    if (elapsed >= midiSong.duration) {
      midiOffset = 0;
      midiCursor = 0;
      midiStartedAt = actx.currentTime;
      elapsed = 0;
    }

    const lookAhead = 0.12;
    while (
      midiCursor < midiSong.notes.length
      && midiSong.notes[midiCursor].start <= elapsed + lookAhead
    ) {
      const note = midiSong.notes[midiCursor++];
      const when = actx.currentTime + Math.max(0, note.start - elapsed);
      scheduleMidiNote(note, when, music);
    }
  }

  function captureMidiPosition() {
    const music = getTheme();
    if (!music.midiUrl || !midiSong || !midiStartedAt) return;
    midiOffset = (midiOffset + Math.max(0, actx.currentTime - midiStartedAt)) % midiSong.duration;
    midiCursor = findMidiCursor(midiOffset);
    midiStartedAt = actx.currentTime;
    stopMidiVoices();
  }

  function playKick() {
    const t = actx.currentTime;
    const osc = actx.createOscillator();
    const g = actx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.12);
    g.gain.setValueAtTime(0.6, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    osc.connect(g); g.connect(musicGain);
    osc.start(t); osc.stop(t + 0.15);
  }

  function playHihat() {
    const t = actx.currentTime;
    const bufLen = actx.sampleRate * 0.04;
    const buf = actx.createBuffer(1, bufLen, actx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / bufLen);
    const src = actx.createBufferSource(); src.buffer = buf;
    const hp = actx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 8000;
    const g = actx.createGain(); g.gain.setValueAtTime(0.15, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
    src.connect(hp); hp.connect(g); g.connect(musicGain);
    src.start(t);
  }

  function playSnare() {
    const t = actx.currentTime;
    // noise part
    const bufLen = actx.sampleRate * 0.08;
    const buf = actx.createBuffer(1, bufLen, actx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / bufLen);
    const src = actx.createBufferSource(); src.buffer = buf;
    const bp = actx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 3000;
    const g1 = actx.createGain(); g1.gain.setValueAtTime(0.3, t); g1.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    src.connect(bp); bp.connect(g1); g1.connect(musicGain);
    src.start(t);
    // tone part
    const osc = actx.createOscillator(); const g2 = actx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(200, t); osc.frequency.exponentialRampToValueAtTime(80, t + 0.06);
    g2.gain.setValueAtTime(0.25, t); g2.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
    osc.connect(g2); g2.connect(musicGain);
    osc.start(t); osc.stop(t + 0.08);
  }

  function playBlockClick(high = false) {
    const t = actx.currentTime;
    const osc = actx.createOscillator();
    const g = actx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(high ? 1320 : 760, t);
    osc.frequency.exponentialRampToValueAtTime(high ? 880 : 420, t + 0.045);
    g.gain.setValueAtTime(high ? 0.11 : 0.16, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    osc.connect(g); g.connect(musicGain);
    osc.start(t); osc.stop(t + 0.055);
  }

  function play8BitWarDrum(accent = false) {
    const t = actx.currentTime;
    const body = actx.createOscillator();
    const bodyGain = actx.createGain();
    body.type = 'triangle';
    body.frequency.setValueAtTime(accent ? 132 : 104, t);
    body.frequency.setValueAtTime(accent ? 92 : 76, t + 0.025);
    body.frequency.setValueAtTime(accent ? 58 : 48, t + 0.055);
    bodyGain.gain.setValueAtTime(accent ? 0.52 : 0.38, t);
    bodyGain.gain.exponentialRampToValueAtTime(0.001, t + (accent ? 0.2 : 0.15));
    body.connect(bodyGain); bodyGain.connect(musicGain);
    body.start(t); body.stop(t + (accent ? 0.21 : 0.16));

    const click = actx.createOscillator();
    const clickGain = actx.createGain();
    click.type = 'square';
    click.frequency.setValueAtTime(accent ? 220 : 164, t);
    clickGain.gain.setValueAtTime(accent ? 0.09 : 0.055, t);
    clickGain.gain.exponentialRampToValueAtTime(0.001, t + 0.035);
    click.connect(clickGain); clickGain.connect(musicGain);
    click.start(t); click.stop(t + 0.04);

    if (accent) {
      const noiseDuration = 0.085;
      const length = Math.floor(actx.sampleRate * noiseDuration);
      const buffer = actx.createBuffer(1, length, actx.sampleRate);
      const data = buffer.getChannelData(0);
      let held = 0;
      for (let i = 0; i < length; i++) {
        if (i % 32 === 0) held = Math.random() < 0.5 ? -1 : 1;
        data[i] = held * (1 - i / length);
      }
      const noise = actx.createBufferSource();
      const noiseGain = actx.createGain();
      noise.buffer = buffer;
      noiseGain.gain.setValueAtTime(0.09, t);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, t + noiseDuration);
      noise.connect(noiseGain); noiseGain.connect(musicGain);
      noise.start(t);
    }
  }

  function playArcadeRockHit(kind) {
    if (kind === 1) {
      playKick();
      return;
    }
    if (kind === 2) {
      playHihat();
      return;
    }

    // Tight square-wave tom layered with the existing noise snare gives the
    // Street Fighter suite a crunchy CPS-era rock backbeat.
    const t = actx.currentTime;
    const tom = actx.createOscillator();
    const tomGain = actx.createGain();
    tom.type = 'square';
    tom.frequency.setValueAtTime(196, t);
    tom.frequency.exponentialRampToValueAtTime(82.41, t + 0.09);
    tomGain.gain.setValueAtTime(0.13, t);
    tomGain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    tom.connect(tomGain); tomGain.connect(musicGain);
    tom.start(t); tom.stop(t + 0.11);
    playSnare();
  }

  function sequencer() {
    const m = getTheme();
    const intensity = getIntensity(getSnakeLength(), m);
    const channelValue = channel => channel[intensity][step % channel[intensity].length];
    const bLen = channelValue(m.bass);
    const mLen = channelValue(m.melody);
    const aLen = channelValue(m.arpeggio);
    const dVal = channelValue(m.drums);

    const beatDur = 60 / curBPM / 4;  // 16th note

    if (bLen) playNote(bLen, beatDur * 2.5, m.bassType, musicGain, m.bassVol);
    if (mLen) playNote(mLen, beatDur * 2, m.melodyType, musicGain, m.melodyVol);
    if (aLen) playNote(aLen, beatDur * 1.5, m.arpType, musicGain, m.arpVol);
    if (m.percussion === '8bit-war') {
      if (dVal === 1) play8BitWarDrum(false);
      else if (dVal === 2) playHihat();
      else if (dVal === 3) play8BitWarDrum(true);
    } else if (m.percussion === 'arcade-rock') {
      if (dVal) playArcadeRockHit(dVal);
    } else {
      if (dVal === 1) playKick();
      else if (dVal === 2) m.percussion === 'blocks' ? playBlockClick(true) : playHihat();
      else if (dVal === 3) m.percussion === 'blocks' ? playBlockClick(false) : playSnare();
    }

    step++;
  }

  // rAF-based sequencer timer — survives page backgrounding unlike setInterval
  function sequencerTick(now) {
    seqRafId = null;
    if (!running || !actx || actx.state !== 'running') return;
    if (!lastStepTime) lastStepTime = now;
    const rawDt = now - lastStepTime;
    lastStepTime = now;
    // Cap to avoid burst catch-up after long background
    const dt = Math.min(rawDt, 200);
    stepAccum += dt;
    const m = getTheme();
    if (m.audioUrl && nativeAudioFailedUrl !== m.audioUrl) {
      seqRafId = requestAnimationFrame(sequencerTick);
      return;
    }
    if (m.midiUrl && midiLoadFailedUrl !== m.midiUrl) {
      scheduleMidiPlayback(m);
      seqRafId = requestAnimationFrame(sequencerTick);
      return;
    }
    const swing = Math.max(0, Math.min(0.3, m.swing || 0));
    const baseStepInterval = 60000 / curBPM / 4;
    let stepInterval = baseStepInterval * (step % 2 === 0 ? 1 + swing : 1 - swing);
    let stepsThisFrame = 0;
    while (stepAccum >= stepInterval && stepsThisFrame < 4) {
      try {
        sequencer();
      } catch (error) {
        // A malformed sound event must never permanently kill the music loop.
        console.error('Audio sequencer event failed:', error);
        step++;
      }
      stepAccum -= stepInterval;
      stepInterval = baseStepInterval * (step % 2 === 0 ? 1 + swing : 1 - swing);
      stepsThisFrame++;
    }
    if (stepAccum > baseStepInterval * 4) stepAccum = 0;
    seqRafId = requestAnimationFrame(sequencerTick);
  }

  function startSeqTimer() {
    if (seqRafId || !running || !actx || actx.state !== 'running') return;
    lastStepTime = 0;
    stepAccum = 0;
    seqRafId = requestAnimationFrame(sequencerTick);
  }

  function stopSeqTimer() {
    if (seqRafId) { cancelAnimationFrame(seqRafId); seqRafId = null; }
    lastStepTime = 0;
    stepAccum = 0;
  }

  function updateTempo(len) {
    const m = getTheme();
    const growth = Math.max(0, len - 3);
    if (m.tempoGrowth) {
      const progress = Math.min(1, growth / m.tempoGrowth);
      const eased = progress * progress * (3 - 2 * progress);
      curBPM = m.baseBPM + (m.maxBPM - m.baseBPM) * eased;
    } else {
      curBPM = Math.min(m.maxBPM, m.baseBPM + growth * m.bpmPerLen);
    }
  }

  function setMusicDuck(value) {
    nativeMusicDuck = value;
    applyNativeThemeVolume();
    if (!musicGain || !actx) return;
    const now = actx.currentTime;
    musicGain.gain.cancelScheduledValues(now);
    musicGain.gain.setTargetAtTime(muted ? 0 : value, now, 0.08);
  }

  function clearHeartbeatTimer() {
    if (heartbeatTimer) clearTimeout(heartbeatTimer);
    heartbeatTimer = null;
  }

  function playHeartbeatPulse() {
    heartbeatTimer = null;
    if (heartbeatProgress === null || !isRunActive() || isPaused() || !actx || actx.state !== 'running') return;
    const now = actx.currentTime;
    const pulse = (start, frequency, volume) => {
      const thump = actx.createOscillator();
      const thumpGain = actx.createGain();
      thump.type = 'sine';
      thump.frequency.setValueAtTime(frequency, start);
      thump.frequency.exponentialRampToValueAtTime(frequency * 0.68, start + 0.14);
      thumpGain.gain.setValueAtTime(volume, start);
      thumpGain.gain.exponentialRampToValueAtTime(0.001, start + 0.18);
      thump.connect(thumpGain); thumpGain.connect(sfxGain);
      thump.start(start); thump.stop(start + 0.19);

      // A short harmonic makes the thump audible on small phone speakers,
      // which reproduce the low fundamental poorly.
      const knock = actx.createOscillator();
      const knockGain = actx.createGain();
      knock.type = 'triangle';
      knock.frequency.setValueAtTime(frequency * 2.15, start);
      knock.frequency.exponentialRampToValueAtTime(frequency * 1.45, start + 0.075);
      knockGain.gain.setValueAtTime(volume * 0.34, start);
      knockGain.gain.exponentialRampToValueAtTime(0.001, start + 0.09);
      knock.connect(knockGain); knockGain.connect(sfxGain);
      knock.start(start); knock.stop(start + 0.1);
    };
    pulse(now, 96, 0.55);
    pulse(now + 0.19, 78, 0.42);
    const delay = Math.round(920 - heartbeatProgress * 470);
    heartbeatTimer = setTimeout(playHeartbeatPulse, delay);
  }

  function setRecordHeartbeat(progress) {
    init();
    heartbeatProgress = Math.max(0, Math.min(1, progress));
    setMusicDuck(0.14);
    if (!heartbeatTimer && isRunActive() && !isPaused()) {
      wake();
      playHeartbeatPulse();
    }
  }

  function stopRecordHeartbeat() {
    heartbeatProgress = null;
    clearHeartbeatTimer();
    setMusicDuck(1);
  }

  function playScheduledTone(freq, start, duration, type, volume) {
    if (!freq) return;
    const osc = actx.createOscillator();
    const gain = actx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    gain.gain.setValueAtTime(volume, start);
    gain.gain.setValueAtTime(volume, Math.max(start, start + duration - 0.08));
    gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
    osc.connect(gain); gain.connect(sfxGain);
    osc.start(start); osc.stop(start + duration + 0.02);
  }

  function playRecordFanfare() {
    init();
    wake(true).then(awake => {
      if (!awake || !actx || actx.state !== 'running') return;
      const t = actx.currentTime + 0.04;
      const lead = [523.25,659.25,783.99,1046.5,783.99,987.77,1174.66,1318.51];
      lead.forEach((freq, index) => playScheduledTone(freq, t + index * 0.12, 0.2, 'square', 0.12));
      [[261.63,329.63,392],[349.23,440,523.25],[392,493.88,587.33],[523.25,659.25,783.99]].forEach((chord, index) => {
        const start = t + 1.1 + index * 0.38;
        const duration = index === 3 ? 1.15 : 0.28;
        chord.forEach(freq => playScheduledTone(freq, start, duration, 'square', index === 3 ? 0.075 : 0.065));
      });
      [130.81,174.61,196,261.63].forEach((freq, index) => playScheduledTone(freq, t + 1.1 + index * 0.38, index === 3 ? 1.15 : 0.3, 'triangle', 0.12));
    });
  }

  function start() {
    init();
    step = 0; running = true;
    const m = getTheme();
    curBPM = m.baseBPM;
    stopSeqTimer();
    resetMidiPlayback(true);
    nativeMusicDuck = 1;
    if (m.audioUrl) startNativeThemeAudio(m, true);
    else {
      stopNativeThemeAudio(true);
      if (m.midiUrl) prepareMidiTheme(m);
    }
    wake(true);
  }

  function stop() {
    running = false;
    stopRecordHeartbeat();
    stopSeqTimer();
    stopNativeThemeAudio(true);
    resetMidiPlayback(true);
  }

  function pause()  {
    stopNativeThemeAudio(false);
    captureMidiPosition();
    stopSeqTimer();
    clearHeartbeatTimer();
  }
  function resume() {
    if (!running) return;
    stopSeqTimer();
    const music = getTheme();
    if (music.audioUrl) startNativeThemeAudio(music, false);
    else if (music.midiUrl && actx) midiStartedAt = actx.currentTime;
    wake(true).then(() => {
      if (heartbeatProgress !== null) playHeartbeatPulse();
    });
  }

  // Background recovery is best-effort; the capture-phase gesture hooks are
  // the reliable path when iOS revokes Web Audio after a longer tab switch.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && actx) wake();
  });
  window.addEventListener('pageshow', () => { if (actx) wake(); });
  const wakeFromGesture = () => { if (actx) wake(true); };
  document.addEventListener('pointerdown', wakeFromGesture, { passive: true, capture: true });
  document.addEventListener('touchend', wakeFromGesture, { passive: true, capture: true });
  document.addEventListener('keydown', wakeFromGesture, { capture: true });

  function setMuted(value) {
    muted = Boolean(value);
    if (musicGain && actx) {
      const now = actx.currentTime;
      musicGain.gain.cancelScheduledValues(now);
      musicGain.gain.setTargetAtTime(muted ? 0 : nativeMusicDuck, now, 0.03);
    }
    if (nativeThemeAudio) nativeThemeAudio.muted = muted;
    return muted;
  }

  function toggleMute() {
    return setMuted(!muted);
  }

  // --- SFX ---
  function sfxEat() {
    init();
    const T = getCurrentTheme();
    for (const sfx of T.sfxEat) {
      const t = actx.currentTime;
      const osc = actx.createOscillator(); const g = actx.createGain();
      osc.type = sfx.type;
      for (let i = 0; i < sfx.freqs.length; i++) {
        if (i === 0) osc.frequency.setValueAtTime(sfx.freqs[i], t + (sfx.times[i] || 0));
        else osc.frequency.setValueAtTime(sfx.freqs[i], t + sfx.times[i]);
      }
      g.gain.setValueAtTime(sfx.vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + sfx.dur);
      osc.connect(g); g.connect(sfxGain);
      osc.start(t); osc.stop(t + sfx.dur);
    }
  }

  function sfxDie() {
    init();
    const T = getCurrentTheme().sfxDie;
    const t = actx.currentTime;
    const osc = actx.createOscillator(); const g = actx.createGain();
    osc.type = T.type;
    osc.frequency.setValueAtTime(T.freqStart, t);
    osc.frequency.exponentialRampToValueAtTime(T.freqEnd, t + T.dur);
    g.gain.setValueAtTime(T.vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + T.dur);
    osc.connect(g); g.connect(sfxGain);
    osc.start(t); osc.stop(t + T.dur);

    if (T.bursts) {
      const gap = T.burstGap || 0.05;
      T.bursts.forEach((burst, index) => {
        const detailed = typeof burst === 'object';
        const freq = detailed ? burst.freq : burst;
        const start = t + (detailed ? (burst.at || 0) : index * gap);
        const duration = detailed ? (burst.dur || 0.05) : 0.05;
        const volume = detailed ? (burst.vol || T.vol * 0.85) : T.vol * 0.85;
        const click = actx.createOscillator();
        const clickGain = actx.createGain();
        click.type = detailed ? (burst.type || 'sawtooth') : 'square';
        click.frequency.setValueAtTime(freq, start);
        clickGain.gain.setValueAtTime(volume, start);
        clickGain.gain.exponentialRampToValueAtTime(0.001, start + duration);
        click.connect(clickGain); clickGain.connect(sfxGain);
        click.start(start); click.stop(start + duration + 0.01);
      });
    }
  }

  return {
    start, stop, pause, resume, updateTempo, sfxEat, sfxDie, setMuted, toggleMute,
    setRecordHeartbeat, stopRecordHeartbeat, playRecordFanfare,
    get muted() { return muted; }
  };
})();
}
