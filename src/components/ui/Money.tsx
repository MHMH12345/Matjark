import React from 'react';
import { formatEgp } from '../../utils/currency';

export interface MoneyProps {
  amount: number | null | undefined;
  currency?: string;
  currencyFormat?: 'ar' | 'en' | 'both';
  compact?: boolean;
  className?: string;
  title?: string;
}

export const Money: React.FC<MoneyProps> = ({
  amount,
  currency = 'ج.م',
  currencyFormat = 'ar',
  compact = false,
  className = '',
  title,
}) => {
  const value = formatEgp(amount, {
    customSymbol: currency,
    codeOnly: currencyFormat === 'en',
    showCode: currencyFormat === 'both',
    compact,
  });

  return <span className={'matjark-money ' + className} dir="ltr" title={title || value}>{value}</span>;
};

Money.displayName = 'Money';
