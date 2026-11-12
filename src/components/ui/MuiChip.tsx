import React, { memo } from 'react';
import { Chip as MaterialChip, Chips as MaterialChips } from 'material/react';
import { renderToStaticMarkup } from 'react-dom/server';

export interface MuiChipProps {
  label: React.ReactNode;
  icon?: React.ReactNode;
  color?: 'primary' | 'secondary' | 'success' | 'error' | 'warning' | 'default';
  variant?: 'filled' | 'outlined';
  size?: 'small' | 'medium';
  onClick?: () => void;
  onDelete?: () => void;
  className?: string;
}

const MChips = MaterialChips as React.ComponentType<any>;
const MChip = MaterialChip as React.ComponentType<any>;

const iconMarkup = (node: React.ReactNode) =>
  node && React.isValidElement(node) ? renderToStaticMarkup(node) : undefined;

export const MuiChip: React.FC<MuiChipProps> = memo(({
  label,
  icon,
  color = 'default',
  variant = 'filled',
  size = 'medium',
  onClick,
  onDelete,
  className = '',
}) => {
  const handleChange = () => onClick?.();

  return (
    <span className={`matjark-chip-host matjark-chip--${color} matjark-chip--${size} ${variant === 'outlined' ? 'matjark-chip--outlined' : ''} ${className}`.trim()}>
      <MChips
        selection={onClick ? 'single' : 'none'}
        onChange={handleChange}
        className="matjark-native-chip-set"
      >
        <MChip
          value="matjark-chip"
          variant={onClick ? 'filter' : 'assist'}
          icon={iconMarkup(icon)}
        >
          {label}
        </MChip>
      </MChips>
      {onDelete && (
        <button
          type="button"
          className="matjark-chip-delete"
          aria-label="حذف"
          onClick={onDelete}
        >
          ×
        </button>
      )}
    </span>
  );
});

MuiChip.displayName = 'MuiChip';
