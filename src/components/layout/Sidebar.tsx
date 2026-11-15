import React, { useMemo, useState } from 'react';
import {
  Activity,
  BarChart3,
  FileText,
  Moon,
  Package,
  Settings,
  ShoppingCart,
  Store,
  Sun,
  Users,
  Wallet,
} from 'lucide-react';
import { ActiveTab, useStore } from '../../context/StoreContext';
import { useAuth } from '../../context/AuthContext';

const NAV_ITEMS: Array<{ id: ActiveTab; label: string; icon: React.ComponentType<{ size?: number; strokeWidth?: number }> }> = [
  { id: 'pos', label: 'نقطة البيع', icon: ShoppingCart },
  { id: 'inventory', label: 'المنتجات', icon: Package },
  { id: 'invoices', label: 'الفواتير', icon: FileText },
  { id: 'customers', label: 'العملاء', icon: Users },
  { id: 'accounting', label: 'المصروفات', icon: Wallet },
  { id: 'reports', label: 'التقارير', icon: BarChart3 },
  { id: 'settings', label: 'الإعدادات', icon: Settings },
];

export const Sidebar: React.FC = () => {
  const { activeTab, setActiveTab, theme, toggleTheme, products, cartTotals } = useStore();
  const { currentUser } = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);

  const lowStockCount = useMemo(
    () => products.filter((product) => product.stock <= (product.minStockAlert ?? 5)).length,
    [products]
  );

  const initials = currentUser.displayName.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('');

  return (
    <aside className="matjark-sidebar" dir="rtl" aria-label="القائمة الرئيسية">
      <button type="button" className="matjark-sidebar-brand" onClick={() => setActiveTab('pos')} aria-label="العودة إلى نقطة البيع">
        <span className="matjark-sidebar-brand__mark"><Store size={27} strokeWidth={2.1} /></span>
        <span className="matjark-sidebar-brand__name">متجرك</span>
        <span className="matjark-sidebar-brand__latin">MATJARK</span>
      </button>

      <div className="matjark-sidebar-divider" />

      <nav className="matjark-sidebar-nav" aria-label="التنقل الرئيسي">
        {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
          const active = activeTab === id;
          const badge = id === 'pos'
            ? cartTotals.unitsCount
            : id === 'inventory'
              ? lowStockCount
              : 0;
          return (
            <button
              key={id}
              type="button"
              className={active ? 'matjark-sidebar-link is-active' : 'matjark-sidebar-link'}
              aria-current={active ? 'page' : undefined}
              onClick={() => setActiveTab(id)}
            >
              <span className="matjark-sidebar-link__label">{label}</span>
              <span className="matjark-sidebar-link__icon"><Icon size={21} strokeWidth={1.9} /></span>
              {badge > 0 && <span className="matjark-sidebar-link__badge">{badge > 99 ? '99+' : badge}</span>}
            </button>
          );
        })}
      </nav>

      <div className="matjark-sidebar-spacer" />

      <div className="matjark-sidebar-bottom">
        <button
          type="button"
          className="matjark-sidebar-theme"
          onClick={toggleTheme}
          title={theme === 'dark' ? 'تفعيل الوضع النهاري' : 'تفعيل الوضع الليلي'}
          aria-label={theme === 'dark' ? 'تفعيل الوضع النهاري' : 'تفعيل الوضع الليلي'}
        >
          <span className="matjark-sidebar-theme__icon">{theme === 'dark' ? <Sun size={19} /> : <Moon size={19} />}</span>
          <span className="matjark-sidebar-theme__label">{theme === 'dark' ? 'الوضع الليلي' : 'الوضع النهاري'}</span>
          <span className={theme === 'dark' ? 'matjark-theme-switch is-on' : 'matjark-theme-switch'}><i /></span>
        </button>

        <button
          type="button"
          className="matjark-sidebar-profile"
          onClick={() => setProfileOpen((open) => !open)}
          aria-expanded={profileOpen}
        >
          <span className="matjark-sidebar-profile__avatar">{initials || 'م'}</span>
          <span className="matjark-sidebar-profile__copy">
            <strong>{currentUser.displayName}</strong>
            <small>{currentUser.roleKey === 'owner' ? 'مالك المتجر' : currentUser.roleKey}</small>
          </span>
          <Activity size={16} className="matjark-sidebar-profile__status" />
        </button>
        {profileOpen && (
          <div className="matjark-sidebar-profile-menu" role="menu">
            <button type="button" role="menuitem" onClick={() => { setActiveTab('settings'); setProfileOpen(false); }}>
              <Settings size={16} /> إعدادات البرنامج
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};
