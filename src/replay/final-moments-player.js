import {
  FINAL_MOMENTS_PLAYBACK_MS,
  finalMomentsCaption,
  replaySourceTime,
  sampleFinalMoments
} from './final-moments.js';
import { createFinalMomentsAudio } from './final-moments-audio.js';

const MIME_CANDIDATES = [
  'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
  'video/mp4;codecs=h264',
  'video/mp4',
  'video/webm;codecs=vp9,opus',
  'video/webm;codecs=vp8,opus',
  'video/webm;codecs=vp9',
  'video/webm;codecs=vp8',
  'video/webm'
];
const DEATH_RESOLUTION_MS = 1200;

function supportedMimeType() {
  if (!globalThis.MediaRecorder?.isTypeSupported) return '';
  return MIME_CANDIDATES.find(type => MediaRecorder.isTypeSupported(type)) || '';
}

function formatClock(ms, mode) {
  if (mode === 'classic') return '∞';
  const seconds = Math.max(0, Math.ceil((Number(ms) || 0) / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

function drawHud(ctx, width, height, sample, summary, playbackElapsed) {
  const accent = sample.theme?.accent || '#4ecca3';
  const heartbeatProgress = Number.isFinite(sample.recordHeartbeatProgress)
    ? Math.max(0, Math.min(1, sample.recordHeartbeatProgress))
    : null;
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.82)';
  ctx.fillRect(0, 0, width, 58);
  ctx.strokeStyle = accent;
  ctx.globalAlpha = 0.55;
  ctx.strokeRect(1, 1, width - 2, 56);
  ctx.globalAlpha = 1;
  ctx.font = '700 10px ui-monospace, monospace';
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#9aa5a1';
  ctx.textAlign = 'left';
  ctx.fillText('SCORE', 14, 9);
  ctx.textAlign = 'center';
  const pointsToTop = Number.isFinite(Number(summary.topScore))
    ? Math.max(1, Number(summary.topScore) - Number(sample.score) + 1)
    : null;
  ctx.fillStyle = heartbeatProgress === null ? '#9aa5a1' : '#ff5a5a';
  ctx.fillText(heartbeatProgress === null ? 'TOP' : `${pointsToTop} TO #1`, width / 2, 9);
  ctx.fillStyle = '#9aa5a1';
  ctx.textAlign = 'right';
  ctx.fillText(summary.mode === 'classic' ? 'TIME' : 'LEFT', width - 14, 9);
  ctx.font = '800 22px ui-monospace, monospace';
  ctx.fillStyle = accent;
  ctx.textAlign = 'left';
  ctx.fillText(String(sample.score), 14, 25);
  ctx.textAlign = 'center';
  ctx.fillText(summary.topScore == null ? '—' : String(summary.topScore), width / 2, 25);
  ctx.textAlign = 'right';
  ctx.fillText(formatClock(sample.remainingMs, summary.mode), width - 14, 25);
  if (heartbeatProgress !== null) {
    const pulse = (Math.sin(playbackElapsed / (82 - heartbeatProgress * 28)) + 1) / 2;
    ctx.strokeStyle = '#ff3030';
    ctx.lineWidth = 3 + pulse * 2;
    ctx.globalAlpha = 0.5 + pulse * 0.45;
    ctx.shadowColor = '#ff2020';
    ctx.shadowBlur = 8 + pulse * 16;
    ctx.strokeRect(4, 62, width - 8, height - 66);
  }
  ctx.restore();
}

function fileExtension(type) {
  return type.includes('mp4') ? 'mp4' : 'webm';
}

function setActionLabel(button, label) {
  const labelElement = button.querySelector('.final-moments-action-label');
  if (labelElement) labelElement.textContent = label;
  else button.textContent = label;
}

export function createFinalMomentsPlayer({
  elements,
  renderer,
  setRenderState,
  getTheme,
  onEat = () => {},
  onCollision = () => {},
  onPlayAgain = () => {},
  onExit = () => {}
}) {
  const { overlay, canvas, status, playAgain, watchAgain, share, results } = elements;
  const ctx = canvas.getContext('2d');
  const replayAudio = createFinalMomentsAudio();
  let frameId = null;
  let clip = null;
  let auto = false;
  let recording = false;
  let captureRequested = false;
  let recorder = null;
  let chunks = [];
  let preparedFile = null;
  let lastSnapshotIndex = -1;
  let startedAt = 0;
  let lastFrameAt = 0;
  let impactTriggered = false;
  let completeCallback = null;
  let playbackRequest = 0;

  function stopRecorder() {
    if (recorder?.state === 'recording') recorder.stop();
  }

  function stop({ hide = true } = {}) {
    playbackRequest++;
    if (frameId != null) cancelAnimationFrame(frameId);
    frameId = null;
    stopRecorder();
    recorder = null;
    recording = false;
    completeCallback = null;
    replayAudio.stop();
    if (hide) overlay.hidden = true;
  }

  function beginRecording(audioStream = null) {
    const type = supportedMimeType();
    if (!canvas.captureStream || !globalThis.MediaRecorder || !type) return false;
    try {
      chunks = [];
      const canvasStream = canvas.captureStream(30);
      const combinedStream = audioStream?.getAudioTracks?.().length
        ? new MediaStream([...canvasStream.getVideoTracks(), ...audioStream.getAudioTracks()])
        : canvasStream;
      const activeRecorder = new MediaRecorder(combinedStream, { mimeType: type });
      recorder = activeRecorder;
      recorder.ondataavailable = event => { if (event.data?.size) chunks.push(event.data); };
      recorder.onstop = () => {
        if (!chunks.length) return;
        const blob = new Blob(chunks, { type: activeRecorder.mimeType || type });
        preparedFile = new File([blob], `snakebit-final-moments.${fileExtension(blob.type)}`, { type: blob.type });
        share.hidden = false;
        setActionLabel(share, 'Share Video');
        status.textContent = 'Replay captured • ready to share';
      };
      recorder.start(250);
      return true;
    } catch {
      recorder = null;
      return false;
    }
  }

  function prepareStillFallback() {
    canvas.toBlob(blob => {
      if (!blob) return;
      preparedFile = new File([blob], 'snakebit-final-moments.png', { type: 'image/png' });
      share.hidden = false;
      setActionLabel(share, 'Share Still');
      status.textContent = 'Replay video unavailable • final frame ready to share';
    }, 'image/png');
  }

  function renderFrame(now) {
    if (!clip) return;
    const elapsed = Math.max(0, now - startedAt);
    const playbackElapsed = Math.min(elapsed, FINAL_MOMENTS_PLAYBACK_MS);
    const sourceTime = replaySourceTime(clip, playbackElapsed, FINAL_MOMENTS_PLAYBACK_MS);
    const sampled = sampleFinalMoments(clip, sourceTime);
    if (!sampled) return;
    const current = sampled.current;
    const previous = sampled.previous || current;
    const theme = getTheme(clip.summary.themeId);
    const renderState = {
      ...current,
      theme,
      themeId: clip.summary.themeId,
      direction: current.direction,
      alive: true,
      paused: false,
      rivalGhost: null,
      highSpeedEffectsEnabled: true
    };
    renderer.capturePreviousSnake(previous.snake);
    let sonicBoom = false;
    if (sampled.index !== lastSnapshotIndex) {
      const previousRecordedSnapshot = lastSnapshotIndex >= 0 ? clip.snapshots[lastSnapshotIndex] : null;
      sonicBoom = Boolean(previousRecordedSnapshot && !previousRecordedSnapshot.sonicBoomed && current.sonicBoomed);
      renderer.recordMove(current.snake);
      if (lastSnapshotIndex >= 0 && current.score > clip.snapshots[lastSnapshotIndex]?.score) {
        renderer.triggerFoodEat({ food: previous.food, theme });
        onEat();
      }
      if (sonicBoom) renderer.triggerSonicBoom({ snake: current.snake, theme });
      lastSnapshotIndex = sampled.index;
    }
    const resolveDuration = clip.summary.reason === 'collision' ? DEATH_RESOLUTION_MS : 0;
    replayAudio.update({
      recordHeartbeatProgress: current.recordHeartbeatProgress,
      sonicBoom
    });
    setRenderState(renderState);
    const frameDt = lastFrameAt ? Math.min(50, now - lastFrameAt) : 0;
    lastFrameAt = now;
    if (elapsed >= FINAL_MOMENTS_PLAYBACK_MS && clip.summary.reason === 'collision' && !impactTriggered) {
      impactTriggered = true;
      renderer.triggerCollision({ snake: current.snake, theme });
      onCollision();
    }
    renderer.update(frameDt);
    renderer.draw(sampled.interpolation);
    drawHud(ctx, canvas.width, canvas.height, renderState, clip.summary, playbackElapsed);
    if (elapsed < FINAL_MOMENTS_PLAYBACK_MS + resolveDuration) {
      frameId = requestAnimationFrame(renderFrame);
      return;
    }
    frameId = null;
    stopRecorder();
    replayAudio.enterMenu();
    if (captureRequested && !recorder) prepareStillFallback();
    watchAgain.hidden = false;
    results.hidden = false;
    if (!recording) share.hidden = false;
    if (auto) {
      const callback = completeCallback;
      setTimeout(() => {
        if (!overlay.hidden && auto) {
          stop();
          callback?.();
        }
      }, 650);
    } else if (!recording) {
      status.textContent = finalMomentsCaption(clip.summary);
    }
  }

  async function play(nextClip, { automatic = false, capture = false, onComplete } = {}) {
    stop({ hide: false });
    const request = ++playbackRequest;
    clip = nextClip;
    if (!clip?.snapshots?.length) return false;
    auto = automatic;
    recording = capture;
    captureRequested = capture;
    preparedFile = null;
    lastSnapshotIndex = -1;
    lastFrameAt = 0;
    impactTriggered = false;
    completeCallback = onComplete || null;
    overlay.hidden = false;
    status.textContent = capture ? 'Capturing your final moments…' : finalMomentsCaption(clip.summary);
    playAgain.hidden = false;
    watchAgain.hidden = true;
    results.hidden = automatic;
    share.hidden = true;
    renderer.resetEffects();
    status.textContent = capture ? 'Preparing replay capture…' : 'Loading replay audio…';
    const audioStream = await replayAudio.start();
    if (request !== playbackRequest) {
      replayAudio.stop();
      return false;
    }
    status.textContent = capture ? 'Capturing your final moments…' : finalMomentsCaption(clip.summary);
    if (capture && !beginRecording(audioStream)) {
      recording = false;
      status.textContent = 'Video capture is unavailable here • replay still works';
    }
    startedAt = performance.now();
    frameId = requestAnimationFrame(renderFrame);
    return true;
  }

  async function sharePrepared() {
    if (!preparedFile) {
      play(clip, { capture: true });
      return;
    }
    const payload = { title: 'SnakeBit Final Moments', text: `My final moments in SnakeBit — score ${clip.summary.score}`, files: [preparedFile] };
    if (navigator.share && navigator.canShare?.({ files: payload.files })) {
      try { await navigator.share(payload); } catch {}
      return;
    }
    const url = URL.createObjectURL(preparedFile);
    const link = document.createElement('a');
    link.href = url;
    link.download = preparedFile.name;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  playAgain.addEventListener('click', () => { stop(); onPlayAgain(); });
  results.addEventListener('click', () => { stop(); onExit(); });
  watchAgain.addEventListener('click', () => play(clip));
  share.addEventListener('click', sharePrepared);

  return { play, stop, sharePrepared, get active() { return !overlay.hidden; } };
}

// A silent, compact death postcard for the instant result screen. It previews
// only the final beat and lets the existing score typography remain the hero.
export function createFinalMomentsPostcard({ canvas, renderer, setRenderState, getTheme }) {
  const SOURCE_PREVIEW_MS = 1400;
  const MOVE_PREVIEW_MS = 1300;
  const IMPACT_PREVIEW_MS = 900;
  const LOOP_HOLD_MS = 320;
  let frameId = null;
  let restartTimer = null;
  let clip = null;
  let startedAt = 0;
  let lastFrameAt = 0;
  let lastIndex = -1;
  let impactTriggered = false;

  function stop() {
    if (frameId != null) cancelAnimationFrame(frameId);
    if (restartTimer != null) clearTimeout(restartTimer);
    frameId = null;
    restartTimer = null;
  }

  function beginCycle() {
    if (!clip || canvas.hidden) return;
    renderer.resetEffects();
    lastIndex = -1;
    impactTriggered = false;
    lastFrameAt = 0;
    startedAt = performance.now();
    frameId = requestAnimationFrame(draw);
  }

  function draw(now) {
    if (!clip) return;
    const elapsed = Math.max(0, now - startedAt);
    const previewProgress = Math.min(1, elapsed / MOVE_PREVIEW_MS);
    const sourceStart = Math.max(0, clip.durationMs - SOURCE_PREVIEW_MS);
    const sourceTime = sourceStart + (clip.durationMs - sourceStart) * previewProgress;
    const sampled = sampleFinalMoments(clip, sourceTime);
    if (!sampled) return;
    const current = sampled.current;
    const previous = sampled.previous || current;
    const theme = getTheme(clip.summary.themeId);
    const state = {
      ...current,
      theme,
      themeId: clip.summary.themeId,
      direction: current.direction,
      alive: true,
      paused: false,
      rivalGhost: null,
      highSpeedEffectsEnabled: true
    };
    renderer.capturePreviousSnake(previous.snake);
    if (sampled.index !== lastIndex) {
      renderer.recordMove(current.snake);
      lastIndex = sampled.index;
    }
    setRenderState(state);
    const dt = lastFrameAt ? Math.min(50, now - lastFrameAt) : 0;
    lastFrameAt = now;
    if (elapsed >= MOVE_PREVIEW_MS && clip.summary.reason === 'collision' && !impactTriggered) {
      impactTriggered = true;
      renderer.triggerCollision({ snake: current.snake, theme });
    }
    renderer.update(dt);
    renderer.draw(sampled.interpolation);
    if (elapsed < MOVE_PREVIEW_MS + (clip.summary.reason === 'collision' ? IMPACT_PREVIEW_MS : 250)) {
      frameId = requestAnimationFrame(draw);
      return;
    }
    frameId = null;
    restartTimer = setTimeout(() => {
      restartTimer = null;
      beginCycle();
    }, LOOP_HOLD_MS);
  }

  function show(nextClip) {
    stop();
    clip = nextClip;
    if (!clip?.snapshots?.length) {
      canvas.hidden = true;
      return false;
    }
    const head = clip.snapshots.at(-1)?.snake?.[0];
    canvas.style.objectPosition = head
      ? `${Math.round((head.x / 19) * 100)}% ${Math.round((head.y / 31) * 100)}%`
      : '50% 50%';
    canvas.hidden = false;
    beginCycle();
    return true;
  }

  return { show, stop };
}
