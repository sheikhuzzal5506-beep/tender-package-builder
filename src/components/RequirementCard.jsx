import { CalendarDays, Check, ChevronDown, FileText, Link2, MoreHorizontal, Unlink, AlertCircle } from 'lucide-react';
import { fileIsAvailable, formatBytes, getMatchSuggestion, statusLabel } from '../lib/validation';

function StatusIcon({ status }) {
  if (status === 'OK') return <Check size={14} strokeWidth={3} />;
  if (status === 'Not provided') return <MoreHorizontal size={15} />;
  return <AlertCircle size={14} />;
}

export default function RequirementCard({ requirement, index, status, file, files, matches, expiryDate, language, t, onMatch, onExpiry, onPreview, onUseSuggestion }) {
  const suggestion = !file ? getMatchSuggestion(requirement, files) : null;
  return (
    <article className={`requirement-card status-${status.toLowerCase().replaceAll(' ', '-')}`}>
      <div className="requirement-index">{String(index + 1).padStart(2, '0')}</div>
      <div className="requirement-main">
        <div className="requirement-title-row">
          <h3>{language === 'bn' ? requirement.title_bn : requirement.title_en}</h3>
          <div className="badge-row"><span className={`tiny-badge ${requirement.mandatory ? 'required' : 'optional'}`}>{requirement.mandatory ? t('required') : t('optional')}</span>{requirement.has_expiry && <span className="tiny-badge expiry-badge"><CalendarDays size={12} /> {t('expiryRequired')}</span>}</div>
        </div>
        <div className="requirement-id">{requirement.id} · {language === 'bn' ? requirement.title_en : requirement.title_bn}</div>
        {file ? <div className="matched-file-row">
          <span className="pdf-mini"><FileText size={16} /></span>
          <div className="matched-file-info"><strong>{file.name}</strong><span>{file.pageCount || '—'} {file.pageCount === 1 ? t('page') : t('pages')} · {formatBytes(file.size)}</span></div>
          <button className="ghost-icon-button" type="button" onClick={() => onPreview(file)} aria-label={`${t('preview')} ${file.name}`} title={t('preview')}><Link2 size={16} /></button>
        </div> : suggestion ? <div className="suggestion-row"><span className="suggestion-dot" /><span><small>{t('suggested')}</small><strong>{suggestion.name}</strong></span><button type="button" className="suggestion-button" onClick={() => onUseSuggestion(suggestion.id)}>{t('useSuggestion')}</button></div> : <div className="empty-match"><FileText size={15} /> {t('noMatch')}</div>}
        {file && requirement.has_expiry && <label className="expiry-field"><span>{t('expiry')}</span><input type="date" value={expiryDate || ''} onChange={(event) => onExpiry(requirement.id, event.target.value)} onInput={(event) => onExpiry(requirement.id, event.target.value)} aria-label={`${t('expiry')} ${requirement.title_en}`} /><small>{t('expiryHelp')}</small></label>}
      </div>
      <div className="requirement-actions">
        <span className={`status-pill ${status === 'OK' ? 'success' : status === 'Not provided' ? 'neutral' : status === 'Expiry date needed' ? 'warning' : 'danger'}`} aria-label={status}><StatusIcon status={status} /> {statusLabel(status, t)}</span>
        <div className="match-control"><select value={file?.id || ''} onChange={(event) => onMatch(requirement.id, event.target.value)} aria-label={`${t('chooseDocument')}: ${requirement.title_en}`}>
          <option value="">{file ? t('change') : t('chooseDocument')}</option>
          {files.filter((candidate) => !candidate.error).map((candidate) => <option key={candidate.id} value={candidate.id} disabled={!fileIsAvailable(candidate, requirement.id, matches, files) && candidate.id !== file?.id}>{candidate.name}{candidate.hash && files.filter((item) => item.hash === candidate.hash).length > 1 ? ' · duplicate' : ''}</option>)}
        </select><ChevronDown size={15} /></div>
        {file && <button className="unlink-button" type="button" onClick={() => onMatch(requirement.id, '')}><Unlink size={14} /> {t('removeMatch')}</button>}
      </div>
    </article>
  );
}
