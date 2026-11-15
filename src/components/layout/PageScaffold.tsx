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

export const PageScaffold: React.FC<PageScaffoldProps> = ({
  title,
  description,
  eyebrow = 'MATJARK',
  icon,
  actions,
  tabs,
  children,
  contentClassName = '',
  maxWidth = 'var(--matjark-page-max-width, 1440px)',
}) => {
  const maxWidthValue = typeof maxWidth === 'number' ? maxWidth + 'px' : maxWidth;

  return (
    <section className="matjark-page-scaffold" style={{ maxWidth: maxWidthValue }} dir="rtl">
      <header className="matjark-page-header">
        <div className="matjark-page-header__identity">
          <div className="matjark-page-heading">
            {eyebrow && <p className="matjark-page-eyebrow">{eyebrow}</p>}
            <h1>{title}</h1>
            {description && <p>{description}</p>}
          </div>
          {icon && <div className="matjark-page-header__icon" aria-hidden="true">{icon}</div>}
        </div>
        {actions && <div className="matjark-page-actions">{actions}</div>}
      </header>
      {tabs && <div className="matjark-page-tabs" role="tablist">{tabs}</div>}
      <div className={'matjark-page-content ' + contentClassName}>{children}</div>
    </section>
  );
};

PageScaffold.displayName = 'PageScaffold';
