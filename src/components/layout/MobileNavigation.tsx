import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createNavigationBar } from 'material';
import { BottomSheet as MaterialBottomSheet } from 'material/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Menu, ShoppingCart, Package, FileText, Wallet, MoreHorizontal, Users, BarChart3, Settings, X } from 'lucide-react';
import { ActiveTab, useStore } from '../../context/StoreContext';

const MBottomSheet = MaterialBottomSheet as React.ComponentType<any>;
const iconMarkup = (Icon: React.ElementType) => renderToStaticMarkup(<Icon width={24} height={24} strokeWidth={2} />);

const MORE_DESTINATIONS: Array<{ id: ActiveTab; label: string; icon: React.ReactNode }> = [
  { id: 'customers', label: 'العملاء', icon: <Users size={20} /> },
  { id: 'reports', label: 'التقارير', icon: <BarChart3 size={20} /> },
  { id: 'settings', label: 'الإعدادات', icon: <Settings size={20} /> },
];

const CASHIER_DESTINATIONS: Array<{ id: ActiveTab; label: string; icon: React.ReactNode }> = [
  { id: 'inventory', label: 'المخزن', icon: <Package size={20} /> },
  { id: 'invoices', label: 'الفواتير', icon: <FileText size={20} /> },
  { id: 'accounting', label: 'الحسابات', icon: <Wallet size={20} /> },
  ...MORE_DESTINATIONS,
];

export const MobileNavigation: React.FC<{ cashierMode?: boolean }> = ({ cashierMode = false }) => {
  const hostRef = useRef<HTMLDivElement>(null);
  const menuTriggerRef = useRef<HTMLButtonElement>(null);
  const wasMoreOpenRef = useRef(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const { activeTab, setActiveTab, cartTotals, products } = useStore();

  const lowStockCount = useMemo(
    () => products.filter((product) => product.stock <= (product.minStockAlert ?? 5)).length,
    [products]
  );

  useEffect(() => {
    if (moreOpen) {
      wasMoreOpenRef.current = true;
      return;
    }
    if (wasMoreOpenRef.current) {
      wasMoreOpenRef.current = false;
      menuTriggerRef.current?.focus();
    }
  }, [moreOpen]);

  useEffect(() => {
    if (cashierMode || !hostRef.current) return;
    const activeMore = ['customers', 'reports', 'settings', 'performance'].includes(activeTab);
    const navigation = createNavigationBar({
      ariaLabel: 'التنقل الرئيسي',
      itemLayout: 'vertical',
      ripple: true,
      items: [
        { id: 'pos', label: 'الكاشير', icon: iconMarkup(ShoppingCart), active: activeTab === 'pos', badge: cartTotals.unitsCount || undefined },
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
  }, [cashierMode, activeTab, cartTotals.unitsCount, lowStockCount, setActiveTab]);

  const closeAndNavigate = (tab: ActiveTab) => {
    setMoreOpen(false);
    setActiveTab(tab);
  };
  const destinations = cashierMode ? CASHIER_DESTINATIONS : MORE_DESTINATIONS;

  return (
    <>
      {cashierMode ? (
        <header className="matjark-mobile-cashier-appbar" dir="rtl">
          <button ref={menuTriggerRef} type="button" className="matjark-mobile-menu-trigger" aria-label="فتح قائمة التنقل" onClick={() => setMoreOpen(true)}>
            <Menu size={22} />
          </button>
          <span>الكاشير</span>
        </header>
      ) : (
        <div ref={hostRef} className="matjark-mobile-navigation" dir="rtl" />
      )}
      <MBottomSheet
        open={moreOpen}
        modal
        headline={cashierMode ? 'التنقل بين الشاشات' : 'المزيد'}
        expanded={moreOpen}
        maxWidth={560}
        onClose={() => setMoreOpen(false)}
        className="matjark-mobile-navigation-sheet"
      >
        <div className="matjark-mobile-navigation-options" dir="rtl">
          {destinations.map((destination) => (
            <button key={destination.id} type="button" className="matjark-mobile-navigation-option" onClick={() => closeAndNavigate(destination.id)}>
              <span className="matjark-mobile-navigation-option-icon">{destination.icon}</span>
              <span>{destination.label}</span>
            </button>
          ))}
          {cashierMode && (
            <button type="button" className="matjark-mobile-navigation-option" onClick={() => setMoreOpen(false)}>
              <span className="matjark-mobile-navigation-option-icon"><X size={20} /></span>
              <span>العودة للكاشير</span>
            </button>
          )}
        </div>
      </MBottomSheet>
    </>
  );
};
