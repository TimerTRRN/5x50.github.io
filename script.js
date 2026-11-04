/*
 * The app runtime is kept at the known-good revision; this bootstrap adds an
 * isolated, accessible window manager for floating app windows.
 */
(function () {
  'use strict';

  var runtimeUrl = 'https://raw.githubusercontent.com/TimerTRRN/5x50.github.io/9aa5dbc7a2838a288eedbf9e2d092d8050c0efc6/script.js';

  function installWindowManager() {
    if (window.__trrnWindowManagerInstalled) return;
    window.__trrnWindowManagerInstalled = true;

    var zCounter = Math.max(Number(window.highestZ) || 500, 500);
    var cascadeIndex = 0;
    var activeGesture = null;
    var SNAP_ZONE = 18;

    var style = document.createElement('style');
    style.textContent = [
      '#windows-layer { position:fixed; inset:0; z-index:var(--z-windows); pointer-events:none; }',
      '.window { inset:auto; right:auto; bottom:auto; width:min(920px, calc(100vw - 32px)); height:min(680px, calc(100vh - 64px)); min-width:280px; min-height:180px; border:1px solid #333; border-radius:14px; overflow:hidden; pointer-events:none; box-shadow:0 24px 70px rgba(0,0,0,.62); transition:left .22s cubic-bezier(.2,.8,.2,1), top .22s cubic-bezier(.2,.8,.2,1), width .22s cubic-bezier(.2,.8,.2,1), height .22s cubic-bezier(.2,.8,.2,1), border-radius .22s ease, box-shadow .22s ease, opacity .22s ease, transform .22s ease; }',
      '.window.active { pointer-events:auto; }',
      '.window.dragging, .window.resizing { transition:none !important; }',
      '.window.fullscreen { inset:0 !important; width:100vw !important; height:100vh !important; min-width:0 !important; min-height:0 !important; border:0 !important; border-radius:0 !important; box-shadow:none !important; }',
      '.window.snapped-left, .window.snapped-right { top:0 !important; height:100vh !important; border-radius:0 !important; }',
      '.window.snapped-left { left:0 !important; width:50vw !important; }',
      '.window.snapped-right { left:50vw !important; width:50vw !important; }',
      '.window.snapped-left .window-resize-handle, .window.snapped-right .window-resize-handle { display:none; }',
      '.win-header { cursor:grab; touch-action:none; }',
      '.window.dragging .win-header { cursor:grabbing; }',
      '.win-header:not(.force-visible) { transform:translateY(calc(-100% + 9px)); }',
      '.header-visible .win-header, .win-header.force-visible { transform:translateY(0); }',
      '.win-controls { position:relative; z-index:2; }',
      '.win-btn.btn-full { position:relative; background:#444; border:1px solid #666; color:transparent; }',
      '.win-btn.btn-full:hover { background:#888; color:#fff; transform:scale(1.12); }',
      '.win-btn.btn-full:before { content:""; width:7px; height:7px; border:1.5px solid currentColor; border-radius:1px; }',
      '.window-reveal-zone { position:absolute; top:0; left:0; right:0; height:10px; z-index:99; pointer-events:auto; background:transparent; }',
      '.window-snap-preview { position:fixed; z-index:499; pointer-events:none; background:rgba(255,255,255,.16); border:1px solid rgba(255,255,255,.42); border-radius:12px; box-shadow:0 0 35px rgba(255,255,255,.14); transition:all .12s ease; display:none; }',
      '.window-resize-handle { position:absolute; right:0; bottom:0; width:20px; height:20px; z-index:120; cursor:nwse-resize; touch-action:none; }',
      '.window-resize-handle:after { content:""; position:absolute; right:5px; bottom:5px; width:8px; height:8px; border-right:2px solid #777; border-bottom:2px solid #777; }',
      '.window.active:focus-within { outline:none; }',
      '@media (prefers-reduced-motion: reduce) { .window, .win-header, .window-snap-preview { transition-duration:.01ms !important; } }'
    ].join('\n');
    document.head.appendChild(style);

    var snapPreview = document.createElement('div');
    snapPreview.className = 'window-snap-preview';
    snapPreview.setAttribute('aria-hidden', 'true');
    document.body.appendChild(snapPreview);

    function setZ(win) {
      zCounter = Math.max(zCounter, Number(window.highestZ) || 500) + 1;
      window.highestZ = zCounter;
      win.style.zIndex = String(zCounter);
      window.activeWindowId = win.id.replace(/^win-/, '');
      document.querySelectorAll('.window.active').forEach(function (item) {
        item.classList.toggle('window-focused', item === win);
        if (item !== win) item.classList.remove('header-visible');
      });
    }

    function boundsFor(win) {
      var minW = Math.min(280, window.innerWidth);
      var minH = Math.min(180, window.innerHeight);
      return {
        minW: minW,
        minH: minH,
        maxW: Math.max(minW, window.innerWidth),
        maxH: Math.max(minH, window.innerHeight)
      };
    }

    function rememberNormal(win) {
      var rect = win.getBoundingClientRect();
      win.dataset.normalLeft = String(rect.left);
      win.dataset.normalTop = String(rect.top);
      win.dataset.normalWidth = String(rect.width);
      win.dataset.normalHeight = String(rect.height);
    }

    function applyGeometry(win, left, top, width, height, remember) {
      var b = boundsFor(win);
      width = Math.max(b.minW, Math.min(b.maxW, width));
      height = Math.max(b.minH, Math.min(b.maxH, height));
      left = Math.max(0, Math.min(window.innerWidth - width, left));
      top = Math.max(0, Math.min(window.innerHeight - Math.min(45, height), top));
      win.style.inset = 'auto';
      win.style.right = 'auto';
      win.style.bottom = 'auto';
      win.style.left = left + 'px';
      win.style.top = top + 'px';
      win.style.width = width + 'px';
      win.style.height = height + 'px';
      if (remember !== false) {
        win.dataset.normalLeft = String(left);
        win.dataset.normalTop = String(top);
        win.dataset.normalWidth = String(width);
        win.dataset.normalHeight = String(height);
      }
    }

    function focusWindow(win) {
      if (!win || win.classList.contains('minimized')) return;
      win.classList.add('active');
      setZ(win);
    }

    function showSnapPreview(type) {
      if (!type) {
        snapPreview.style.display = 'none';
        return;
      }
      snapPreview.style.display = 'block';
      if (type === 'left') Object.assign(snapPreview.style, { left: '0px', top: '0px', width: '50vw', height: '100vh' });
      else if (type === 'right') Object.assign(snapPreview.style, { left: '50vw', top: '0px', width: '50vw', height: '100vh' });
      else Object.assign(snapPreview.style, { left: '0px', top: '0px', width: '100vw', height: '100vh' });
    }

    function snapTypeAt(x, y) {
      if (y <= SNAP_ZONE) return 'max';
      if (x <= SNAP_ZONE) return 'left';
      if (x >= window.innerWidth - SNAP_ZONE) return 'right';
      return null;
    }

    function restoreNormal(win) {
      win.classList.remove('fullscreen', 'snapped-left', 'snapped-right');
      var width = Number(win.dataset.normalWidth) || Math.min(920, window.innerWidth - 32);
      var height = Number(win.dataset.normalHeight) || Math.min(680, window.innerHeight - 64);
      var left = Number(win.dataset.normalLeft);
      var top = Number(win.dataset.normalTop);
      if (!Number.isFinite(left)) left = 90;
      if (!Number.isFinite(top)) top = 56;
      applyGeometry(win, left, top, width, height, true);
    }

    function applySnap(win, type) {
      if (!type) return;
      if (!win.classList.contains('fullscreen') && !win.classList.contains('snapped-left') && !win.classList.contains('snapped-right')) rememberNormal(win);
      win.classList.remove('fullscreen', 'snapped-left', 'snapped-right');
      if (type === 'max') {
        win.classList.add('fullscreen');
        win.style.left = '0px'; win.style.top = '0px'; win.style.right = '0px'; win.style.bottom = '0px';
        win.style.width = '100vw'; win.style.height = '100vh';
      } else {
        win.classList.add(type === 'left' ? 'snapped-left' : 'snapped-right');
        win.style.left = type === 'left' ? '0px' : '50vw';
        win.style.top = '0px'; win.style.right = 'auto'; win.style.bottom = 'auto';
        win.style.width = '50vw'; win.style.height = '100vh';
      }
      win.dataset.snap = type;
      win.classList.add('header-visible');
    }

    function toggleFullscreen(win) {
      if (win.classList.contains('fullscreen')) restoreNormal(win);
      else applySnap(win, 'max');
      focusWindow(win);
      win.classList.add('header-visible');
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
        event.preventDefault(); event.stopPropagation(); toggleFullscreen(win);
      });
      controls.insertBefore(button, controls.lastElementChild || null);
    }

    function setupWindow(win, isNew) {
      if (!win) return;
      if (isNew && !win.dataset.windowPositioned) {
        var width = Math.min(920, Math.max(280, window.innerWidth - 32));
        var height = Math.min(680, Math.max(220, window.innerHeight - 64));
        var step = cascadeIndex++ % 8;
        var left = Math.min(90 + step * 34, Math.max(0, window.innerWidth - width));
        var top = Math.min(56 + step * 30, Math.max(0, window.innerHeight - Math.min(height, 260)));
        applyGeometry(win, left, top, width, height, true);
        win.dataset.windowPositioned = '1';
      }
      var header = win.querySelector('.win-header');
      if (!header || win.dataset.managerReady === '1') return;
      win.dataset.managerReady = '1';
      addFullscreenControl(win);

      // Remove the old mouse-only handler; this manager uses pointer events for
      // mouse, pen, and touch and avoids duplicate DragSystem state.
      header.removeAttribute('onmousedown');
      header.onmousedown = null;
      var reveal = document.createElement('div');
      reveal.className = 'window-reveal-zone';
      reveal.setAttribute('aria-hidden', 'true');
      win.insertBefore(reveal, header);
      reveal.addEventListener('pointerenter', function () { focusWindow(win); win.classList.add('header-visible'); });
      header.addEventListener('pointerenter', function () { focusWindow(win); win.classList.add('header-visible'); });

      header.addEventListener('pointerdown', function (event) {
        if (event.button !== 0 || event.target.closest('.win-controls')) return;
        focusWindow(win);
        if (win.classList.contains('fullscreen') || win.classList.contains('snapped-left') || win.classList.contains('snapped-right')) {
          restoreNormal(win);
        }
        var rect = win.getBoundingClientRect();
        activeGesture = { kind: 'move', win: win, pointerId: event.pointerId, x: event.clientX, y: event.clientY, left: rect.left, top: rect.top, snap: null };
        try { header.setPointerCapture(event.pointerId); } catch (_) {}
        event.preventDefault();
      });

      header.addEventListener('pointermove', function (event) {
        var g = activeGesture;
        if (!g || g.kind !== 'move' || g.win !== win || g.pointerId !== event.pointerId) return;
        var dx = event.clientX - g.x, dy = event.clientY - g.y;
        if (Math.abs(dx) + Math.abs(dy) > 3) win.classList.add('dragging');
        var left = Math.max(0, Math.min(window.innerWidth - win.offsetWidth, g.left + dx));
        var top = Math.max(0, Math.min(window.innerHeight - 45, g.top + dy));
        win.style.left = left + 'px'; win.style.top = top + 'px';
        win.dataset.normalLeft = String(left); win.dataset.normalTop = String(top);
        g.snap = snapTypeAt(event.clientX, event.clientY);
        showSnapPreview(g.snap);
      });

      function finishMove(event) {
        var g = activeGesture;
        if (!g || g.win !== win || g.kind !== 'move' || (event && g.pointerId !== event.pointerId)) return;
        activeGesture = null;
        win.classList.remove('dragging');
        showSnapPreview(null);
        if (g.snap) applySnap(win, g.snap);
      }
      header.addEventListener('pointerup', finishMove);
      header.addEventListener('pointercancel', finishMove);

      var resize = document.createElement('div');
      resize.className = 'window-resize-handle';
      resize.setAttribute('role', 'separator');
      resize.setAttribute('aria-label', 'Resize window');
      win.appendChild(resize);
      resize.addEventListener('pointerdown', function (event) {
        if (event.button !== 0 || win.classList.contains('fullscreen') || win.classList.contains('snapped-left') || win.classList.contains('snapped-right')) return;
        focusWindow(win);
        var rect = win.getBoundingClientRect();
        activeGesture = { kind: 'resize', win: win, pointerId: event.pointerId, x: event.clientX, y: event.clientY, width: rect.width, height: rect.height, left: rect.left, top: rect.top };
        try { resize.setPointerCapture(event.pointerId); } catch (_) {}
        event.preventDefault(); event.stopPropagation();
      });
      resize.addEventListener('pointermove', function (event) {
        var g = activeGesture;
        if (!g || g.kind !== 'resize' || g.win !== win || g.pointerId !== event.pointerId) return;
        win.classList.add('resizing');
        var width = Math.max(280, Math.min(window.innerWidth - g.left, g.width + event.clientX - g.x));
        var height = Math.max(180, Math.min(window.innerHeight - g.top, g.height + event.clientY - g.y));
        applyGeometry(win, g.left, g.top, width, height, true);
      });
      function finishResize(event) {
        var g = activeGesture;
        if (!g || g.win !== win || g.kind !== 'resize' || (event && g.pointerId !== event.pointerId)) return;
        activeGesture = null; win.classList.remove('resizing');
      }
      resize.addEventListener('pointerup', finishResize);
      resize.addEventListener('pointercancel', finishResize);

      win.addEventListener('pointerdown', function () { focusWindow(win); });
      win.classList.add('header-visible');
    }

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
          if (win) { focusWindow(win); win.classList.add('header-visible'); }
        });
      };
    }

    document.querySelectorAll('.window').forEach(function (win) { setupWindow(win, false); });

    window.addEventListener('resize', function () {
      document.querySelectorAll('.window').forEach(function (win) {
        if (win.classList.contains('fullscreen')) return;
        if (win.classList.contains('snapped-left') || win.classList.contains('snapped-right')) {
          win.style.width = '50vw'; win.style.height = '100vh';
          win.style.left = win.classList.contains('snapped-left') ? '0px' : '50vw';
          return;
        }
        var rect = win.getBoundingClientRect();
        applyGeometry(win, rect.left, rect.top, Math.min(rect.width, Math.max(280, window.innerWidth - 32)), Math.min(rect.height, Math.max(180, window.innerHeight - 32)), true);
      });
    });
  }

  var script = document.createElement('script');
  script.src = runtimeUrl;
  script.onload = function () {
    if (!window.__trrnBaseInitialized) {
      window.__trrnBaseInitialized = true;
      applyCloak();
      loadDynamicResources();
      var bootLayer = document.getElementById('boot-layer');
      if (bootLayer) bootLayer.style.display = 'block';
      loadDesktop();
      updateSidebarData();
    }
    installWindowManager();
  };
  script.onerror = function () { console.error('Unable to load the pinned TRRN+ app runtime.'); };
  document.head.appendChild(script);
})();
