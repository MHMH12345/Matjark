import React from 'react';

export interface PageScaffoldProps {
  title: string;
  description?: string;
  eyebrow?: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  tabs?: React.ReactNode;
  children: React.ReactNode;
  contentClassName?: string;
  maxWidth?: number | string;
}

/**
 * Content-only page frame.
 * The active page title and user controls live in the application-wide top bar.
 */
export const PageScaffold: React.FC<PageScaffoldProps> = ({
  children,
  contentClassName = '',
  maxWidth = '100%',
  tabs,
}) => {
  const maxWidthValue = typeof maxWidth === 'number' ? maxWidth + 'px' : maxWidth;
  return (
    <section className="matjark-page-scaffold" style={{ maxWidth: maxWidthValue }} dir="rtl">
      {tabs && <div className="matjark-page-tabs" role="tablist">{tabs}</div>}
      <div className={'matjark-page-content ' + contentClassName}>{children}</div>
    </section>
  );
};

PageScaffold.displayName = 'PageScaffold';
