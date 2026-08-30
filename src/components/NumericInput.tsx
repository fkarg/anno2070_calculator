type NumericInputProps = {
  id: string;
  label: string;
  raw: string;
  valid: boolean;
  onChange: (raw: string) => void;
  className?: string;
  placeholder?: string;
};

export function NumericInput({
  id,
  label,
  raw,
  valid,
  onChange,
  className,
  placeholder,
}: NumericInputProps) {
  return (
    <label htmlFor={id} className={className}>
      <span>{label}</span>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        value={raw}
        aria-invalid={!valid}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

