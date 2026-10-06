import { Check, Circle } from 'lucide-react';

export default function StepRail({ t, currentStep }) {
  const steps = t('steps');
  return (
    <div className="step-rail" aria-label={t('workflow')}>
      {steps.map((step, index) => {
        const done = index < currentStep;
        const active = index === currentStep;
        return <div className={`step-item ${done ? 'done' : ''} ${active ? 'active' : ''}`} key={step}>
          <span className="step-circle">{done ? <Check size={13} strokeWidth={3} /> : <Circle size={9} fill="currentColor" />}</span>
          <span>{step}</span>
          {index < steps.length - 1 && <span className="step-connector" />}
        </div>;
      })}
    </div>
  );
}
