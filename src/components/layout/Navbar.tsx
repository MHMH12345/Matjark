import React, { memo, useMemo } from 'react';
import {
  Activity,
  Bell,
  CalendarDays,
  Settings,
  ShoppingCart,
  Package,
  FileText,
  Users,
  Wallet,
  BarChart3,
} from 'lucide-react';
import { ActiveTab, useStore } from '../../context/StoreContext';
import { useAuth } from '../../context/AuthContext';

interface NavbarProps {
  onOpenPerformanceModal: () => void;
  cashierMode?: boolean;
}

const PAGE_META: Record<ActiveTab, { title: string; subtitle: string; icon: React.ComponentType<{ size?: number; strokeWidth?: number }> }> = {
  pos: { title: 'نقطة البيع', subtitle: 'إدارة المنتجات والسلة وإتمام عمليات البيع', icon: ShoppingCart },
  inventory: { title: 'المنتجات والمخزون', subtitle: 'إدارة الأصناف والكميات والأسعار', icon: Package },
  invoices: { title: 'سجل الفواتير', subtitle: 'مراجعة المبيعات والفواتير وحالات الاسترجاع', icon: FileText },
  customers: { title: 'العملاء والموردون', subtitle: 'إدارة جهات التعامل وبيانات التواصل والأرصدة', icon: Users },
  accounting: { title: 'المحاسبة والمصروفات', subtitle: 'متابعة الإيرادات والمصروفات والنتائج المالية', icon: Wallet },
  reports: { title: 'التقارير والتحليلات', subtitle: 'متابعة اتجاهات المبيعات وحركة المتجر', icon: BarChart3 },
  settings: { title: 'إعدادات البرنامج', subtitle: 'إدارة بيانات المتجر والتفضيلات والنسخ الاحتياطي', icon: Settings },
  performance: { title: 'مختبر الأداء', subtitle: 'قياس سرعة واستجابة مكونات النظام', icon: Activity },
};

export const Navbar: React.FC<NavbarProps> = memo(({ onOpenPerformanceModal, cashierMode = false }) => {
  const { activeTab, setActiveTab, showToast } = useStore();
  const { currentUser } = useAuth();
  const meta = PAGE_META[activeTab];
  const PageIcon = meta.icon;
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
        <span className="matjark-topbar-title__icon"><PageIcon size={22} strokeWidth={1.9} /></span>
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
        <button type="button" className="matjark-topbar-action matjark-topbar-notifications" title="الإشعارات" aria-label="الإشعارات" onClick={() => showToast('لا توجد إشعارات جديدة حاليًا.', 'info')}>
          <Bell size={20} />
          <i />
        </button>
        <button type="button" className="matjark-topbar-action" title="مختبر الأداء" aria-label="فتح مختبر الأداء" onClick={onOpenPerformanceModal}>
          <Activity size={20} />
        </button>
        <button type="button" className="matjark-topbar-action" title="الإعدادات" aria-label="فتح الإعدادات" onClick={() => setActiveTab('settings')}>
          <Settings size={20} />
        </button>
      </div>
    </header>
  );
});

Navbar.displayName = 'Navbar';
