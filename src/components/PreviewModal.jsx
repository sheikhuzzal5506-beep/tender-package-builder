import { useEffect, useRef, useState } from 'react';
import { FileText, LoaderCircle, X } from 'lucide-react';
import { renderPdfPage } from '../lib/pdf';

export default function PreviewModal({ file, t, onClose }) {
  const pageContainer = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  useEffect(() => {
    let cancelled = false;
    async function render() {
      setLoading(true); setError(null);
      if (!pageContainer.current) return;
      pageContainer.current.innerHTML = '';
      try {
        for (let pageNumber = 1; pageNumber <= (file.pageCount || 0); pageNumber += 1) {
          const canvas = await renderPdfPage(file.file, pageNumber, 1.1);
          if (cancelled) return;
          canvas.className = 'preview-canvas';
          const wrapper = document.createElement('div');
          wrapper.className = 'preview-page';
          const label = document.createElement('span');
          label.textContent = `${t('page')} ${pageNumber}`;
          wrapper.append(label, canvas);
          pageContainer.current.appendChild(wrapper);
        }
        if (!cancelled) setLoading(false);
      } catch { if (!cancelled) { setLoading(false); setError(t('parseError')); } }
    }
    render();
    return () => { cancelled = true; };
  }, [file, t]);
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="preview-modal" role="dialog" aria-modal="true" aria-label={`${t('preview')} ${file.name}`}>
      <header className="preview-header"><div><span className="section-kicker"><FileText size={13} /> {t('preview')}</span><h2>{file.name}</h2><span>{file.pageCount} {file.pageCount === 1 ? t('page') : t('pages')}</span></div><button className="close-button" type="button" onClick={onClose} aria-label={t('close')}><X size={20} /></button></header>
      <div className="preview-content" ref={pageContainer}>{loading && <div className="preview-loading"><LoaderCircle className="spin" size={22} /> Loading preview…</div>}{error && <div className="preview-error">{error}</div>}</div>
    </div>
  </div>;
}
