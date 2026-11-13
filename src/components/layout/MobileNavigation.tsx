import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createNavigationBar } from 'material';
import { BottomSheet as MaterialBottomSheet } from 'material/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Menu, ShoppingCart, Package, FileText, Wallet, MoreHorizontal, Users, BarChart3, Settings, X } from 'lucide-react';
import { ActiveTab, useStore } from '../../context/StoreContext';

const MBottomSheet = MaterialBottomSheet as React.ComponentType<any>;
const iconMarkup = (Icon: React.ElementType) => renderToStaticMarkup(<Icon width={24} height={24} strokeWidth={2} />);

const MORE_DESTINATIONS: Array<{ id: ActiveTab; label: string; icon: React.ReactNode }> = [
  { id: 'pos', label: 'الكاشير', icon: <ShoppingCart size={20} /> },
  { id: 'customers', label: 'العملاء', icon: <Users size={20} /> },
  { id: 'reports', label: 'التقارير', icon: <BarChart3 size={20} /> },
  { id: 'settings', label: 'الإعدادات', icon: <Settings size={20} /> },
];

const CASHIER_DESTINATIONS: Array<{ id: ActiveTab; label: string; icon: React.ReactNode }> = [
  { id: 'inventory', label: 'المخزن', icon: <Package size={20} /> },
  { id: 'invoices', label: 'الفواتير', icon: <FileText size={20} /> },
  { id: 'accounting', label: 'الحسابات', icon: <Wallet size={20} /> },
  ...MORE_DESTINATIONS.filter((destination) => destination.id !== 'pos'),
];

type MobileNavigationProps = {
  cashierMode?: boolean;
  cashierBottomMode?: boolean;
  actions?: React.ReactNode;
};

export const MobileNavigation: React.FC<MobileNavigationProps> = ({
  cashierMode = false,
  cashierBottomMode = false,
  actions,
}) => {
  const hostRef = useRef<HTMLDivElement>(null);
  const menuTriggerRef = useRef<HTMLButtonElement>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const { activeTab, setActiveTab, products } = useStore();

  const lowStockCount = useMemo(
    () => products.filter((product) => product.stock <= (product.minStockAlert ?? 5)).length,
    [products]
  );

  useEffect(() => {
    if ((cashierMode && !cashierBottomMode) || !hostRef.current) return;
    const activeMore = ['customers', 'reports', 'settings', 'performance'].includes(activeTab);
    const navigation = createNavigationBar({
      ariaLabel: 'التنقل الرئيسي',
      itemLayout: 'vertical',
      ripple: true,
      items: [
        { id: 'inventory', label: 'المخزن', icon: iconMarkup(Package), active: activeTab === 'inventory', badge: lowStockCount || undefined },
        { id: 'invoices', label: 'الفواتير', icon: iconMarkup(FileText), active: activeTab === 'invoices' },
        { id: 'accounting', label: 'الحسابات', icon: iconMarkup(Wallet), active: activeTab === 'accounting' },
        { id: 'more', label: 'المزيد', icon: iconMarkup(MoreHorizontal), active: activeMore },
      ],
    });
    const handleSelect = (event: { id?: string }) => {
      const id = event?.id;
      if (!id) return;
      if (id === 'more') {
        setMoreOpen(true);
        return;
      }
      setActiveTab(id as ActiveTab);
    };
    navigation.on('select', handleSelect);
    hostRef.current.replaceChildren(navigation.element);
    return () => {
      navigation.off('select', handleSelect);
      navigation.destroy?.();
      hostRef.current?.replaceChildren();
    };
  }, [cashierMode, cashierBottomMode, activeTab, lowStockCount, setActiveTab]);

  const closeAndNavigate = (tab: ActiveTab) => {
    if (menuTriggerRef.current) menuTriggerRef.current.focus();
    else if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    setMoreOpen(false);
    setActiveTab(tab);
  };

  const closeMore = () => {
    if (menuTriggerRef.current) menuTriggerRef.current.focus();
    else if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    setMoreOpen(false);
  };
  const isCashierNavigation = cashierMode || cashierBottomMode;
  const destinations = isCashierNavigation ? CASHIER_DESTINATIONS : MORE_DESTINATIONS;

  return (
    <>
      {cashierMode ? (
        <header className="matjark-mobile-cashier-appbar" dir="rtl">
          <button ref={menuTriggerRef} type="button" className="matjark-mobile-menu-trigger" aria-label="فتح قائمة التنقل" onClick={() => setMoreOpen(true)}>
            <Menu size={22} />
          </button>
          {actions && <div className="matjark-mobile-cashier-actions">{actions}</div>}
          <span className="matjark-mobile-cashier-title">الكاشير</span>
        </header>
      ) : (
        <div ref={hostRef} className="matjark-mobile-navigation" dir="rtl" />
      )}
      <MBottomSheet
        open={moreOpen}
        modal
        headline={isCashierNavigation ? 'التنقل بين الشاشات' : 'المزيد'}
        expanded={moreOpen}
        maxWidth={560}
        onClose={closeMore}
        className="matjark-mobile-navigation-sheet"
      >
        <div className="matjark-mobile-navigation-options" dir="rtl">
          {destinations.map((destination) => (
            <button key={destination.id} type="button" className="matjark-mobile-navigation-option" onClick={() => closeAndNavigate(destination.id)}>
              <span className="matjark-mobile-navigation-option-icon">{destination.icon}</span>
              <span>{destination.label}</span>
            </button>
          ))}
          {isCashierNavigation && (
            <button type="button" className="matjark-mobile-navigation-option" onClick={closeMore}>
              <span className="matjark-mobile-navigation-option-icon"><X size={20} /></span>
              <span>العودة للكاشير</span>
            </button>
          )}
        </div>
      </MBottomSheet>
    </>
  );
};
