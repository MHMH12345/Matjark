import React, { memo } from 'react';
import { IconButton as MaterialIconButton } from 'material/react';
import { renderToStaticMarkup } from 'react-dom/server';

export interface MuiIconButtonProps {
  id?: string;
  icon: React.ReactElement;
  ariaLabel: string;
  title?: string;
  variant?: 'standard' | 'filled' | 'tonal' | 'outlined';
  size?: 'extraSmall' | 'small' | 'medium' | 'large';
  shape?: 'round' | 'square';
  disabled?: boolean;
  className?: string;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  style?: React.CSSProperties;
}

const MIconButton = MaterialIconButton as React.ComponentType<any>;
const sizes = {
  extraSmall: 'xs',
  small: 's',
  medium: 'm',
  large: 'l',
} as const;

export const MuiIconButton: React.FC<MuiIconButtonProps> = memo(({
  id,
  icon,
  ariaLabel,
  title,
  variant = 'standard',
  size = 'small',
  shape = 'round',
  disabled = false,
  className = '',
  onClick,
  style,
}) => {
  const iconMarkup = renderToStaticMarkup(icon);

  return (
    <MIconButton
      id={id}
      icon={iconMarkup}
      ariaLabel={ariaLabel}
      title={title || ariaLabel}
      variant={variant}
      size={sizes[size]}
      shape={shape}
      disabled={disabled}
      onClick={onClick}
      className={`matjark-icon-button ${className}`}
      style={style}
    />
  );
});

MuiIconButton.displayName = 'MuiIconButton';
