import React from 'react';
import { MuiCard } from './MuiCard';

export type MetricTone = 'primary' | 'secondary' | 'tertiary' | 'success' | 'warning' | 'error';
export type MetricValueTone = 'default' | MetricTone;

export interface MetricCardProps {
  label: string;
  value: React.ReactNode;
  icon: React.ReactNode;
  tone?: MetricTone;
  valueTone?: MetricValueTone;
  supportingText?: React.ReactNode;
  badge?: React.ReactNode;
  className?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  icon,
  tone = 'primary',
  valueTone = 'default',
  supportingText,
  badge,
  className = '',
}) => (
  <MuiCard
    variant="outlined"
    className={`matjark-surface-card matjark-metric-card matjark-metric-card--${tone} ${className}`.trim()}
  >
    <div className="matjark-metric-card__content">
      <div className="matjark-metric-card__copy">
        <div className="matjark-metric-card__heading">
          <span className="matjark-metric-card__label">{label}</span>
          {badge && <span className="matjark-metric-card__badge">{badge}</span>}
        </div>
        <strong className={`matjark-metric-card__value matjark-metric-card__value--${valueTone}`}>
          {value}
        </strong>
        {supportingText && (
          <span className="matjark-metric-card__supporting">{supportingText}</span>
        )}
      </div>
      <span className="matjark-metric-card__icon" aria-hidden="true">
        {icon}
      </span>
    </div>
  </MuiCard>
);

MetricCard.displayName = 'MetricCard';
