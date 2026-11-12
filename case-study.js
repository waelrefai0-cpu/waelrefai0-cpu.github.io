'use strict';
document.querySelector('#year').textContent = new Date().getFullYear();
document.querySelector('.bunny-dismiss').addEventListener('click', () => { document.querySelector('.hire-bunny').hidden = true; });
