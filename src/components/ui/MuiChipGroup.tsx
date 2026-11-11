import React, { memo } from 'react';
import { Chip as MaterialChip, Chips as MaterialChips } from 'material/react';
import { renderToStaticMarkup } from 'react-dom/server';

export interface MuiChipGroupOption {
  value: string;
  label: string;
  icon?: React.ReactElement;
  disabled?: boolean;
}

export interface MuiChipGroupProps {
  value: string;
  options: MuiChipGroupOption[];
  onChange: (value: string) => void;
  ariaLabel: string;
  scrollable?: boolean;
  className?: string;
}

const MChips = MaterialChips as React.ComponentType<any>;
const MChip = MaterialChip as React.ComponentType<any>;

export const MuiChipGroup: React.FC<MuiChipGroupProps> = memo(({
  value,
  options,
  onChange,
  ariaLabel,
  scrollable = false,
  className = '',
}) => {
  const handleChange = (event: CustomEvent<{ value?: string | null }>) => {
    const nextValue = event.detail?.value;
    if (typeof nextValue === 'string') onChange(nextValue);
  };

  return (
    <MChips
      value={value}
      selection="single"
      selectionRequired
      scrollable={scrollable}
      aria-label={ariaLabel}
      onChange={handleChange}
      className={`matjark-chip-group ${className}`}
    >
      {options.map((option) => (
        <MChip
          key={option.value}
          value={option.value}
          variant="filter"
          disabled={option.disabled}
          icon={option.icon ? renderToStaticMarkup(option.icon) : undefined}
        >
          {option.label}
        </MChip>
      ))}
    </MChips>
  );
});

MuiChipGroup.displayName = 'MuiChipGroup';
