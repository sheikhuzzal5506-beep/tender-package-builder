import { useMemo, useRef, useState } from 'react';
import { AlertTriangle, Check, CircleHelp, FileCheck2, HelpCircle, LockKeyhole, LogOut, Menu, ShieldCheck, Sparkles, X } from 'lucide-react';
import Onboarding from './components/Onboarding';
import StepRail from './components/StepRail';
import HealthPanel from './components/HealthPanel';
import RequirementCard from './components/RequirementCard';
import FilePanel from './components/FilePanel';
import PreviewModal from './components/PreviewModal';
import ReviewPanel from './components/ReviewPanel';
import { makeTranslator } from './lib/i18n';
import { createTenderPackage, inspectPdf } from './lib/pdf';
import { MAX_FILES, MAX_TOTAL_BYTES, fileIsAvailable, formatBytes, getRequirementStatus, getSummary, sortRequirements, validateRequirementsPack } from './lib/validation';

function uid() {
  return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

async function sha256(buffer) {
  const digest = await globalThis.crypto.subtle.digest('SHA-256', buffer);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function App() {
  const [language, setLanguage] = useState('en');
  const t = useMemo(() => makeTranslator(language), [language]);
  const [tender, setTender] = useState(null);
  const [requirements, setRequirements] = useState([]);
  const [files, setFiles] = useState([]);
  const [matches, setMatches] = useState({});
  const [expiryDates, setExpiryDates] = useState({});
  const [loadError, setLoadError] = useState(null);
  const [uploadErrors, setUploadErrors] = useState([]);
  const [isLoadingRequirements, setIsLoadingRequirements] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewFile, setPreviewFile] = useState(null);
  const [showReview, setShowReview] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [success, setSuccess] = useState(null);
  const requirementInput = useRef(null);
  const fileBufferCache = useRef(new Map());

  const filesById = useMemo(() => Object.fromEntries(files.map((file) => [file.id, file])), [files]);
  const summary = useMemo(() => tender ? getSummary(requirements, matches, files, expiryDates, tender.submission_deadline) : null, [tender, requirements, matches, files, expiryDates]);
  const currentStep = useMemo(() => {
    if (!tender) return 0;
    if (!files.length) return 1;
    if (summary?.statuses.some(({ status }) => status === 'Missing')) return 2;
    if (summary?.statuses.some(({ status }) => status === 'Expiry date needed' || status === 'Expired')) return 3;
    return 4;
  }, [tender, files.length, summary]);

  function resetDocuments() {
    files.forEach((file) => file.objectUrl && URL.revokeObjectURL(file.objectUrl));
    setFiles([]); setMatches({}); setExpiryDates({}); fileBufferCache.current.clear();
  }

  async function loadRequirements(file) {
    if (!file) return;
    setIsLoadingRequirements(true); setLoadError(null);
    try {
      const raw = await file.text();
      let data;
      try { data = JSON.parse(raw); } catch { throw new Error(t('invalidJson')); }
      const validation = validateRequirementsPack(data);
      if (!validation.valid) {
        const first = validation.errors[0];
        const friendly = first === 'submission_deadline' ? 'submission_deadline is missing or invalid.' : first === 'tender' ? 'tender is missing.' : first === 'requirements' ? t('noRequirements') : t('badRequirement');
        throw new Error(`${t('invalidRequirements')}: ${friendly}`);
      }
      resetDocuments();
      setTender(data.tender);
      setRequirements(sortRequirements(data.requirements));
      setSuccess(null); setUploadErrors([]);
    } catch (error) {
      setLoadError(error.message || t('invalidJson'));
    } finally { setIsLoadingRequirements(false); }
  }

  function handleRequirementDrop(event) {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (!file || !file.name.toLowerCase().endsWith('.json')) { setLoadError(`${t('invalidRequirements')}: choose a .json file.`); return; }
    loadRequirements(file);
  }

  async function processPdf(record) {
    try {
      const { buffer, pageCount } = await inspectPdf(record.file);
      const hash = await sha256(buffer);
      fileBufferCache.current.set(record.id, buffer);
      setFiles((current) => current.map((file) => file.id === record.id ? { ...file, pageCount, hash, analyzing: false } : file));
    } catch {
      setFiles((current) => current.map((file) => file.id === record.id ? { ...file, analyzing: false, error: true } : file));
    }
  }

  async function addFiles(fileList) {
    if (!tender || !fileList?.length) return;
    const incoming = Array.from(fileList);
    const errors = [];
    const accepted = [];
    for (const file of incoming) {
      const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
      if (!isPdf) { errors.push(`${file.name}: ${t('onlyPdf')}`); continue; }
      accepted.push(file);
    }
    if (files.length + accepted.length > MAX_FILES) {
      errors.push(t('maxFiles'));
      accepted.splice(Math.max(0, MAX_FILES - files.length));
    }
    const currentSize = files.reduce((sum, file) => sum + file.size, 0);
    let sizeLeft = MAX_TOTAL_BYTES - currentSize;
    const withinSize = [];
    accepted.forEach((file) => {
      if (file.size > sizeLeft) errors.push(`${file.name}: ${t('maxSize')}`);
      else { withinSize.push(file); sizeLeft -= file.size; }
    });
    setUploadErrors(errors);
    if (!withinSize.length) return;
    const prepared = withinSize.map((file) => ({ id: uid(), file, name: file.name, size: file.size, type: file.type, objectUrl: URL.createObjectURL(file), pageCount: null, hash: null, analyzing: true, error: false }));
    setFiles((current) => [...current, ...prepared]);
    setIsAnalyzing(true);
    await Promise.all(prepared.map(processPdf));
    setIsAnalyzing(false);
  }

  function handleDrop(event) { event.preventDefault(); addFiles(event.dataTransfer.files); }

  function handleMatch(requirementId, fileId) {
    if (!fileId) {
      setMatches((current) => { const next = { ...current }; delete next[requirementId]; return next; });
      return;
    }
    const file = filesById[fileId];
    if (!fileIsAvailable(file, requirementId, matches, files)) {
      setUploadErrors(['This PDF is already matched, or is a duplicate of a matched PDF.']);
      return;
    }
    setMatches((current) => ({ ...current, [requirementId]: fileId }));
  }

  function handleRemoveFile(file) {
    file.objectUrl && URL.revokeObjectURL(file.objectUrl);
    setFiles((current) => current.filter((item) => item.id !== file.id));
    setMatches((current) => Object.fromEntries(Object.entries(current).filter(([, fileId]) => fileId !== file.id)));
    setUploadErrors([]);
  }

  function handleExpiry(requirementId, value) { setExpiryDates((current) => ({ ...current, [requirementId]: value })); }

  function exportChecklist() {
    const rows = [['Document', 'File Name', 'Pages', 'Expiry Date', 'Status'], ...summary.statuses.map(({ requirement, status, file }) => [requirement.title_en, file?.name || '', file?.pageCount || '', expiryDates[requirement.id] || '', status])];
    const csv = rows.map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = `${tender.tender_id}_checklist.csv`; anchor.click(); URL.revokeObjectURL(url);
  }

  async function generatePackage() {
    if (!tender || summary.blocking.length) return;
    setIsGenerating(true); setShowReview(false); setUploadErrors([]);
    try {
      const includedItems = summary.statuses.filter(({ status }) => status === 'OK').map(({ requirement, file }) => ({ requirement, file }));
      const result = await createTenderPackage({ tender, includedItems, filesById, fileBufferCache: fileBufferCache.current });
      const blob = new Blob([result.bytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a'); anchor.href = url; anchor.download = result.fileName; anchor.click();
      setSuccess({ ...result, url, optionalNotProvided: summary.optionalNotProvided });
    } catch (error) {
      setUploadErrors([`Package generation failed: ${error.message || 'Please check the uploaded PDFs and try again.'}`]);
    } finally { setIsGenerating(false); }
  }

  function startNew() {
    resetDocuments(); setTender(null); setRequirements([]); setLoadError(null); setUploadErrors([]); setSuccess(null); setShowReview(false); setIsGenerating(false);
  }

  if (!tender) return <Onboarding t={t} language={language} onLanguageChange={setLanguage} onLoad={loadRequirements} onDrop={handleRequirementDrop} isLoading={isLoadingRequirements} error={loadError} />;

  if (success) return (
    <div className="app-shell">
      <AppHeader t={t} tender={tender} language={language} onLanguageChange={setLanguage} onHelp={() => setShowHelp(true)} onReplace={startNew} />
      <main className="success-shell">
        <div className="success-mark"><Check size={32} strokeWidth={3} /></div>
        <span className="eyebrow success-eyebrow"><span className="eyebrow-dot" />{t('packageCreated')}</span>
        <h1>{t('packageReady')}</h1>
        <p className="success-file">{success.fileName}</p>
        <div className="success-stats">
          <div><strong>{success.totalPages}</strong><span>{t('totalPages')}</span></div>
          <div><strong>{success.includedCount}</strong><span>{t('documentsIncluded')}</span></div>
          <div><strong>{success.optionalNotProvided}</strong><span>{t('optionalSkipped')}</span></div>
        </div>
        <div className="success-actions">
          <a className="generate-button" href={success.url} download={success.fileName}><FileCheck2 size={18} /> {t('downloadPackage')}</a>
          <button className="secondary-button" type="button" onClick={startNew}><LogOut size={16} /> {t('startNew')}</button>
        </div>
        <div className="success-privacy"><ShieldCheck size={16} /> {t('privacy')}</div>
      </main>
      {showHelp && <HelpModal t={t} onClose={() => setShowHelp(false)} />}
    </div>
  );

  return <div className="app-shell">
    <AppHeader t={t} tender={tender} language={language} onLanguageChange={setLanguage} onHelp={() => setShowHelp(true)} onReplace={startNew} />
    <div className="app-content"><StepRail t={t} currentStep={currentStep} />
      <main className="dashboard-grid">
        <div className="main-column">
          <section className="overview-card">
            <div className="overview-main"><span className="section-kicker">{t('overview')}</span><div className="tender-id-line"><span className="tender-id-badge">{tender.tender_id}</span><span className="status-dot-label"><span className="status-dot live" /> {t('allLocal')}</span></div><h1>{tender.title}</h1><p className="overview-entity">{tender.procuring_entity}</p></div>
            <div className="overview-meta"><div><span>{t('bidder')}</span><strong>{tender.bidder}</strong></div><div><span>{t('submissionDeadline')}</span><strong>{tender.submission_deadline}</strong></div></div>
          </section>
          <div className="upload-error-stack">{uploadErrors.map((error, index) => <div className="upload-error" role="alert" key={`${error}-${index}`}><AlertTriangle size={16} /><span>{error}</span><button type="button" onClick={() => setUploadErrors((current) => current.filter((_, itemIndex) => itemIndex !== index))} aria-label={t('close')}><X size={15} /></button></div>)}</div>
          <section className="workspace-section requirements-section"><div className="section-heading-row"><div><span className="section-kicker">03 / {t('steps')[2]}</span><h2>{t('requirements')}</h2><p>{t('requirementsSubtitle')}</p></div><div className="requirement-count"><strong>{summary.included}</strong><span>/ {requirements.length} {t('included')}</span></div></div><div className="requirements-list">{summary.statuses.map(({ requirement, status, file }) => <RequirementCard key={requirement.id} requirement={requirement} index={requirements.indexOf(requirement)} status={status} file={file} files={files} matches={matches} expiryDate={expiryDates[requirement.id]} language={language} t={t} onMatch={handleMatch} onExpiry={handleExpiry} onPreview={setPreviewFile} onUseSuggestion={(fileId) => handleMatch(requirement.id, fileId)} />)}</div></section>
          <FilePanel t={t} files={files} requirements={requirements} matches={matches} onDrop={handleDrop} onPick={addFiles} onPreview={setPreviewFile} onRemove={handleRemoveFile} isAnalyzing={isAnalyzing} />
        </div>
        <HealthPanel t={t} summary={summary} requirements={requirements} files={files} tender={tender} isGenerating={isGenerating} onGenerate={generatePackage} onReview={() => setShowReview(true)} onExportCsv={exportChecklist} onHelp={() => setShowHelp(true)} />
      </main>
    </div>
    {previewFile && <PreviewModal file={previewFile} t={t} onClose={() => setPreviewFile(null)} />}
    {showReview && <ReviewPanel t={t} tender={tender} summary={summary} requirements={requirements} language={language} expiryDates={expiryDates} isGenerating={isGenerating} onClose={() => setShowReview(false)} onGenerate={generatePackage} />}
    {showHelp && <HelpModal t={t} onClose={() => setShowHelp(false)} />}
  </div>;
}

function AppHeader({ t, tender, language, onLanguageChange, onHelp, onReplace }) {
  return <header className="app-header"><div className="header-brand"><span className="brand-mark"><span /></span><div><strong>{t('appName')}</strong><span>{tender.tender_id} · {t('appShort')}</span></div></div><div className="header-actions"><div className="header-tender"><span>{t('tenderId')}</span><strong>{tender.tender_id}</strong></div><button className="header-button" type="button" onClick={onHelp}><CircleHelp size={16} /> {t('help')}</button><button className="language-toggle" type="button" onClick={() => onLanguageChange(language === 'en' ? 'bn' : 'en')}><span className={language === 'en' ? 'active' : ''}>EN</span><span className="language-divider">/</span><span className={language === 'bn' ? 'active' : ''}>বাংলা</span></button><button className="header-icon-button" type="button" onClick={onReplace} title={t('replaceTender')} aria-label={t('replaceTender')}><Menu size={17} /></button></div></header>;
}

function HelpModal({ t, onClose }) {
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><div className="help-modal" role="dialog" aria-modal="true" aria-label={t('help')}><header><span className="help-modal-icon"><HelpCircle size={22} /></span><div><span className="section-kicker">{t('appName')}</span><h2>{t('help')}</h2></div><button className="close-button" type="button" onClick={onClose} aria-label={t('close')}><X size={19} /></button></header><p>{t('helpBody')}</p><div className="help-points"><div><span>01</span><strong>{t('steps')[1]}</strong><small>{t('uploadNext')}</small></div><div><span>02</span><strong>{t('steps')[2]}</strong><small>{t('matchNext')}</small></div><div><span>03</span><strong>{t('steps')[3]}</strong><small>{t('datesNext')}</small></div><div><span>04</span><strong>{t('steps')[5]}</strong><small>{t('readyNext')}</small></div></div><div className="help-privacy"><LockKeyhole size={15} /> {t('privacy')}</div></div></div>;
}

export default App;
