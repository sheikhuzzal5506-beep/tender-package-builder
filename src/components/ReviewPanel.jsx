import { CheckCircle2, FileCheck2, FileText, LoaderCircle, ShieldCheck, X } from 'lucide-react';
import { formatDate } from '../lib/validation';

export default function ReviewPanel({ t, tender, summary, requirements, language, expiryDates, isGenerating, onClose, onGenerate }) {
  const included = summary.statuses.filter((item) => item.status === 'OK');
  const pageTotal = included.reduce((sum, item) => sum + (item.file?.pageCount || 0), 2);
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="review-modal" role="dialog" aria-modal="true" aria-label={t('packageReview')}>
      <header className="review-header"><div><span className="section-kicker">{t('packageReview')}</span><h2>{t('reviewSubtitle')}</h2></div><button className="close-button" type="button" onClick={onClose} aria-label={t('close')}><X size={20} /></button></header>
      <div className="review-grid">
        <div className="review-summary-panel"><div className="review-tender-id">{tender.tender_id}</div><h3>{tender.title}</h3><p>{tender.procuring_entity}</p><div className="review-summary-list"><div><span>{t('submissionDeadline')}</span><strong>{formatDate(tender.submission_deadline, language)}</strong></div><div><span>{t('documentsIncluded')}</span><strong>{included.length}</strong></div><div><span>{t('optionalSkipped')}</span><strong>{summary.optionalNotProvided}</strong></div><div><span>{t('totalPages')}</span><strong>{pageTotal}</strong></div></div><div className="review-private"><ShieldCheck size={15} /> {t('privacy')}</div></div>
        <div className="review-documents"><div className="review-documents-head"><span>{t('includedDocuments')}</span><span>{included.length}</span></div>{included.map(({ requirement, file }, index) => <div className="review-document-row" key={requirement.id}><span className="review-number">{String(index + 1).padStart(2, '0')}</span><span className="review-document-name"><strong>{language === 'bn' ? requirement.title_bn : requirement.title_en}</strong><small>{file.name}{requirement.has_expiry && expiryDates[requirement.id] ? ` · ${formatDate(expiryDates[requirement.id], language)}` : ''}</small></span><span className="review-page-count"><FileText size={14} /> {file.pageCount}</span><CheckCircle2 className="review-ok" size={17} /></div>)}</div>
      </div>
      <footer className="review-footer"><div><strong>{summary.blocking.length ? t('needsAttention') : t('ready')}</strong><span>{summary.blocking.length ? t('resolveIssues', { count: summary.blocking.length, s: summary.blocking.length === 1 ? '' : 's' }) : `${t('totalPages')}: ${pageTotal}`}</span></div><button className="generate-button" type="button" disabled={summary.blocking.length > 0 || isGenerating} onClick={onGenerate}>{isGenerating ? <LoaderCircle className="spin" size={18} /> : <FileCheck2 size={18} />}{isGenerating ? t('generating') : t('generatePackage')}</button></footer>
    </div>
  </div>;
}
