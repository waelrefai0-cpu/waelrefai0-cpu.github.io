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
const toggle = document.querySelector('#video-toggle');
const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
const entranceGroups = [
  ['.site-header', 0], ['.greeting', 0.15], ['.intro h1', 0.3],
  ['.intro h2', 0.45], ['.hero-description', 0.6], ['.hero-actions', 0.75],
  ['.social-links', 0.9], ['.service-card', 0.65], ['.credentials', 1.05],
  ['.hero-foot', 1.45], ['.hire-bunny', 1.55],
];
entranceGroups.forEach(([selector, delay]) => {
  document.querySelectorAll(selector).forEach((element, index) => {
    element.classList.add('hero-reveal');
    element.style.setProperty('--entrance-delay', `${delay + index * 0.12}s`);
    element.addEventListener('animationend', () => element.classList.add('hero-arrived'), { once: true });
  });
});
document.documentElement.classList.add('entrance-enabled');
let entranceStarted = false;
let playbackFinished = false;
function beginEntrance() {
  if (entranceStarted) return;
  entranceStarted = true;
  document.documentElement.classList.add('entrance-started');
  window.clearTimeout(entranceFallback);
}
function checkEntranceTime() {
  if (video.currentTime >= 3) beginEntrance();
}
video.addEventListener('timeupdate', checkEntranceTime);
video.addEventListener('playing', checkEntranceTime);
// Reveal the page even if autoplay is blocked or the video cannot load.
const entranceFallback = window.setTimeout(beginEntrance, 6000);
const entranceInitializedAt = performance.now();
function revealWithoutPlayback() {
  window.setTimeout(beginEntrance, Math.max(0, 3000 - (performance.now() - entranceInitializedAt)));
}
let userPaused = motion.matches;
function syncVideoControl() {
  const paused = video.paused;
  toggle.hidden = playbackFinished;
  toggle.setAttribute('aria-pressed', String(paused));
  toggle.setAttribute('aria-label', paused ? 'Lire la vidéo de fond' : 'Mettre la vidéo en pause');
  toggle.querySelector('use').setAttribute('href', paused ? '#play' : '#pause');
  toggle.querySelector('span').textContent = paused ? 'Lire la vidéo' : 'Pause vidéo';
}
async function playVideo() {
  if (playbackFinished) return;
  try { await video.play(); } catch { revealWithoutPlayback(); }
  syncVideoControl();
}
video.addEventListener('play', syncVideoControl);
video.addEventListener('pause', syncVideoControl);
video.addEventListener('ended', () => {
  playbackFinished = true;
  userPaused = true;
  syncVideoControl();
});
video.addEventListener('error', () => { toggle.hidden = true; revealWithoutPlayback(); });
toggle.addEventListener('click', () => {
  if (playbackFinished) return;
  userPaused = !video.paused;
  if (video.paused) playVideo();
  else video.pause();
});
motion.addEventListener('change', event => {
  userPaused = event.matches;
  if (event.matches) { video.pause(); revealWithoutPlayback(); }
  else playVideo();
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden) video.pause();
  else if (!userPaused && !playbackFinished) playVideo();
});
if (!motion.matches) playVideo();
else { revealWithoutPlayback(); syncVideoControl(); }
document.querySelector('#year').textContent = new Date().getFullYear();
const hireBunny = document.querySelector('.hire-bunny');
try { hireBunny.hidden = sessionStorage.getItem('hireBunnyDismissed') === '1'; } catch { /* Storage may be unavailable in private browsing. */ }
document.querySelector('.bunny-dismiss').addEventListener('click', () => {
  hireBunny.hidden = true;
  try { sessionStorage.setItem('hireBunnyDismissed', '1'); } catch { /* Dismissal still works without storage. */ }
});
