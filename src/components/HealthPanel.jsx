import { AlertTriangle, CheckCircle2, FileCheck2, Files, Info, LoaderCircle, RefreshCw, ShieldCheck } from 'lucide-react';
import { formatBytes } from '../lib/validation';

export default function HealthPanel({ t, summary, requirements, files, tender, isGenerating, onGenerate, onReview, onExportCsv, onHelp }) {
  const blocked = summary.blocking.length > 0;
  return (
    <aside className="health-column">
      <div className={`health-card ${blocked ? 'blocked' : 'healthy'}`}>
        <div className="health-card-head">
          <div><span className="section-kicker">{t('packageHealth')}</span><h2>{blocked ? t('needsAttention') : t('ready')}</h2></div>
          <span className="health-orb">{blocked ? <AlertTriangle size={20} /> : <ShieldCheck size={20} />}</span>
        </div>
        <div className="health-stat-grid">
          <div><strong>{summary.valid}</strong><span>{t('valid')}</span></div>
          <div><strong>{summary.optionalNotProvided}</strong><span>{t('optionalNotProvided')}</span></div>
          <div><strong>{summary.duplicateGroups.length}</strong><span>{t('duplicateDetected')}</span></div>
          <div><strong className={blocked ? 'danger-text' : ''}>{summary.blocking.length}</strong><span>{t('blockingIssues')}</span></div>
        </div>
        {blocked ? <div className="blocking-list" role="alert">
          <div className="blocking-list-title"><AlertTriangle size={14} /> {t('errorPrefix')}</div>
          {summary.blocking.slice(0, 4).map(({ requirement, status }) => <div className="blocking-item" key={requirement.id}><span>{requirement.title_en}</span><strong>{status}</strong></div>)}
          {summary.blocking.length > 4 && <div className="blocking-more">+{summary.blocking.length - 4} more</div>}
        </div> : <div className="ready-note"><CheckCircle2 size={15} /> {t('noBlocking')}</div>}
        <button type="button" className={`generate-button ${blocked ? 'disabled' : ''}`} onClick={onGenerate} disabled={blocked || isGenerating} title={blocked ? t('resolveIssues', { count: summary.blocking.length, s: summary.blocking.length === 1 ? '' : 's' }) : ''}>
          {isGenerating ? <LoaderCircle className="spin" size={18} /> : <FileCheck2 size={18} />}
          {isGenerating ? t('generating') : t('generatePackage')}
        </button>
        {blocked && <p className="generate-help">{t('resolveIssues', { count: summary.blocking.length, s: summary.blocking.length === 1 ? '' : 's' })}</p>}
        {!blocked && <button type="button" className="text-button" onClick={onReview}><RefreshCw size={14} /> {t('reviewPackage')}</button>}
      </div>

      <div className="side-card">
        <div className="side-card-title"><span>{t('packageDetails')}</span><Info size={15} /></div>
        <div className="mini-detail"><span>{t('tenderId')}</span><strong>{tender.tender_id}</strong></div>
        <div className="mini-detail"><span>{t('documentsIncluded')}</span><strong>{summary.included}</strong></div>
        <div className="mini-detail"><span>{t('uploadedFiles')}</span><strong>{files.length} / 30</strong></div>
        <div className="mini-detail"><span>{t('totalPages')}</span><strong>{summary.statuses.reduce((total, item) => total + (item.status === 'OK' ? item.file?.pageCount || 0 : 0), 2)}</strong></div>
      </div>

      <button className="export-button" type="button" onClick={onExportCsv} disabled={!requirements.length}><Files size={16} /> {t('exportChecklist')}</button>
      <button className="help-card" type="button" onClick={onHelp}><span className="help-mark">?</span><span><strong>{t('help')}</strong><small>{t('helpBody')}</small></span></button>
      <div className="privacy-side-note"><ShieldCheck size={15} /><span>{t('privacy')}</span><em>{formatBytes(files.reduce((sum, file) => sum + file.size, 0))}</em></div>
    </aside>
  );
}
