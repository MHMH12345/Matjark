/**
 * High-Performance Application Header & Navigation Bar.
 */

import React, { useState, useEffect, memo } from 'react';
import {
  ShoppingCart,
  Package,
  FileText,
  Wallet,
  BarChart3,
  Users,
  Settings,
  Activity,
  Sun,
  Moon,
  Zap,
} from 'lucide-react';
import { ActiveTab, useStore } from '../../context/StoreContext';
import { perfTracker } from '../../utils/performance';

interface NavbarProps {
  onOpenPerformanceModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = memo(({ onOpenPerformanceModal }) => {
  const { activeTab, setActiveTab, theme, toggleTheme, cartTotals, products } = useStore();
  const [fps, setFps] = useState(60);

  // Monitor FPS lightly for header badge
  useEffect(() => {
    const unsub = perfTracker.subscribe((snap) => {
      setFps(snap.fps);
    });
    return unsub;
  }, []);

  const navItems: { id: ActiveTab; label: string; icon: React.ReactNode }[] = [
    { id: 'pos', label: 'الكاشير السريع (POS)', icon: <ShoppingCart className="w-4 h-4" /> },
    { id: 'inventory', label: 'المخزون والمنتجات', icon: <Package className="w-4 h-4" /> },
    { id: 'invoices', label: 'سجل الفواتير', icon: <FileText className="w-4 h-4" /> },
    { id: 'accounting', label: 'المحاسبة والمصروفات', icon: <Wallet className="w-4 h-4" /> },
    { id: 'reports', label: 'التقارير والأرباح', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'customers', label: 'العملاء والموردين', icon: <Users className="w-4 h-4" /> },
    { id: 'settings', label: 'الإعدادات والنسخ', icon: <Settings className="w-4 h-4" /> },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-[#181818]/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <Zap className="w-6 h-6 fill-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-base font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
                  مَتْجَرَك
                </span>
                <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400">
                  MATJARK
                </span>
                <span className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[10px] font-bold px-1.5 py-0.2 rounded">
                  V2 ULTRA
                </span>
              </div>
              <p className="text-[10px] text-slate-400">React 19 & Material Architecture</p>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1 overflow-x-auto no-scrollbar py-1">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all duration-150 cursor-pointer ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                  {item.id === 'pos' && cartTotals.unitsCount > 0 && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold font-mono ${
                        isActive ? 'bg-white text-blue-600' : 'bg-blue-600 text-white'
                      }`}
                    >
                      {cartTotals.unitsCount}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Actions & Performance Telemetry Badge */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Live Performance Diagnostic Button */}
            <button
              type="button"
              onClick={onOpenPerformanceModal}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 text-xs font-mono font-semibold hover:bg-emerald-100 dark:hover:bg-emerald-950/50 transition-colors cursor-pointer"
              title="انقر لفتح مختبر قياس الأداء المباشر واختبار المقارنة"
            >
              <Activity className="w-3.5 h-3.5 animate-pulse text-emerald-500" />
              <span>{fps} FPS</span>
            </button>

            {/* Dark/Light Mode Toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 rounded-lg text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title={theme === 'dark' ? 'التحويل إلى الوضع النهاري' : 'التحويل إلى الوضع الليلي'}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Mobile / Tablet Horizontal Navigation Scroll */}
        <div className="flex lg:hidden overflow-x-auto no-scrollbar py-2 gap-1 border-t border-slate-100 dark:border-slate-800/60">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
                {item.id === 'pos' && cartTotals.unitsCount > 0 && (
                  <span
                    className={`text-[10px] px-1 rounded-full font-mono ${
                      isActive ? 'bg-white text-blue-600' : 'bg-blue-600 text-white'
                    }`}
                  >
                    {cartTotals.unitsCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
});

Navbar.displayName = 'Navbar';
