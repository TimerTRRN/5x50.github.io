(function () {
  function patchWindowBehavior() {
    const topTrigger = document.getElementById('top-trigger');
    if (topTrigger) topTrigger.style.pointerEvents = 'none';

    function cascadeWindow(win) {
      if (!win || win.classList.contains('fullscreen')) return;
      const all = Array.from(document.querySelectorAll('.window:not(.fullscreen)'));
      const idx = all.indexOf(win);
      const offset = idx >= 0 ? idx * 26 : 0;
      const safeLeft = Math.min(120 + offset, Math.max(30, window.innerWidth - 420));
      const safeTop = Math.min(80 + offset, Math.max(20, window.innerHeight - 260));
      win.style.left = safeLeft + 'px';
      win.style.top = safeTop + 'px';
      win.dataset.windowX = String(safeLeft);
      win.dataset.windowY = String(safeTop);
    }

    function attachDrag(win) {
      if (!win || win.dataset.winPatch === '1') return;
      win.dataset.winPatch = '1';

      const header = win.querySelector('.win-header');
      if (!header) return;

      let drag = null;
      header.addEventListener('pointerdown', function (e) {
        if (e.target.closest('.win-btn')) return;
        if (win.classList.contains('fullscreen')) return;
        drag = {
          startX: e.clientX,
          startY: e.clientY,
          origLeft: win.offsetLeft,
          origTop: win.offsetTop,
          maxLeft: Math.max(0, window.innerWidth - win.offsetWidth),
          maxTop: Math.max(0, window.innerHeight - 45)
        };
        win.classList.add('dragging');
        win.setPointerCapture?.(e.pointerId);
        e.preventDefault();
      });

      header.addEventListener('pointermove', function (e) {
        if (!drag) return;
        const dx = e.clientX - drag.startX;
        const dy = e.clientY - drag.startY;
        const nextLeft = Math.min(drag.maxLeft, Math.max(0, drag.origLeft + dx));
        const nextTop = Math.min(drag.maxTop, Math.max(0, drag.origTop + dy));
        win.style.left = nextLeft + 'px';
        win.style.top = nextTop + 'px';
      });

      header.addEventListener('pointerup', function () {
        drag = null;
        win.classList.remove('dragging');
      });

      header.addEventListener('pointerleave', function () {
        if (!drag) return;
        drag = null;
        win.classList.remove('dragging');
      });
    }

    function keepHeaderOnWindow(e) {
      const active = document.querySelector('.window.active:not(.minimized)');
      if (!active) return;
      const rect = active.getBoundingClientRect();
      const onTopBand = e.clientY <= rect.top + 20 && e.clientX >= rect.left && e.clientX <= rect.right;
      const insideHeader = active.querySelector('.win-header')?.contains(e.target) || false;
      if (onTopBand || insideHeader) {
        active.classList.add('header-visible');
      } else {
        active.classList.remove('header-visible');
      }
    }

    function enhanceOpenWindow() {
      const original = window.openWindow;
      if (!original) return;
      window.openWindow = function (id) {
        const wasOpen = !!document.getElementById('win-' + id);
        original.call(this, id);
        requestAnimationFrame(function () {
          const win = document.getElementById('win-' + id);
          if (!win) return;
          cascadeWindow(win);
          attachDrag(win);
          if (!wasOpen) win.classList.add('header-visible');
          const btn = win.querySelector('.btn-full');
          if (btn) {
            btn.onclick = function (ev) {
              ev.stopPropagation();
              win.classList.toggle('fullscreen');
              if (win.classList.contains('fullscreen')) {
                win.dataset.windowX = win.style.left;
                win.dataset.windowY = win.style.top;
                win.style.left = '0px';
                win.style.top = '0px';
                win.style.width = '100vw';
                win.style.height = '100vh';
                win.style.borderRadius = '0';
              } else {
                win.style.left = win.dataset.windowX || '120px';
                win.style.top = win.dataset.windowY || '80px';
                win.style.width = 'min(920px, calc(100vw - 220px))';
                win.style.height = 'min(680px, calc(100vh - 180px))';
                win.style.borderRadius = '14px 14px 0 0';
              }
            };
          }
        });
      };
    }

    function initExistingWindows() {
      document.querySelectorAll('.window').forEach(function (win) {
        cascadeWindow(win);
        attachDrag(win);
      });
    }

    document.addEventListener('mousemove', keepHeaderOnWindow, { passive: true });
    enhanceOpenWindow();
    initExistingWindows();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', patchWindowBehavior, { once: true });
  } else {
    patchWindowBehavior();
  }
})();
