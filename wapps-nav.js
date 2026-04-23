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
    location.href = 'index.html';
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
      if (!location.pathname.endsWith('index.html')) location.href = 'index.html';
    }
  }, {passive:true});
})();
