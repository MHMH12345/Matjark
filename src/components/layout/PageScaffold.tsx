import React from 'react';

export interface PageScaffoldProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  tabs?: React.ReactNode;
  children: React.ReactNode;
  contentClassName?: string;
  maxWidth?: number | string;
}

export const PageScaffold: React.FC<PageScaffoldProps> = ({
  title, description, actions, tabs, children, contentClassName = '', maxWidth = 1440,
}) => {
  const maxWidthValue = typeof maxWidth === 'number' ? maxWidth + 'px' : maxWidth;
  return (
    <section className="matjark-page-scaffold" style={{ maxWidth: maxWidthValue }} dir="rtl">
      <header className="matjark-page-header">
        <div className="matjark-page-heading">
          <h1>{title}</h1>
          {description && <p>{description}</p>}
        </div>
        {actions && <div className="matjark-page-actions">{actions}</div>}
      </header>
      {tabs && <div className="matjark-page-tabs" role="tablist">{tabs}</div>}
      <div className={'matjark-page-content ' + contentClassName}>{children}</div>
    </section>
  );
};

PageScaffold.displayName = 'PageScaffold';
