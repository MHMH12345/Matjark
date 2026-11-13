import React, { useCallback } from 'react';

export interface PinFieldProps {
  value: string;
  onChange: (value: string) => void;
  length?: 4 | 5 | 6;
  error?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  onComplete?: (value: string) => void;
  ariaLabel?: string;
}

export const PinField: React.FC<PinFieldProps> = ({
  value,
  onChange,
  length = 4,
  error,
  disabled = false,
  autoFocus = false,
  onComplete,
  ariaLabel = 'رمز PIN',
}) => {
  const handleChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const nextValue = event.target.value.replace(/\D/g, '').slice(0, length);
    onChange(nextValue);
    if (nextValue.length === length) onComplete?.(nextValue);
  }, [length, onChange, onComplete]);

  return (
    <div className="matjark-pin-field" dir="ltr">
      <input
        type="password"
        inputMode="numeric"
        pattern="[0-9]*"
        autoComplete="one-time-code"
        maxLength={length}
        value={value}
        onChange={handleChange}
        disabled={disabled}
        autoFocus={autoFocus}
        aria-label={ariaLabel}
        aria-invalid={Boolean(error)}
        className="w-full min-h-14 rounded-xl border border-[var(--md-sys-color-outline)] bg-[var(--md-sys-color-surface)] px-4 text-center text-2xl font-semibold tracking-[0.65em] text-[var(--md-sys-color-on-surface)] outline-none focus:border-[var(--md-sys-color-primary)] focus:ring-2 focus:ring-[var(--md-sys-color-primary)]/20 disabled:opacity-50"
      />
      {error && <p role="alert" className="mt-2 text-sm text-[var(--md-sys-color-error)]" dir="rtl">{error}</p>}
    </div>
  );
};

PinField.displayName = 'PinField';
