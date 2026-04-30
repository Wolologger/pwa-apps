// wapps-nav.js — navegación común entre apps
(function(){
  // Atajo ESC → volver a index (excepto en modales/inputs activos)
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    // No salir si hay un input activo con contenido o un modal abierto
    const active = document.activeElement;
    if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.tagName === 'SELECT')) return;
    const modal = document.querySelector('.modal-overlay.open, .panel-overlay.open, .cl-backdrop.open, [class*="modal"][class*="open"]');
    if (modal) return;
    if (location.pathname.endsWith('index.html') || location.pathname.endsWith('/')) return;
    if (document.startViewTransition) {
        document.startViewTransition(() => { location.href = 'index.html'; });
      } else { location.href = 'index.html'; }
  });

  // Swipe derecha = volver (borde izquierdo)
  let sx=null, sy=null, st=null;
  document.addEventListener('touchstart', e => {
    const t = e.touches[0];
    if (t.clientX > 30) return; // solo desde borde izquierdo
    sx = t.clientX; sy = t.clientY; st = Date.now();
  }, {passive:true});
  document.addEventListener('touchend', e => {
    if (sx === null) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - sx, dy = Math.abs(t.clientY - sy), dt = Date.now() - st;
    sx = null;
    if (dx > 80 && dy < 60 && dt < 500) {
      if (navigator.vibrate) navigator.vibrate(8);
      if (!location.pathname.endsWith('index.html')) if (document.startViewTransition) {
        document.startViewTransition(() => { location.href = 'index.html'; });
      } else { location.href = 'index.html'; }
    }
  }, {passive:true});

  // Pull-to-refresh: arrastrar hacia abajo desde el top → refresca datos
  let _ptr_sy = null, _ptr_el = null;
  const _PTR_THRESHOLD = 80; // px to trigger
  document.addEventListener('touchstart', e => {
    if (window.scrollY === 0) {
      _ptr_sy = e.touches[0].clientY;
      _ptr_el = null;
    }
  }, {passive:true});
  document.addEventListener('touchmove', e => {
    if (_ptr_sy === null) return;
    const dy = e.touches[0].clientY - _ptr_sy;
    if (dy > 30 && !_ptr_el) {
      _ptr_el = document.createElement('div');
      _ptr_el.id = '_ptr_indicator';
      _ptr_el.style.cssText = 'position:fixed;top:0;left:50%;transform:translateX(-50%);background:var(--y,#e8f040);color:#0a0a09;font-size:11px;font-family:monospace;padding:4px 14px;border-radius:0 0 8px 8px;z-index:9999;letter-spacing:1px;opacity:0;transition:opacity 0.15s';
      _ptr_el.textContent = '↓ ACTUALIZAR';
      document.body.appendChild(_ptr_el);
    }
    if (_ptr_el) {
      const progress = Math.min(dy / _PTR_THRESHOLD, 1);
      _ptr_el.style.opacity = String(progress);
    }
  }, {passive:true});
  document.addEventListener('touchend', e => {
    if (_ptr_sy === null) return;
    const dy = e.changedTouches[0].clientY - _ptr_sy;
    _ptr_sy = null;
    if (_ptr_el) { _ptr_el.remove(); _ptr_el = null; }
    if (dy > _PTR_THRESHOLD) {
      if (navigator.vibrate) navigator.vibrate([8,40,8]);
      // Prefer manualPull() if the app has it, else syncAll, else location.reload
      if (typeof manualPull === 'function') manualPull();
      else if (typeof WSync !== 'undefined' && typeof WFirebase !== 'undefined') {
        const user = WFirebase.getUser();
        if (user) WSync.pullAll(user.uid).then(() => { if (typeof render === 'function') render(); });
        else location.reload();
      } else location.reload();
    }
  }, {passive:true});
})();
