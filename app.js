'use strict';
const menuButton = document.querySelector('.menu-toggle');
const navigation = document.querySelector('#navigation');
function closeMenu() {
  navigation.classList.remove('is-open');
  menuButton.setAttribute('aria-expanded', 'false');
  menuButton.setAttribute('aria-label', 'Ouvrir le menu');
}
menuButton.addEventListener('click', () => {
  const open = menuButton.getAttribute('aria-expanded') !== 'true';
  navigation.classList.toggle('is-open', open);
  menuButton.setAttribute('aria-expanded', String(open));
  menuButton.setAttribute('aria-label', open ? 'Fermer le menu' : 'Ouvrir le menu');
});
navigation.addEventListener('click', event => {
  if (event.target.closest('a')) closeMenu();
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && menuButton.getAttribute('aria-expanded') === 'true') {
    closeMenu();
    menuButton.focus();
  }
});
document.addEventListener('click', event => {
  if (!event.target.closest('.site-header')) closeMenu();
});
const links = [...navigation.querySelectorAll('a')];
const observer = new IntersectionObserver(entries => {
  const visible = entries.filter(entry => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio);
  if (!visible.length) return;
  links.forEach(link => {
    const active = link.hash === '#' + visible[0].target.id;
    link.classList.toggle('active', active);
    if (active) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  });
}, { rootMargin: '-10% 0px -55% 0px', threshold: 0 });
document.querySelectorAll('main > section[id]').forEach(section => observer.observe(section));
const video = document.querySelector('#background-video');
const introScreen = document.querySelector('#intro-screen');
const introEnter = document.querySelector('#intro-enter');
const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
const surfaces = [...document.querySelectorAll('body > header, body > main, body > footer')];
const entranceGroups = [
  ['.site-header', 0], ['.intro h1', 0.15], ['.intro h2', 0.3],
  ['.hero-description', 0.45], ['.hero-actions', 0.6], ['.hero-socials', 0.55],
];
entranceGroups.forEach(([selector, delay]) => {
  document.querySelectorAll(selector).forEach((element, index) => {
    element.classList.add('hero-reveal');
    element.style.setProperty('--entrance-delay', `${delay + index * 0.12}s`);
    element.addEventListener('animationend', () => element.classList.add('hero-arrived'), { once: true });
  });
});
document.documentElement.classList.add('js-loading', 'entrance-enabled');
surfaces.forEach(element => { element.inert = true; });

let helloFinished = false;
let introFinishing = false;
let introReleased = false;
let entranceStarted = false;
let playbackFinished = false;
let playbackAttempted = false;
let videoReady = false;
let videoFailed = false;
let loadStarted = false;
let posterOnly = false;
let visiblePlaybackStart = 0;
const downloadController = new AbortController();

function beginEntrance() {
  if (entranceStarted) return;
  entranceStarted = true;
  document.documentElement.classList.add('entrance-started');
}

function finishIntro(withVideo) {
  if (introFinishing || introReleased) return;
  if (withVideo && (video.paused || video.readyState < 2)) return;
  introFinishing = true;
  posterOnly = !withVideo;
  window.clearTimeout(showEntryTimer);
  window.clearTimeout(introDeadline);
  if (posterOnly) {
    downloadController.abort();
    video.pause();
  }
  introScreen.classList.add('leaving');
  window.setTimeout(() => {
    introScreen.hidden = true;
    document.documentElement.classList.remove('js-loading');
    surfaces.forEach(element => { element.inert = false; });
    introReleased = true;
    visiblePlaybackStart = video.currentTime;
    if (posterOnly || playbackFinished) beginEntrance();
  }, motion.matches ? 0 : 450);
}

async function startVideo(fromGesture = false) {
  if (!helloFinished || !videoReady || playbackFinished || posterOnly || document.hidden) return;
  if (playbackAttempted && !fromGesture) return;
  playbackAttempted = true;
  video.muted = true;
  try { await video.play(); }
  catch { introEnter.hidden = false; }
}

function checkReadiness() {
  if (video.readyState >= 3) {
    videoReady = true;
    startVideo();
  }
}

async function loadVideo() {
  if (loadStarted || posterOnly) return;
  loadStarted = true;
  const source = video.dataset.videoSrc;
  try {
    // Buffer the entire short clip during hello so playback does not depend on streaming.
    const response = await fetch(source, { cache: 'force-cache', signal: downloadController.signal });
    if (!response.ok) throw new Error('Video download failed');
    const blob = await response.blob();
    if (posterOnly) return;
    video.src = URL.createObjectURL(blob);
    video.preload = 'auto';
    video.load();
  } catch (error) {
    if (posterOnly || error.name === 'AbortError') return;
    // A direct media request remains available if blob loading is unsupported.
    video.src = source;
    video.preload = 'auto';
    video.load();
  }
}

video.addEventListener('loadeddata', checkReadiness);
video.addEventListener('canplay', checkReadiness);
video.addEventListener('canplaythrough', checkReadiness);
video.addEventListener('playing', () => {
  if (introFinishing || introReleased) return;
  if (typeof video.requestVideoFrameCallback === 'function') {
    video.requestVideoFrameCallback(() => finishIntro(true));
  }
  window.setTimeout(() => finishIntro(true), 150);
});
video.addEventListener('timeupdate', () => {
  if (introReleased && !posterOnly && video.currentTime - visiblePlaybackStart >= 3) beginEntrance();
});
video.addEventListener('ended', () => {
  playbackFinished = true;
  if (introReleased) beginEntrance();
});
video.addEventListener('error', () => {
  videoFailed = true;
  if (helloFinished) finishIntro(false);
});

introEnter.addEventListener('click', () => {
  if (videoReady && !motion.matches) startVideo(true);
  else finishIntro(false);
});
const showEntryTimer = window.setTimeout(() => { introEnter.hidden = false; }, 8000);
const introDeadline = window.setTimeout(() => finishIntro(false), 12000);
window.setTimeout(() => {
  helloFinished = true;
  if (motion.matches || videoFailed) finishIntro(false);
  else startVideo();
}, motion.matches ? 700 : 1800);

document.addEventListener('visibilitychange', () => {
  if (document.hidden) video.pause();
  else if (!playbackFinished && !posterOnly && !motion.matches) {
    if (playbackAttempted) video.play().catch(() => { introEnter.hidden = false; });
    else startVideo();
  }
});
motion.addEventListener('change', event => {
  if (event.matches) {
    video.pause();
    if (introReleased) beginEntrance();
    else if (helloFinished) finishIntro(false);
  } else if (!introReleased) {
    loadVideo();
    startVideo();
  }
});
if (!motion.matches) loadVideo();
document.querySelector('#year').textContent = new Date().getFullYear();
