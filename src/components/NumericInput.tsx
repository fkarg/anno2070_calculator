type NumericInputProps = {
  id: string;
  label: string;
  raw: string;
  valid: boolean;
  onChange: (raw: string) => void;
  className?: string;
  placeholder?: string;
  inputMode?: 'numeric' | 'decimal';
  disabled?: boolean;
  // Structurally hides the label text (screen-reader only). Prefer this over
  // scoped CSS hiding, which has broken across browsers before.
  hideLabel?: boolean;
};

export function NumericInput({
  id,
  label,
  raw,
  valid,
  onChange,
  className,
  placeholder,
  inputMode = 'numeric',
  disabled = false,
  hideLabel = false,
}: NumericInputProps) {
  return (
    <label htmlFor={id} className={className}>
      <span className={hideLabel ? 'visually-hidden' : undefined}>{label}</span>
      <input
        id={id}
        type="text"
        inputMode={inputMode}
        value={raw}
        aria-invalid={!valid}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}
