'use strict';
(() => {
  const root = document.documentElement;
  const video = document.querySelector('#background-video');
  if (!root.classList.contains('intro-pending')) {
    video.pause();
    return;
  }
  const hello = document.querySelector('#intro-screen');
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const compact = window.matchMedia('(max-width: 760px)');
  const bootAt = Number(root.dataset.bootAt) || 0;
  window.clearTimeout(window.__startupSafety);
  let started = false;
  let ended = false;
  let ready = false;
  let posterOnly = false;
  let helloHidden = false;
  let pendingPlay = false;
  let playAttempts = 0;
  let retryTimer;
  let helloTimer;
  const stamp = key => { root.dataset[key] = String(Math.round(performance.now())); };
  document.querySelectorAll('[data-enter]').forEach(element => {
    element.style.setProperty('--enter-delay', `${element.dataset.enter || 0}s`);
    element.addEventListener('animationend', () => element.classList.add('arrived'), { once: true });
  });
  function hideHello() {
    if (helloHidden) return;
    const remaining = motion.matches ? 0 : 900 - (performance.now() - bootAt);
    if (remaining > 0) {
      window.clearTimeout(helloTimer);
      helloTimer = window.setTimeout(hideHello, remaining);
      return;
    }
    helloHidden = true;
    root.classList.add('hello-done');
    root.classList.remove('hello-active');
    if (!root.dataset.helloHideMs) stamp('helloHideMs');
    window.clearTimeout(window.__helloSafety);
    window.setTimeout(() => { hello.hidden = true; }, motion.matches ? 0 : 560);
    if (compact.matches && started && !ready) showContent();
  }
  function showContent(reason = 'video') {
    if (ready) return;
    ready = true;
    root.classList.remove('intro-pending');
    root.classList.add('content-ready');
    root.dataset.startupResult = reason;
    stamp('contentReadyMs');
    window.clearTimeout(startDeadline);
    window.clearTimeout(contentDeadline);
    window.clearTimeout(compactDeadline);
    window.clearTimeout(retryTimer);
    hideHello();
  }
  function usePoster(reason) {
    if (posterOnly) return;
    posterOnly = true;
    window.clearTimeout(retryTimer);
    video.autoplay = false;
    video.pause();
    video.classList.add('poster-only');
    root.dataset.fallbackReason = reason;
    if (ready) root.dataset.startupResult = 'poster';
    else showContent('poster');
  }
  function onPlaying() {
    if (posterOnly || ended) { video.pause(); return; }
    if (started) return;
    started = true;
    playAttempts = 0;
    stamp('videoStartMs');
    window.clearTimeout(startDeadline);
    hideHello();
    if (typeof video.requestVideoFrameCallback === 'function') {
      video.requestVideoFrameCallback(() => stamp('firstFrameMs'));
    }
    if (video.currentTime >= 3) showContent();
  }
  async function play() {
    if (pendingPlay || posterOnly || ended || motion.matches || document.hidden) return;
    pendingPlay = true;
    playAttempts++;
    video.muted = true;
    try { await video.play(); }
    catch (error) {
      root.dataset.lastPlayError = error.name;
      if (!posterOnly && !document.hidden) {
        if (error.name === 'NotAllowedError') usePoster('autoplay-blocked');
        else if (video.error) usePoster('video-error');
        else if (playAttempts < 3) retryTimer = window.setTimeout(play, 80);
      }
    }
    finally { pendingPlay = false; }
  }
  const elapsed = performance.now() - bootAt;
  const startDeadline = window.setTimeout(() => usePoster('video-timeout'), Math.max(0, 3200 - elapsed));
  const contentDeadline = window.setTimeout(() => usePoster('playback-stalled'), Math.max(0, 6500 - elapsed));
  const compactDeadline = compact.matches ? window.setTimeout(() => {
    if (!compact.matches) return;
    if (started) showContent();
    else usePoster('mobile-video-timeout');
  }, Math.max(0, 1800 - elapsed)) : undefined;
  video.addEventListener('playing', onPlaying);
  video.addEventListener('canplay', () => { if (!started) play(); });
  video.addEventListener('timeupdate', () => {
    if (started && !posterOnly && video.currentTime >= 3) showContent();
  });
  video.addEventListener('ended', () => {
    ended = true;
    stamp('videoEndMs');
    showContent('video');
  });
  video.addEventListener('error', () => usePoster('video-error'));
  video.querySelectorAll('source').forEach(source => {
    source.addEventListener('error', () => usePoster('video-error'));
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) video.pause();
    else if (!ended && !posterOnly) play();
  });
  motion.addEventListener('change', event => {
    if (event.matches) usePoster('reduced-motion');
  });
  if (typeof PerformanceObserver !== 'undefined') {
    let layoutShift = 0;
    try {
      new PerformanceObserver(list => {
        for (const entry of list.getEntries()) if (!entry.hadRecentInput) layoutShift += entry.value;
        root.dataset.layoutShift = layoutShift.toFixed(4);
      }).observe({ type: 'layout-shift', buffered: true });
    } catch { /* Timing collection is optional. */ }
  }
  if (motion.matches) {
    video.preload = 'metadata';
    window.setTimeout(() => usePoster('reduced-motion'), 250);
  } else if (video.error) usePoster('video-error');
  else if (!video.paused && video.readyState >= 2) onPlaying();
  else play();
})();
