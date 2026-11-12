/**
 * High-Performance Reports & Analytics Screen.
 * Uses zero-bundle SVG charts to eliminate 350KB+ chart.js/recharts overhead and canvas memory leaks.
 */

import React, { useMemo } from 'react';
import { MuiCard } from '../ui/MuiCard';
import {
  BarChart3,
  TrendingUp,
  Award,
  PieChart,
  ShoppingBag,
  CreditCard,
  Banknote,
  DollarSign,
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';

export const ReportsScreen: React.FC = () => {
  const { invoices, products, settings, formatCurrency } = useStore();

  // Top Selling Items (memoized)
  const topSellingProducts = useMemo(() => {
    const map = new Map<string, { name: string; quantity: number; revenue: number }>();

    invoices.forEach((inv) => {
      if (inv.status === 'completed') {
        inv.items.forEach((item) => {
          const current = map.get(item.productId) || {
            name: item.productName,
            quantity: 0,
            revenue: 0,
          };
          current.quantity += item.quantity;
          current.revenue += item.total;
          map.set(item.productId, current);
        });
      }
    });

    return Array.from(map.values())
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);
  }, [invoices]);

  // Payment Methods Breakdown (memoized)
  const paymentBreakdown = useMemo(() => {
    const counts: Record<string, { count: number; total: number }> = {
      card: { count: 0, total: 0 },
      cash: { count: 0, total: 0 },
      wallet: { count: 0, total: 0 },
      transfer: { count: 0, total: 0 },
      credit: { count: 0, total: 0 },
    };

    invoices.forEach((inv) => {
      if (inv.status === 'completed') {
        const method = inv.paymentMethod || 'cash';
        if (counts[method]) {
          counts[method].count += 1;
          counts[method].total += inv.grandTotal;
        }
      }
    });

    const totalRevenue = Object.values(counts).reduce((acc, curr) => acc + curr.total, 0) || 1;

    return {
      card: { ...counts.card, pct: Math.round((counts.card.total / totalRevenue) * 100) },
      cash: { ...counts.cash, pct: Math.round((counts.cash.total / totalRevenue) * 100) },
      wallet: { ...counts.wallet, pct: Math.round((counts.wallet.total / totalRevenue) * 100) },
      transfer: { ...counts.transfer, pct: Math.round((counts.transfer.total / totalRevenue) * 100) },
      credit: { ...counts.credit, pct: Math.round((counts.credit.total / totalRevenue) * 100) },
    };
  }, [invoices]);

  // Daily Trend for the last 7 days
  const dailyTrends = useMemo(() => {
    const days: { label: string; total: number }[] = [];
    const now = new Date();

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
      const dayEnd = dayStart + 86400000;

      let sum = 0;
      invoices.forEach((inv) => {
        if (inv.status === 'completed' && inv.timestamp >= dayStart && inv.timestamp < dayEnd) {
          sum += inv.grandTotal;
        }
      });

      const dayName = d.toLocaleDateString('ar-EG', { weekday: 'short' });
      days.push({ label: dayName, total: Math.round(sum) });
    }

    const maxVal = Math.max(...days.map((d) => d.total), 100);
    return { days, maxVal };
  }, [invoices]);

  return (
    <div className="space-y-4">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MuiCard variant="outlined" className="matjark-surface-card matjark-surface-card--compact">
          <div className="flex items-center gap-2 text-slate-500 mb-2">
            <TrendingUp className="w-4 h-4 text-emerald-600" />
            <h3 className="text-xs font-bold">معدل مبيعات آخر 7 أيام</h3>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100">
              {(
                dailyTrends.days.reduce((acc, d) => acc + d.total, 0) / (dailyTrends.days.length || 1)
              ).toFixed(0)}
            </span>
            <span className="text-xs text-slate-400">{settings.currency} / اليوم</span>
          </div>
        </MuiCard>

        <MuiCard variant="outlined" className="matjark-surface-card matjark-surface-card--compact">
          <div className="flex items-center gap-2 text-slate-500 mb-2">
            <CreditCard className="w-4 h-4 text-blue-600" />
            <h3 className="text-xs font-bold">نسبة المدفوعات الإلكترونية (فيزا / ميزة)</h3>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-blue-600 dark:text-blue-400">
              {paymentBreakdown.card.pct}%
            </span>
            <span className="text-xs text-slate-400">
              ({formatCurrency(paymentBreakdown.card.total)})
            </span>
          </div>
        </MuiCard>

        <MuiCard variant="outlined" className="matjark-surface-card matjark-surface-card--compact">
          <div className="flex items-center gap-2 text-slate-500 mb-2">
            <Award className="w-4 h-4 text-amber-500" />
            <h3 className="text-xs font-bold">المنتج الأكثر طلبًا</h3>
          </div>
          <div className="truncate">
            <span className="text-base font-bold text-slate-900 dark:text-slate-100 truncate block">
              {topSellingProducts[0]?.name || 'لا توجد بيانات كافية'}
            </span>
            <span className="text-xs text-slate-400">
              {topSellingProducts[0] ? `${topSellingProducts[0].quantity} قطعة مباعة` : ''}
            </span>
          </div>
        </MuiCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* SVG Daily Trend Chart */}
        <MuiCard variant="outlined" className="matjark-surface-card matjark-surface-card--spacious">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                منحنى المبيعات اليومية (خفيف وسريع بدون مكتبات خارجية)
              </h3>
            </div>
          </div>

          {/* Pure SVG Bar Chart */}
          <div className="h-56 flex items-end justify-between gap-3 pt-6 px-2 border-b border-slate-200 dark:border-slate-800">
            {dailyTrends.days.map((d, idx) => {
              const heightPct = Math.max(10, Math.round((d.total / dailyTrends.maxVal) * 100));

              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                  <span className="text-[10px] font-mono font-bold text-slate-600 dark:text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                    {d.total}
                  </span>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-t-md h-full flex items-end overflow-hidden max-w-[48px]">
                    <div
                      style={{ height: `${heightPct}%` }}
                      className="w-full bg-blue-600 hover:bg-blue-500 rounded-t-md transition-all duration-300 relative"
                    />
                  </div>
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 pt-1">
                    {d.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top 5 Products Leaderboard */}
        <MuiCard variant="outlined" className="matjark-surface-card matjark-surface-card--spacious">
          <div className="flex items-center gap-2 mb-4">
            <Award className="w-5 h-5 text-amber-500" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              قائمة المنتجات الأكثر مبيعًا
            </h3>
          </div>

          <div className="flex-1 space-y-3">
            {topSellingProducts.length === 0 ? (
              <p className="text-xs text-slate-400 py-8 text-center">لا توجد مبيعات مسجلة حتى الآن</p>
            ) : (
              topSellingProducts.map((p, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-[#161616] border border-slate-100 dark:border-slate-800"
                >
                  <div className="flex items-center gap-3 truncate">
                    <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300 flex items-center justify-center font-bold text-xs shrink-0">
                      {idx + 1}
                    </span>
                    <div className="truncate">
                      <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                        {p.name}
                      </h4>
                      <span className="text-[11px] text-slate-500">{p.quantity} قطعة مباعة</span>
                    </div>
                  </div>

                  <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400 shrink-0">
                    {formatCurrency(p.revenue)}
                  </span>
                </div>
              ))
            )}
          </div>
        </MuiCard>
      </MuiCard>
    </div>
  );
};
