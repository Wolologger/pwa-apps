// wapps-pdf.js — Exportación a PDF usando jsPDF (CDN)
// API: WPDF.export(title, sections)
//   sections: [{ title, headers: [..], rows: [[..],..] }, ...]
// Carga jsPDF on-demand la primera vez que se llama a export()

(function () {
  const JSPDF_URL = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
  const AUTOTABLE_URL = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js';

  let _loadPromise = null;

  function _loadScript(url) {
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = url; s.async = true;
      s.onload = resolve;
      s.onerror = () => reject(new Error('No se pudo cargar ' + url));
      document.head.appendChild(s);
    });
  }

  async function _ensureLoaded() {
    if (_loadPromise) return _loadPromise;
    _loadPromise = (async () => {
      if (typeof window.jspdf === 'undefined') {
        await _loadScript(JSPDF_URL);
      }
      // autoTable se engancha al prototype de jsPDF
      if (typeof window.jspdf?.jsPDF?.API?.autoTable === 'undefined') {
        await _loadScript(AUTOTABLE_URL);
      }
      if (typeof window.jspdf === 'undefined') {
        throw new Error('jsPDF no se cargó correctamente');
      }
    })();
    return _loadPromise;
  }

  /**
   * Exportar PDF.
   * @param {string} title - Título principal
   * @param {Array<{title:string, headers:string[], rows:Array<Array>}>} sections
   * @param {Object} [opts] - { filename, subtitle }
   */
  async function exportPDF(title, sections, opts = {}) {
    try {
      await _ensureLoaded();
    } catch (e) {
      alert('No se pudo cargar la librería PDF. Comprueba tu conexión.');
      console.error(e);
      return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });

    // Header
    const now = new Date();
    const dateStr = now.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
    doc.setFontSize(20);
    doc.setTextColor(40);
    doc.text(title || 'Informe', 14, 18);
    doc.setFontSize(9);
    doc.setTextColor(120);
    doc.text(`W//APPS · ${dateStr} · ${now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`, 14, 24);
    if (opts.subtitle) {
      doc.setFontSize(10);
      doc.setTextColor(80);
      doc.text(opts.subtitle, 14, 30);
    }

    let cursorY = opts.subtitle ? 36 : 32;

    // Sections
    (sections || []).forEach((sec, idx) => {
      if (idx > 0) cursorY += 4;
      if (cursorY > 260) { doc.addPage(); cursorY = 18; }

      if (sec.title) {
        doc.setFontSize(12);
        doc.setTextColor(40);
        doc.text(String(sec.title), 14, cursorY);
        cursorY += 5;
      }

      if (sec.headers && sec.rows && sec.rows.length > 0) {
        doc.autoTable({
          head: [sec.headers],
          body: sec.rows.map(r => r.map(c => c == null ? '' : String(c))),
          startY: cursorY,
          margin: { left: 14, right: 14 },
          styles: { fontSize: 9, cellPadding: 2 },
          headStyles: { fillColor: [232, 240, 64], textColor: 20, fontStyle: 'bold' },
          alternateRowStyles: { fillColor: [248, 248, 246] },
          theme: 'grid',
        });
        cursorY = doc.lastAutoTable.finalY + 6;
      } else if (sec.text) {
        doc.setFontSize(10);
        doc.setTextColor(60);
        const lines = doc.splitTextToSize(String(sec.text), 180);
        doc.text(lines, 14, cursorY);
        cursorY += lines.length * 5 + 4;
      }
    });

    // Footer
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(`${i} / ${pageCount}`, 195, 290, { align: 'right' });
    }

    const safeTitle = (title || 'export').replace(/[^a-z0-9_-]/gi, '_').toLowerCase();
    const filename = opts.filename || `${safeTitle}_${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}.pdf`;
    doc.save(filename);
  }

  window.WPDF = { export: exportPDF };
})();
