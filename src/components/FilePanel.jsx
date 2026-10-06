import { AlertCircle, CheckCircle2, Eye, FileText, LoaderCircle, Trash2, Copy } from 'lucide-react';
import { formatBytes } from '../lib/validation';

export default function FilePanel({ t, files, requirements, matches, onDrop, onPick, onPreview, onRemove, isAnalyzing }) {
  const requirementForFile = (file) => requirements.find((requirement) => matches[requirement.id] === file.id);
  return (
    <section className="workspace-section files-section">
      <div className="section-heading-row"><div><span className="section-kicker">02 / {t('steps')[1]}</span><h2>{t('uploadedFiles')}</h2><p>{t('uploadedSubtitle')}</p></div><label className="secondary-button add-files"><input type="file" accept="application/pdf,.pdf" multiple onChange={(event) => onPick(event.target.files)} /> <FileText size={16} /> {t('addPdfs')}</label></div>
      <div className="file-dropzone" onDragOver={(event) => event.preventDefault()} onDrop={onDrop}>
        <div className="file-drop-copy"><span className="drop-icon"><FileText size={19} /></span><div><strong>{t('dropPdfs')}</strong><span>{t('dropPdfsHint')}</span></div></div>
        <label className="outline-button"><input type="file" accept="application/pdf,.pdf" multiple onChange={(event) => onPick(event.target.files)} /> {t('chooseFiles')}</label>
      </div>
      {isAnalyzing && <div className="analyzing-bar"><LoaderCircle className="spin" size={16} /> Analyzing PDFs locally…</div>}
      {!files.length ? <div className="file-empty"><div className="file-empty-art"><FileText size={26} /></div><strong>{t('noDocuments')}</strong><span>{t('noDocumentsBody')}</span></div> : <div className="file-list">
        {files.map((file) => {
          const matched = requirementForFile(file);
          const isDuplicate = file.hash && files.filter((item) => item.hash === file.hash).length > 1;
          return <div className={`file-row ${file.error ? 'file-error' : ''}`} key={file.id}>
            <div className="file-type-icon"><FileText size={18} /></div>
            <div className="file-name-block"><strong title={file.name}>{file.name}</strong><span>{file.pageCount ? `${file.pageCount} ${file.pageCount === 1 ? t('page') : t('pages')}` : file.error ? t('parseError') : 'Analyzing…'} · {formatBytes(file.size)}</span></div>
            {isDuplicate && <span className="duplicate-chip"><Copy size={12} /> {t('duplicateFile')}</span>}
            {file.error ? <span className="file-status error"><AlertCircle size={14} /> {t('parseError')}</span> : matched ? <span className="file-match"><CheckCircle2 size={14} /> {matched.id}</span> : <span className="file-status"><span className="status-dot" /> {t('unmatched')}</span>}
            <div className="file-actions">{!file.error && <button type="button" className="icon-button" onClick={() => onPreview(file)} title={t('preview')} aria-label={`${t('preview')} ${file.name}`}><Eye size={16} /></button>}<button type="button" className="icon-button danger-icon" onClick={() => onRemove(file)} title={t('remove')} aria-label={`${t('remove')} ${file.name}`}><Trash2 size={16} /></button></div>
          </div>;
        })}
      </div>}
      {files.some((file) => file.hash && files.filter((item) => item.hash === file.hash).length > 1) && <div className="duplicate-callout"><Copy size={16} /><span><strong>{t('duplicateFile')}</strong>{t('duplicateBody')}</span></div>}
    </section>
  );
}
