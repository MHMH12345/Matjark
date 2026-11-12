import React, { useEffect, useRef, useState, useMemo } from 'react';
import { createNavigationRail } from 'material';
import { Menu as MaterialMenu, MenuItem as MaterialMenuItem } from 'material/react';
import { useStore, ActiveTab } from '../../context/StoreContext';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  ShoppingCart,
  Package,
  FileText,
  Users,
  Wallet,
  BarChart3,
  Settings,
  Sun,
  Moon,
  UserRound,
} from 'lucide-react';

const toSvgString = (IconComponent: React.ElementType) =>
  renderToStaticMarkup(<IconComponent width={24} height={24} />);

export const Sidebar: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<any>(null);
  const activeTabRef = useRef<ActiveTab>('pos');
  const toggleThemeRef = useRef<() => void>(() => undefined);
  const setActiveTabRef = useRef<(tab: ActiveTab) => void>(() => undefined);
  const profileAnchorRef = useRef<HTMLElement | null>(null);
  const { activeTab, setActiveTab, theme, toggleTheme, products, cartTotals } = useStore();
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  activeTabRef.current = activeTab;
  toggleThemeRef.current = toggleTheme;
  setActiveTabRef.current = setActiveTab;

  // حساب عدد الأصناف منخفضة المخزون تلقائياً
  const lowStockCount = useMemo(() => {
    return products.filter((p) => p.stock <= (p.minStockAlert ?? 5)).length;
  }, [products]);

  const syncProfileAnchor = (rail: any) => {
    const profileItem = rail.element.querySelector('[data-id="profile"]') as HTMLElement | null;
    profileAnchorRef.current = profileItem;
    if (profileItem) profileItem.id = 'matjark-profile-trigger';
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const rail = createNavigationRail({
      ariaLabel: 'القائمة الرئيسية',
      expanded: false,
      showToggle: false,
      items: [
        {
          id: 'pos',
          label: 'نقطة البيع',
          icon: toSvgString(ShoppingCart),
          active: activeTabRef.current === 'pos',
          badge: cartTotals.unitsCount > 0 ? String(cartTotals.unitsCount) : undefined,
        },
        {
          id: 'inventory',
          label: 'المخزن',
          icon: toSvgString(Package),
          active: activeTabRef.current === 'inventory',
          badge: lowStockCount > 0 ? String(lowStockCount) : undefined,
        },
        { id: 'invoices', label: 'الفواتير', icon: toSvgString(FileText), active: activeTabRef.current === 'invoices' },
        { id: 'customers', label: 'العملاء', icon: toSvgString(Users), active: activeTabRef.current === 'customers' },
        { id: 'accounting', label: 'المحاسبة', icon: toSvgString(Wallet), active: activeTabRef.current === 'accounting' },
        { id: 'reports', label: 'التقارير', icon: toSvgString(BarChart3), active: activeTabRef.current === 'reports' },
        { id: 'settings', label: 'الإعدادات', icon: toSvgString(Settings), active: activeTabRef.current === 'settings' },
        {
          id: 'profile',
          label: 'الملف الشخصي',
          icon: toSvgString(UserRound),
        },
        {
          id: 'theme',
          label: theme === 'dark' ? 'تفعيل الوضع الفاتح' : 'تفعيل الوضع الداكن',
          icon: toSvgString(theme === 'dark' ? Sun : Moon),
        },
      ],
    });

    container.replaceChildren(rail.element);
    railRef.current = rail;
    syncProfileAnchor(rail);

    const handleSelect = (event: { id: string }) => {
      const selectedId = event?.id;
      if (!selectedId) return;

      if (selectedId === 'profile') {
        rail.setActive(activeTabRef.current);
        setProfileMenuOpen((open) => !open);
        return;
      }

      if (selectedId === 'theme') {
        rail.setActive(activeTabRef.current);
        toggleThemeRef.current();
        return;
      }

      setActiveTabRef.current(selectedId as ActiveTab);
    };

    rail.on('select', handleSelect);

    return () => {
      rail.off('select', handleSelect);
      rail.destroy?.();
      rail.element.remove();
      railRef.current = null;
      container.replaceChildren();
    };
  }, []);

  useEffect(() => {
    railRef.current?.setActive?.(activeTab);
  }, [activeTab]);

  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;
    rail.setBadge('pos', cartTotals.unitsCount > 0 ? String(cartTotals.unitsCount) : undefined);
    rail.setBadge('inventory', lowStockCount > 0 ? String(lowStockCount) : undefined);
  }, [cartTotals.unitsCount, lowStockCount]);

  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;

    const items = rail.getItems().map((item: any) => {
      if (item.id !== 'theme') return item;
      return {
        ...item,
        label: theme === 'dark' ? 'تفعيل الوضع الفاتح' : 'تفعيل الوضع الداكن',
        icon: toSvgString(theme === 'dark' ? Sun : Moon),
      };
    });

    rail.setItems(items);
    rail.setActive(activeTab);
    syncProfileAnchor(rail);
  }, [theme]);

  return (
    <aside
      className="matjark-sidebar relative h-full bg-[var(--md-sys-color-surface)] border-l border-[var(--md-sys-color-outline-variant)] shrink-0 flex flex-col items-center z-30 overflow-visible"
      dir="rtl"
    >
      <div ref={containerRef} className="matjark-sidebar-rail-host flex-1 min-h-0 w-full" />

      <MaterialMenu
        open={profileMenuOpen}
        onOpen={() => setProfileMenuOpen(true)}
        onClose={() => setProfileMenuOpen(false)}
        anchor={profileAnchorRef.current as HTMLElement}
        position="left-start"
        className="matjark-sidebar-profile-menu"
        onSelect={(event: CustomEvent<{ itemId?: string; value?: string }>) => {
          const selected = event.detail?.itemId || event.detail?.value;
          if (selected === 'settings') setActiveTab('settings');
        }}
      >
        <MaterialMenuItem value="cashier" disabled icon={toSvgString(UserRound)} supportingText="حساب المستخدم">
          الكاشير الرئيسي
        </MaterialMenuItem>
        <MaterialMenuItem gap />
        <MaterialMenuItem value="settings" icon={toSvgString(Settings)}>
          إعدادات البرنامج
        </MaterialMenuItem>
      </MaterialMenu>
    </aside>
  );
};
