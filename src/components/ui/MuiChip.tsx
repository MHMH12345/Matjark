import React, { memo } from 'react';

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
export const MuiChip: React.FC<MuiChipProps> = memo(({
  label, icon, color='default', variant='filled', size='medium', onClick, onDelete, className=''
}) => (
  <span
    role={onClick ? 'button' : undefined}
    tabIndex={onClick ? 0 : undefined}
    onClick={onClick}
    onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') onClick(); } : undefined}
    className={`matjark-chip matjark-chip--${color} matjark-chip--${size} ${variant === 'outlined' ? 'matjark-chip--outlined' : ''} ${onClick ? 'matjark-chip--interactive' : ''} ${className}`}
  >
    {icon}
    <span>{label}</span>
    {onDelete && <button type="button" aria-label="حذف" onClick={(e) => { e.stopPropagation(); onDelete(); }}>×</button>}
  </span>
));
MuiChip.displayName = 'MuiChip';
