import React, { memo, useMemo } from 'react';
import { Bell, Settings } from 'lucide-react';
import { ActiveTab, useStore } from '../../context/StoreContext';
import { useAuth } from '../../context/AuthContext';

interface NavbarProps {
  cashierMode?: boolean;
}

const PAGE_META: Record<ActiveTab, { title: string; subtitle: string }> = {
  pos: { title: 'نقطة البيع', subtitle: 'إدارة المنتجات والسلة وإتمام عمليات البيع' },
  inventory: { title: 'المنتجات والمخزون', subtitle: 'إدارة الأصناف والكميات والأسعار' },
  invoices: { title: 'سجل الفواتير', subtitle: 'مراجعة المبيعات والفواتير وحالات الاسترجاع' },
  customers: { title: 'العملاء والموردون', subtitle: 'إدارة جهات التعامل وبيانات التواصل والأرصدة' },
  accounting: { title: 'المحاسبة والمصروفات', subtitle: 'متابعة الإيرادات والمصروفات والنتائج المالية' },
  reports: { title: 'التقارير والتحليلات', subtitle: 'متابعة اتجاهات المبيعات وحركة المتجر' },
  settings: { title: 'إعدادات البرنامج', subtitle: 'إدارة بيانات المتجر والتفضيلات والنسخ الاحتياطي' },
  performance: { title: 'مختبر الأداء', subtitle: 'قياس سرعة واستجابة مكونات النظام' },
};

export const Navbar: React.FC<NavbarProps> = memo(({ cashierMode = false }) => {
  const { activeTab, setActiveTab } = useStore();
  const { currentUser } = useAuth();
  const meta = PAGE_META[activeTab];
  const dateLabel = useMemo(
    () => new Intl.DateTimeFormat('ar-EG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date()),
    []
  );
  const initials = currentUser.displayName.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('');

  return (
    <header className={'matjark-topbar' + (cashierMode ? ' matjark-topbar--cashier' : '')} dir="rtl">
      <div className="matjark-topbar-title">
        <span className="matjark-topbar-title__copy">
          <strong>{meta.title}</strong>
          <small>{dateLabel} · {meta.subtitle}</small>
        </span>
      </div>

      <div className="matjark-topbar-actions">
        <div className="matjark-topbar-user" title={currentUser.displayName}>
          <span className="matjark-topbar-user__avatar">{initials || 'م'}</span>
          <span className="matjark-topbar-user__copy">
            <strong>{currentUser.displayName}</strong>
            <small>{currentUser.roleKey === 'owner' ? 'مالك المتجر' : currentUser.roleKey}</small>
          </span>
        </div>
        <span className="matjark-topbar-separator" />
        <span className="matjark-topbar-action matjark-topbar-notifications" title="الإشعارات" aria-label="الإشعارات">
          <Bell size={21} />
        </span>
        <button type="button" className="matjark-topbar-action" title="الإعدادات" aria-label="فتح الإعدادات" onClick={() => setActiveTab('settings')}>
          <Settings size={22} />
        </button>
      </div>
    </header>
  );
});

Navbar.displayName = 'Navbar';
