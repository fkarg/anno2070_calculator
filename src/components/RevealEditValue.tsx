import { NumericInput } from './NumericInput';

// A number that reads as plain text and becomes an input on hover/focus.
// Manual values stay rendered as (amber) inputs via the wrapper's modifier.
export function RevealEditValue({
  id,
  label,
  raw,
  valid,
  manual,
  onChange,
}: {
  id: string;
  label: string;
  raw: string;
  valid: boolean;
  manual: boolean;
  onChange: (raw: string) => void;
}) {
  return (
    <span className={`reveal-edit reveal-edit--inline${manual ? ' reveal-edit--manual' : ''}`}>
      <output aria-hidden="true">{valid ? (raw === '' ? '—' : raw) : '—'}</output>
      <NumericInput id={id} label={label} raw={raw} valid={valid} placeholder="—" hideLabel onChange={onChange} />
    </span>
  );
}
