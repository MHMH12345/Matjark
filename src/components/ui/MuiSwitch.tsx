import React, { memo } from 'react';
import { Switch as MaterialSwitch } from 'material/react';
export interface MuiSwitchProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'size'> {
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  label?: React.ReactNode;
}
const MSwitch = MaterialSwitch as React.ComponentType<any>;
export const MuiSwitch: React.FC<MuiSwitchProps> = memo(({checked, defaultChecked, onChange, label, className='', ...rest}) => {
  const handleChange = (event: CustomEvent<{checked: boolean}>) => {
    if (!onChange) return;
    const target = { checked: !!event.detail?.checked } as HTMLInputElement;
    onChange({target, currentTarget: target} as React.ChangeEvent<HTMLInputElement>);
  };
  return <MSwitch {...rest} checked={checked} defaultChecked={defaultChecked} onChange={handleChange} className={`matjark-switch ${className}`}>{label}</MSwitch>;
});
MuiSwitch.displayName = 'MuiSwitch';
