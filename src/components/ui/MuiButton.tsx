import React, { memo } from 'react';
import { Button as MaterialButton } from 'material/react';
import { renderToStaticMarkup } from 'react-dom/server';

export interface MuiButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'color'> {
  variant?: 'contained' | 'outlined' | 'text';
  color?: 'primary' | 'secondary' | 'success' | 'error' | 'warning' | 'inherit';
  size?: 'small' | 'medium' | 'large';
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
  fullWidth?: boolean;
}

const MButton = MaterialButton as React.ComponentType<any>;
const sizes = { small: 's', medium: 'm', large: 'l' } as const;
const variants = { contained: 'filled', outlined: 'outlined', text: 'text' } as const;
const palette: Record<string, React.CSSProperties> = {
  primary: { '--mtrl-sys-color-primary': 'var(--md-sys-color-primary)', '--mtrl-sys-color-on-primary': 'var(--md-sys-color-on-primary)' } as React.CSSProperties,
  secondary: { '--mtrl-sys-color-primary': '#625b71', '--mtrl-sys-color-on-primary': '#ffffff' } as React.CSSProperties,
  success: { '--mtrl-sys-color-primary': '#2e7d32', '--mtrl-sys-color-on-primary': '#ffffff' } as React.CSSProperties,
  error: { '--mtrl-sys-color-primary': '#ba1a1a', '--mtrl-sys-color-on-primary': '#ffffff' } as React.CSSProperties,
  warning: { '--mtrl-sys-color-primary': '#865300', '--mtrl-sys-color-on-primary': '#ffffff' } as React.CSSProperties,
};
const iconMarkup = (node: React.ReactNode) => node && React.isValidElement(node) ? renderToStaticMarkup(node) : undefined;

export const MuiButton: React.FC<MuiButtonProps> = memo(({
  children, variant='contained', color='primary', size='medium', startIcon, endIcon,
  fullWidth=false, className='', style, ...rest
}) => (
  <MButton
    {...rest}
    variant={variants[variant]}
    size={sizes[size]}
    shape="round"
    icon={iconMarkup(startIcon || endIcon)}
    iconPosition={startIcon ? 'start' : endIcon ? 'end' : undefined}
    className={`matjark-button matjark-button--${color} ${fullWidth ? 'matjark-button--full' : ''} ${className}`}
    style={{ ...(palette[color] || {}), ...(style || {}), width: fullWidth ? '100%' : undefined }}
  >
    {children}
  </MButton>
));
MuiButton.displayName = 'MuiButton';
