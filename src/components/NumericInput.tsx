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
}: NumericInputProps) {
  return (
    <label htmlFor={id} className={className}>
      <span>{label}</span>
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
