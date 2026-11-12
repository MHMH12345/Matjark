import React, { memo } from 'react';
import { Card as MaterialCard } from 'material/react';

export interface MuiCardProps extends React.HTMLAttributes<HTMLElement> {
  variant?: 'elevated' | 'filled' | 'outlined';
  fullWidth?: boolean;
}

const MCard = MaterialCard as React.ComponentType<any>;

export const MuiCard: React.FC<MuiCardProps> = memo(({
  children,
  variant = 'outlined',
  fullWidth = true,
  className = '',
  style,
  ...rest
}) => (
  <MCard
    {...rest}
    variant={variant}
    fullWidth={fullWidth}
    className={`matjark-surface-card ${className}`.trim()}
    style={style}
  >
    {children}
  </MCard>
));

MuiCard.displayName = 'MuiCard';
