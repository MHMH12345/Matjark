import React from 'react';

export type DateTimeFormat = 'date' | 'dateTime' | 'compact' | 'time';

export interface DateTimeProps {
  value: Date | number | string | null | undefined;
  format?: DateTimeFormat;
  className?: string;
  title?: string;
}

export function formatStoreDateTime(value: Date | number | string | null | undefined, format: DateTimeFormat = 'dateTime'): string {
  const date = value instanceof Date ? value : new Date(value ?? NaN);
  if (!Number.isFinite(date.getTime())) return '—';

  const options: Intl.DateTimeFormatOptions =
    format === 'date'
      ? { year: 'numeric', month: 'long', day: 'numeric' }
      : format === 'time'
        ? { hour: '2-digit', minute: '2-digit', hour12: false }
        : format === 'compact'
          ? { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }
          : { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false };

  return new Intl.DateTimeFormat('ar-EG-u-nu-latn', options).format(date);
}

export const DateTime: React.FC<DateTimeProps> = ({ value, format = 'dateTime', className = '', title }) => {
  const date = value instanceof Date ? value : new Date(value ?? NaN);
  const valid = Number.isFinite(date.getTime());
  const text = formatStoreDateTime(value, format);

  return <time className={'matjark-date-time ' + className} dateTime={valid ? date.toISOString() : undefined} title={title}>{text}</time>;
};

DateTime.displayName = 'DateTime';
