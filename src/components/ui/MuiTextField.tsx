import React, { memo, forwardRef } from 'react';
import { TextField as MaterialTextField } from 'material/react';
import { renderToStaticMarkup } from 'react-dom/server';

export interface MuiTextFieldProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'size'> {
  label?: string;
  helperText?: string;
  error?: boolean;
  startAdornment?: React.ReactNode;
  endAdornment?: React.ReactNode;
  fullWidth?: boolean;
  density?: 'default' | 'compact';
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
}
const MTextField = MaterialTextField as React.ComponentType<any>;
const iconMarkup = (node: React.ReactNode) => node && React.isValidElement(node) ? renderToStaticMarkup(node) : undefined;

export const MuiTextField = memo(forwardRef<HTMLInputElement, MuiTextFieldProps>(({
  label, helperText, error=false, startAdornment, endAdornment, fullWidth=false, density='default',
  className='', onChange, ...rest
}, ref) => {
  const handleInput = (event: CustomEvent<{value: string}>) => {
    if (!onChange) return;
    const target = { value: event.detail?.value ?? '' } as HTMLInputElement;
    onChange({ target, currentTarget: target } as React.ChangeEvent<HTMLInputElement>);
  };
  return (
    <MTextField
      ref={ref}
      {...rest}
      label={label}
      supportingText={helperText}
      error={error}
      leadingIcon={iconMarkup(startAdornment)}
      trailingIcon={iconMarkup(endAdornment)}
      variant="outlined"
      density={density}
      onInput={handleInput}
      className={`matjark-text-field ${fullWidth ? 'matjark-field--full' : ''} ${className}`}
    />
  );
}));
MuiTextField.displayName = 'MuiTextField';
