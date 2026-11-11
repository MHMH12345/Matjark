import React, { memo } from 'react';
import { Select as MaterialSelect, SelectOption } from 'material/react';

export interface MuiSelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'onChange' | 'size'> {
  label?: string;
  helperText?: string;
  onChange?: (event: React.ChangeEvent<HTMLSelectElement>) => void;
}
const MSelect = MaterialSelect as React.ComponentType<any>;
const MOption = SelectOption as React.ComponentType<any>;

export const MuiSelect: React.FC<MuiSelectProps> = memo(({
  children, label, helperText, onChange, className='', ...rest
}) => {
  const handleChange = (event: CustomEvent<{value: string | null}>) => {
    if (!onChange) return;
    const target = { value: event.detail?.value ?? '' } as HTMLSelectElement;
    onChange({ target, currentTarget: target } as React.ChangeEvent<HTMLSelectElement>);
  };
  return (
    <MSelect
      {...rest}
      label={label}
      supportingText={helperText}
      variant="outlined"
      onChange={handleChange}
      className={`matjark-select ${className}`}
    >
      {React.Children.map(children, child => {
        if (!React.isValidElement(child) || child.type !== 'option') return child;
        const props = child.props as React.OptionHTMLAttributes<HTMLOptionElement>;
        return <MOption value={String(props.value ?? '')} disabled={props.disabled}>{props.children}</MOption>;
      })}
    </MSelect>
  );
});
MuiSelect.displayName = 'MuiSelect';
