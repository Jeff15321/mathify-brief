import { Check } from 'lucide-react';

const steps = ['Your problem', 'Warm-up', 'Tutor brief'];

export function SessionSteps({ current }: { current: number }) {
  return <ol aria-label="Session progress" className="session-steps">
    {steps.map((label, index) => <li key={label} aria-current={index === current ? 'step' : undefined} data-complete={index < current}>
      <span className="step-mark" aria-hidden>{index < current ? <Check size={12} /> : index + 1}</span>{label}
    </li>)}
  </ol>;
}
