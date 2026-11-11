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
  const bootAt = Number(root.dataset.bootAt) || 0;
  window.clearTimeout(window.__startupSafety);
  let started = false;
  let ended = false;
  let ready = false;
  let posterOnly = false;
  let helloHidden = false;
  let pendingPlay = false;
  const stamp = key => { root.dataset[key] = String(Math.round(performance.now())); };
  document.querySelectorAll('[data-enter]').forEach(element => {
    element.style.setProperty('--enter-delay', `${element.dataset.enter || 0}s`);
    element.addEventListener('animationend', () => element.classList.add('arrived'), { once: true });
  });
  function hideHello() {
    if (helloHidden) return;
    helloHidden = true;
    root.classList.add('hello-done');
    if (!root.dataset.helloHideMs) stamp('helloHideMs');
    window.clearTimeout(window.__helloSafety);
    window.setTimeout(() => { hello.hidden = true; }, motion.matches ? 0 : 200);
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
    hideHello();
  }
  function usePoster(reason) {
    if (posterOnly) return;
    posterOnly = true;
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
    stamp('videoStartMs');
    window.clearTimeout(startDeadline);
    window.setTimeout(hideHello, Math.max(0, 650 - (performance.now() - bootAt)));
    if (typeof video.requestVideoFrameCallback === 'function') {
      video.requestVideoFrameCallback(() => stamp('firstFrameMs'));
    }
    if (video.currentTime >= 3) showContent();
  }
  async function play() {
    if (pendingPlay || posterOnly || ended || motion.matches || document.hidden) return;
    pendingPlay = true;
    video.muted = true;
    try { await video.play(); }
    catch (error) {
      if (!posterOnly && !document.hidden) usePoster(error.name === 'NotAllowedError' ? 'autoplay-blocked' : 'video-error');
    }
    finally { pendingPlay = false; }
  }
  const elapsed = performance.now() - bootAt;
  const startDeadline = window.setTimeout(() => usePoster('video-timeout'), Math.max(0, 3200 - elapsed));
  const contentDeadline = window.setTimeout(() => usePoster('playback-stalled'), Math.max(0, 6500 - elapsed));
  video.addEventListener('playing', onPlaying);
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
  } else if (video.error || video.networkState === 3) usePoster('video-error');
  else if (!video.paused && video.readyState >= 2) onPlaying();
  else play();
})();
