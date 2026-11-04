/*
 * Restore the original app runtime from its known-good commit, then add a small,
 * isolated window manager enhancement. Keeping the original runtime intact avoids
 * reimplementing unrelated desktop features.
 */
(function () {
  'use strict';

  var runtimeUrl = 'https://raw.githubusercontent.com/TimerTRRN/5x50.github.io/9aa5dbc7a2838a288eedbf9e2d092d8050c0efc6/script.js';

  function installWindowEnhancements() {
    if (window.__trrnWindowEnhancementsInstalled) return;
    window.__trrnWindowEnhancementsInstalled = true;

    var style = document.createElement('style');
    style.textContent = [
      '.window:not(.fullscreen) { right:auto; bottom:auto; border:1px solid #333; border-radius:14px 14px 0 0; overflow:hidden; box-shadow:0 24px 70px rgba(0,0,0,.65); }',
      '.window.fullscreen { inset:0 !important; width:100vw !important; height:100vh !important; border:0 !important; border-radius:0 !important; box-shadow:none !important; }',
      '.window.dragging { transition:none !important; }',
      '.win-header { cursor:grab; touch-action:none; }',
      '.window.dragging .win-header { cursor:grabbing; }',
      '.win-header:not(.force-visible) { transform:translateY(calc(-100% + 9px)); }',
      '.header-visible .win-header, .win-header.force-visible { transform:translateY(0); }',
      '.win-controls { position:relative; z-index:2; }',
      '.win-btn.btn-full { position:relative; background:#444; border:1px solid #666; color:transparent; }',
      '.win-btn.btn-full:hover { background:#888; color:#fff; transform:scale(1.12); }',
      '.win-btn.btn-full:before { content:""; width:7px; height:7px; border:1.5px solid currentColor; border-radius:1px; }',
      '.window-reveal-zone { position:absolute; top:0; left:0; right:0; height:10px; z-index:99; pointer-events:auto; background:transparent; }',
      '.window.fullscreen .window-reveal-zone { top:0; }'
    ].join('\n');
    document.head.appendChild(style);

    var nextOffset = 0;
    var dragState = null;

    function setGeometry(win, left, top, width, height) {
      var maxLeft = Math.max(0, window.innerWidth - width);
      var maxTop = Math.max(0, window.innerHeight - Math.min(45, height));
      left = Math.max(0, Math.min(maxLeft, left));
      top = Math.max(0, Math.min(maxTop, top));
      win.style.left = left + 'px';
      win.style.top = top + 'px';
      win.style.right = 'auto';
      win.style.bottom = 'auto';
      win.style.width = width + 'px';
      win.style.height = height + 'px';
      win.dataset.normalLeft = left;
      win.dataset.normalTop = top;
      win.dataset.normalWidth = width;
      win.dataset.normalHeight = height;
    }

    function focusWindow(win) {
      if (!win || win.classList.contains('minimized')) return;
      document.querySelectorAll('.window.active').forEach(function (item) {
        if (item !== win) item.classList.remove('header-visible');
      });
      win.classList.add('active');
      win.style.zIndex = String((window.highestZ || 500) + 1);
      window.highestZ = Number(win.style.zIndex);
      window.activeWindowId = win.id.replace(/^win-/, '');
    }

    function addFullscreenControl(win) {
      var controls = win.querySelector('.win-controls');
      if (!controls || controls.querySelector('.btn-full')) return;
      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'win-btn btn-full';
      button.title = 'Toggle fullscreen';
      button.setAttribute('aria-label', 'Toggle fullscreen');
      button.addEventListener('pointerdown', function (event) { event.stopPropagation(); });
      button.addEventListener('click', function (event) {
        event.preventDefault();
        event.stopPropagation();
        toggleFullscreen(win);
      });
      controls.insertBefore(button, controls.lastElementChild || null);
    }

    function toggleFullscreen(win) {
      if (win.classList.contains('fullscreen')) {
        win.classList.remove('fullscreen');
        var width = Math.min(Number(win.dataset.normalWidth) || 920, Math.max(280, window.innerWidth - 32));
        var height = Math.min(Number(win.dataset.normalHeight) || 680, Math.max(220, window.innerHeight - 64));
        setGeometry(win, Number(win.dataset.normalLeft) || 100, Number(win.dataset.normalTop) || 70, width, height);
      } else {
        var rect = win.getBoundingClientRect();
        win.dataset.normalLeft = rect.left;
        win.dataset.normalTop = rect.top;
        win.dataset.normalWidth = rect.width;
        win.dataset.normalHeight = rect.height;
        win.classList.add('fullscreen');
        win.style.left = '0px';
        win.style.top = '0px';
        win.style.right = '0px';
        win.style.bottom = '0px';
        win.style.width = '100vw';
        win.style.height = '100vh';
      }
      focusWindow(win);
      win.classList.add('header-visible');
    }

    function setupWindow(win, isNew) {
      if (!win) return;
      var width = Math.min(920, Math.max(280, window.innerWidth - 32));
      var height = Math.min(680, Math.max(220, window.innerHeight - 64));
      if (isNew && !win.dataset.windowPositioned) {
        var step = nextOffset++ % 8;
        var left = Math.min(90 + step * 34, Math.max(0, window.innerWidth - width));
        var top = Math.min(56 + step * 30, Math.max(0, window.innerHeight - Math.min(height, 260)));
        setGeometry(win, left, top, width, height);
        win.dataset.windowPositioned = '1';
      } else if (!win.classList.contains('fullscreen') && !win.dataset.windowPositioned) {
        var rect = win.getBoundingClientRect();
        setGeometry(win, rect.left || 90, rect.top || 56, Math.min(rect.width || width, width), Math.min(rect.height || height, height));
        win.dataset.windowPositioned = '1';
      }

      var header = win.querySelector('.win-header');
      if (!header) return;
      addFullscreenControl(win);

      var reveal = win.querySelector('.window-reveal-zone');
      if (!reveal) {
        reveal = document.createElement('div');
        reveal.className = 'window-reveal-zone';
        reveal.setAttribute('aria-hidden', 'true');
        win.insertBefore(reveal, header);
      }
      reveal.addEventListener('pointerenter', function () {
        focusWindow(win);
        win.classList.add('header-visible');
      });
      header.addEventListener('pointerenter', function () {
        focusWindow(win);
        win.classList.add('header-visible');
      });
      header.addEventListener('pointerleave', function (event) {
        if (dragState && dragState.win === win) return;
        if (event.relatedTarget === reveal) return;
        win.classList.remove('header-visible');
      });

      header.addEventListener('pointerdown', function (event) {
        if (event.button !== 0 || event.target.closest('.win-controls') || win.classList.contains('fullscreen')) return;
        focusWindow(win);
        var rect = win.getBoundingClientRect();
        dragState = { win: win, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, left: rect.left, top: rect.top };
        header.setPointerCapture(event.pointerId);
        event.preventDefault();
      });
      header.addEventListener('pointermove', function (event) {
        if (!dragState || dragState.win !== win || dragState.pointerId !== event.pointerId) return;
        var dx = event.clientX - dragState.startX;
        var dy = event.clientY - dragState.startY;
        if (Math.abs(dx) + Math.abs(dy) > 3) win.classList.add('dragging');
        var maxLeft = Math.max(0, window.innerWidth - win.offsetWidth);
        var maxTop = Math.max(0, window.innerHeight - 45);
        var left = Math.max(0, Math.min(maxLeft, dragState.left + dx));
        var top = Math.max(0, Math.min(maxTop, dragState.top + dy));
        win.style.left = left + 'px';
        win.style.top = top + 'px';
        win.dataset.normalLeft = left;
        win.dataset.normalTop = top;
      });
      function finishDrag(event) {
        if (!dragState || dragState.win !== win || (event && dragState.pointerId !== event.pointerId)) return;
        dragState = null;
        win.classList.remove('dragging');
      }
      header.addEventListener('pointerup', finishDrag);
      header.addEventListener('pointercancel', finishDrag);
    }

    // The titlebar itself has a narrow visible/reveal strip at each window's own top edge.
    var topTrigger = document.getElementById('top-trigger');
    if (topTrigger) topTrigger.style.pointerEvents = 'none';

    document.addEventListener('pointerdown', function (event) {
      var win = event.target.closest && event.target.closest('.window');
      if (win) focusWindow(win);
    }, true);

    var originalOpenWindow = window.openWindow;
    if (typeof originalOpenWindow === 'function') {
      window.openWindow = function (id) {
        var existed = !!document.getElementById('win-' + id);
        originalOpenWindow.apply(this, arguments);
        requestAnimationFrame(function () {
          var win = document.getElementById('win-' + id);
          setupWindow(win, !existed);
          if (win) {
            focusWindow(win);
            win.classList.add('header-visible');
          }
        });
      };
    }

    document.querySelectorAll('.window').forEach(function (win) { setupWindow(win, false); });

    // Ensure the restored position remains on-screen after viewport resize.
    window.addEventListener('resize', function () {
      document.querySelectorAll('.window:not(.fullscreen)').forEach(function (win) {
        var rect = win.getBoundingClientRect();
        setGeometry(win, rect.left, rect.top, Math.min(rect.width, Math.max(280, window.innerWidth - 32)), Math.min(rect.height, Math.max(220, window.innerHeight - 64)));
      });
    });
  }

  var script = document.createElement('script');
  script.src = 'https://raw.githubusercontent.com/TimerTRRN/5x50.github.io/9aa5dbc7a2838a288eedbf9e2d092d8050c0efc6/script.js';
  script.onload = function () {
    // The base script is fetched dynamically after DOMContentLoaded, so perform its
    // normal startup routine explicitly rather than waiting for an event that passed.
    if (!window.__trrnBaseInitialized) {
      window.__trrnBaseInitialized = true;
      applyCloak();
      loadDynamicResources();
      var bootLayer = document.getElementById('boot-layer');
      if (bootLayer) bootLayer.style.display = 'block';
      loadDesktop();
      updateSidebarData();
    }
    installWindowEnhancements();
  };
  script.onerror = function () {
    console.error('Unable to load the pinned TRRN+ app runtime.');
  };
  document.head.appendChild(script);
})();
