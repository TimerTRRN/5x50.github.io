/*
 * Keep the existing app/window bootstrap, and guard wallpaper images so a stale
 * or missing saved wallpaper cannot leave a broken-image icon over the desktop.
 */
(function () {
  'use strict';

  function recoverBackgroundImage(event) {
    var image = event.currentTarget;
    if (!image || image.dataset.fallbackAttempted === '1') {
      if (image) image.style.display = 'none';
      return;
    }

    image.dataset.fallbackAttempted = '1';
    image.style.display = 'none';
    image.removeAttribute('src');

    var videoId = image.id === 'lock-img' ? 'lock-video' : 'bg-video';
    var video = document.getElementById(videoId);
    if (!video) return;

    video.style.display = 'block';
    video.src = 'Videos/default.mp4';
    video.loop = true;
    video.muted = true;
    video.load();
    var play = video.play();
    if (play && typeof play.catch === 'function') play.catch(function () {});
  }

  // Register before loading the app runtime, since it sets wallpaper URLs during startup.
  ['bg-img', 'lock-img'].forEach(function (id) {
    var image = document.getElementById(id);
    if (image) image.addEventListener('error', recoverBackgroundImage);
  });

  // Reuse the established bootstrap for app startup and window controls.
  var bootstrap = document.createElement('script');
  bootstrap.src = 'https://raw.githubusercontent.com/TimerTRRN/5x50.github.io/e27a6143236847545d0eca7b164944adc95d36c2/script.js';
  bootstrap.onerror = function () {
    document.querySelectorAll('#bg-img, #lock-img').forEach(function (image) {
      image.style.display = 'none';
    });
    console.error('TRRN+ failed to load its app runtime. Check network access to raw.githubusercontent.com.');
  };
  document.head.appendChild(bootstrap);
})();
