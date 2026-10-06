import { FileJson, LockKeyhole, ArrowRight, UploadCloud, ShieldCheck } from 'lucide-react';

export default function Onboarding({ t, language, onLanguageChange, onLoad, onDrop, isLoading, error }) {
  return (
    <main className="onboarding-shell">
      <header className="onboarding-topbar">
        <div className="brand-lockup">
          <span className="brand-mark"><span /></span>
          <span>{t('appName')}</span>
        </div>
        <div className="topbar-actions">
          <span className="privacy-chip"><LockKeyhole size={14} /> {t('allLocal')}</span>
          <button className="language-toggle" type="button" onClick={() => onLanguageChange(language === 'en' ? 'bn' : 'en')}>
            <span className={language === 'en' ? 'active' : ''}>EN</span>
            <span className="language-divider">/</span>
            <span className={language === 'bn' ? 'active' : ''}>বাংলা</span>
          </button>
        </div>
      </header>

      <section className="onboarding-grid">
        <div className="onboarding-copy">
          <div className="eyebrow"><span className="eyebrow-dot" />{t('eyebrow')}</div>
          <h1>{t('introTitle')}</h1>
          <p className="intro-text">{t('introBody')}</p>
          <div className="feature-stack">
            <div className="feature-line"><span className="feature-icon"><ShieldCheck size={18} /></span><div><strong>{t('secureLocal')}</strong><span>{t('localProcessing')}</span></div></div>
            <div className="feature-line"><span className="feature-icon"><FileJson size={18} /></span><div><strong>JSON-led workflow</strong><span>Bring any tender pack with a predictable requirements file.</span></div></div>
          </div>
        </div>

        <div className="import-card-wrap">
          <div className="import-card">
            <div className="import-card-top">
              <div className="card-kicker">01 / {t('steps')[0]}</div>
              <div className="card-icon"><FileJson size={21} /></div>
            </div>
            <h2>{t('loadRequirements')}</h2>
            <p>{t('requirementsHint')}</p>
            <label className="dropzone dropzone-json" onDragOver={(event) => event.preventDefault()} onDrop={onDrop}>
              <input type="file" accept="application/json,.json" onChange={(event) => onLoad(event.target.files?.[0])} />
              <span className="dropzone-icon"><UploadCloud size={22} /></span>
              <span className="dropzone-title">{t('dropRequirements')}</span>
              <span className="dropzone-subtitle">{t('requirementsHint')}</span>
              <span className="primary-button compact"><span>{isLoading ? 'Loading…' : t('chooseFiles')}</span><ArrowRight size={16} /></span>
            </label>
            {error && <div className="inline-error" role="alert">{error}</div>}
            <div className="privacy-note"><LockKeyhole size={15} /><span>{t('privacy')}</span></div>
          </div>
          <div className="import-shadow" />
        </div>
      </section>
      <div className="onboarding-footer"><span>{t('latestChrome')}</span><span>•</span><span>v1.0 · {t('allLocal')}</span></div>
    </main>
  );
}
