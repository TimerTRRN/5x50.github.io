/* Load the last complete, unmodified application script, then apply window behavior fixes. */
(function() {
    var baseScript = document.createElement('script');
    baseScript.src = 'https://raw.githubusercontent.com/TimerTRRN/5x50.github.io/9aa5dbc7a2838a288eedbf9e2d092d8050c0efc6/script.js';
    baseScript.onload = function() {
        function initializeApp() {
            if (window.__trrnAppInitialized) return;
            window.__trrnAppInitialized = true;
            applyCloak();
            loadDynamicResources();
            var bootLayer = document.getElementById('boot-layer');
            if (bootLayer) bootLayer.style.display = 'block';
            loadDesktop();
            updateSidebarData();
        }

        // The script is loaded asynchronously; run its DOM-ready setup if that event already fired.
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initializeApp, { once: true });
        } else {
            initializeApp();
        }

        // Open new windows in a visible cascade rather than exactly on top of each other.
        var originalOpenWindow = window.openWindow;
        window.openWindow = function(id) {
            var isNewWindow = !document.getElementById('win-' + id);
            originalOpenWindow(id);
            if (!isNewWindow) return;

            var win = document.getElementById('win-' + id);
            if (!win) return;
            var windows = document.querySelectorAll('.window');
            var offset = (windows.length - 1) % 7;
            var width = Math.min(920, Math.max(320, window.innerWidth - 40));
            var height = Math.min(680, Math.max(240, window.innerHeight - 80));
            var left = Math.min(120 + offset * 32, Math.max(0, window.innerWidth - width));
            var top = Math.min(70 + offset * 28, Math.max(0, window.innerHeight - height));
            win.style.left = left + 'px';
            win.style.top = top + 'px';
            win.dataset.windowX = left + 'px';
            win.dataset.windowY = top + 'px';
            win.dataset.windowWidth = width + 'px';
            win.dataset.windowHeight = height + 'px';
        };

        // Keep a window's own titlebar available at its top edge; the screen-edge trigger
        // is not useful once windows are floating away from the top of the desktop.
        document.addEventListener('mousemove', function(e) {
            var active = activeWindowId && document.getElementById('win-' + activeWindowId);
            if (!active || active.classList.contains('minimized')) return;
            var header = active.querySelector('.win-header');
            if (!header) return;
            var rect = active.getBoundingClientRect();
            var withinWindowTop = e.clientX >= rect.left && e.clientX <= rect.right &&
                e.clientY >= rect.top && e.clientY <= rect.top + 45;
            if (withinWindowTop || header.contains(e.target)) {
                active.classList.add('header-visible');
            } else {
                active.classList.remove('header-visible');
            }
        });

        // Replace the former no-op window drag path with actual titlebar dragging.
        DragSystem.startWinDrag = function(e, id) {
            if (e.button !== 0 || e.target.closest('.win-controls')) return;
            var win = document.getElementById('win-' + id);
            if (!win || win.classList.contains('fullscreen')) return;
            e.preventDefault();
            this.startPos = { x: e.clientX, y: e.clientY };
            this.sourceType = 'window';
            this.sourceEl = win;
            this.startWindowPosition = {
                x: win.getBoundingClientRect().left,
                y: win.getBoundingClientRect().top
            };
            this.isDragMove = false;
            win.style.zIndex = ++highestZ;
            activeWindowId = id;
            win.classList.add('header-visible');
        };

        var originalDragMove = DragSystem.move;
        DragSystem.move = function(e) {
            if (this.sourceType !== 'window' || !this.sourceEl) {
                originalDragMove.call(this, e);
                return;
            }
            var dx = e.clientX - this.startPos.x;
            var dy = e.clientY - this.startPos.y;
            if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
                this.dragging = true;
                this.isDragMove = true;
                this.sourceEl.classList.add('dragging');
            }
            if (!this.dragging) return;
            var win = this.sourceEl;
            var maxLeft = Math.max(0, window.innerWidth - win.offsetWidth);
            var maxTop = Math.max(0, window.innerHeight - 45);
            var left = Math.max(0, Math.min(maxLeft, this.startWindowPosition.x + dx));
            var top = Math.max(0, Math.min(maxTop, this.startWindowPosition.y + dy));
            win.style.left = left + 'px';
            win.style.top = top + 'px';
            win.dataset.windowX = left + 'px';
            win.dataset.windowY = top + 'px';
        };

        var originalDragEnd = DragSystem.end;
        DragSystem.end = function(e) {
            if (this.sourceType !== 'window') {
                originalDragEnd.call(this, e);
                return;
            }
            if (this.sourceEl) this.sourceEl.classList.remove('dragging');
            this.reset();
        };

        // Fullscreen and restore preserve the window's previous size and position.
        window.toggleWindowFullscreen = function(id) {
            var win = document.getElementById('win-' + id);
            if (!win) return;
            var enteringFullscreen = !win.classList.contains('fullscreen');
            if (enteringFullscreen) {
                var rect = win.getBoundingClientRect();
                win.dataset.windowX = rect.left + 'px';
                win.dataset.windowY = rect.top + 'px';
                win.dataset.windowWidth = rect.width + 'px';
                win.dataset.windowHeight = rect.height + 'px';
                win.classList.add('fullscreen');
                win.style.left = '0px';
                win.style.top = '0px';
                win.style.width = '100vw';
                win.style.height = '100vh';
            } else {
                win.classList.remove('fullscreen');
                win.style.left = win.dataset.windowX || '120px';
                win.style.top = win.dataset.windowY || '70px';
                win.style.width = win.dataset.windowWidth || 'min(920px, calc(100vw - 220px))';
                win.style.height = win.dataset.windowHeight || 'min(680px, calc(100vh - 180px))';
            }
            win.classList.add('active', 'header-visible');
            win.classList.remove('minimized');
            win.style.zIndex = ++highestZ;
            activeWindowId = id;
        };
    };
    baseScript.onerror = function() {
        console.error('TRRN+ could not load its application script. Check network access to raw.githubusercontent.com.');
    };
    document.head.appendChild(baseScript);
})();
