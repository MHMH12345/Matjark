/**
 * Reports screen: Material 3 surfaces and MUI X Charts for visualizations.
 */

import React, { useMemo } from 'react';
import { BarChart } from '@mui/x-charts/BarChart';
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
          <div className="flex items-center gap-2 text-[var(--md-sys-color-on-surface-variant)] mb-2">
            <TrendingUp className="w-4 h-4 text-[var(--md-sys-color-success)]" />
            <h3 className="text-xs font-bold">معدل مبيعات آخر 7 أيام</h3>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-[var(--md-sys-color-on-surface)]">
              {(
                dailyTrends.days.reduce((acc, d) => acc + d.total, 0) / (dailyTrends.days.length || 1)
              ).toFixed(0)}
            </span>
            <span className="text-xs text-[var(--md-sys-color-outline)]">{settings.currency} / اليوم</span>
          </div>
        </MuiCard>

        <MuiCard variant="outlined" className="matjark-surface-card matjark-surface-card--compact">
          <div className="flex items-center gap-2 text-[var(--md-sys-color-on-surface-variant)] mb-2">
            <CreditCard className="w-4 h-4 text-[var(--md-sys-color-primary)]" />
            <h3 className="text-xs font-bold">نسبة المدفوعات الإلكترونية (فيزا / ميزة)</h3>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-[var(--md-sys-color-primary)]">
              {paymentBreakdown.card.pct}%
            </span>
            <span className="text-xs text-[var(--md-sys-color-outline)]">
              ({formatCurrency(paymentBreakdown.card.total)})
            </span>
          </div>
        </MuiCard>

        <MuiCard variant="outlined" className="matjark-surface-card matjark-surface-card--compact">
          <div className="flex items-center gap-2 text-[var(--md-sys-color-on-surface-variant)] mb-2">
            <Award className="w-4 h-4 text-[var(--md-sys-color-warning)]" />
            <h3 className="text-xs font-bold">المنتج الأكثر طلبًا</h3>
          </div>
          <div className="truncate">
            <span className="text-base font-bold text-[var(--md-sys-color-on-surface)] truncate block">
              {topSellingProducts[0]?.name || 'لا توجد بيانات كافية'}
            </span>
            <span className="text-xs text-[var(--md-sys-color-outline)]">
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
              <BarChart3 className="w-5 h-5 text-[var(--md-sys-color-primary)]" />
              <h3 className="text-sm font-bold text-[var(--md-sys-color-on-surface)]">
                المبيعات اليومية — آخر 7 أيام
              </h3>
            </div>
          </div>

                    <BarChart
            xAxis={[{
              data: dailyTrends.days.map((day) => day.label),
              scaleType: 'band',
              tickLabelStyle: {
                fill: 'var(--md-sys-color-on-surface-variant)',
                fontFamily: 'Cairo',
                fontSize: 12,
              },
            }]}
            yAxis={[{
              min: 0,
              valueFormatter: (value: number) => formatCurrency(value),
              tickLabelStyle: {
                fill: 'var(--md-sys-color-on-surface-variant)',
                fontFamily: 'Cairo',
                fontSize: 11,
              },
            }]}
            series={[{
              data: dailyTrends.days.map((day) => day.total),
              label: 'المبيعات اليومية',
              valueFormatter: (value) => value == null ? '' : formatCurrency(value),
            }]}
            colors={['var(--md-sys-color-primary)']}
            height={260}
            margin={{ top: 16, right: 16, bottom: 34, left: 64 }}
            grid={{ horizontal: true }}
            sx={{
              width: '100%',
              direction: 'rtl',
              '& .MuiChartsAxis-line, & .MuiChartsAxis-tick': {
                stroke: 'var(--md-sys-color-outline-variant)',
              },
              '& .MuiChartsGrid-line': {
                stroke: 'var(--md-sys-color-outline-variant)',
                strokeOpacity: 0.45,
              },
              '& .MuiChartsAxis-tickLabel': {
                fill: 'var(--md-sys-color-on-surface-variant)',
                fontFamily: 'Cairo',
              },
            }}
          />
        </MuiCard>

        {/* Top 5 Products Leaderboard */}
        <MuiCard variant="outlined" className="matjark-surface-card matjark-surface-card--spacious">
          <div className="flex items-center gap-2 mb-4">
            <Award className="w-5 h-5 text-[var(--md-sys-color-warning)]" />
            <h3 className="text-sm font-bold text-[var(--md-sys-color-on-surface)]">
              قائمة المنتجات الأكثر مبيعًا
            </h3>
          </div>

          <div className="flex-1 space-y-3">
            {topSellingProducts.length === 0 ? (
              <p className="text-xs text-[var(--md-sys-color-outline)] py-8 text-center">لا توجد مبيعات مسجلة حتى الآن</p>
            ) : (
              topSellingProducts.map((p, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-[var(--md-sys-color-surface-container-low)] border border-[var(--md-sys-color-outline-variant)]"
                >
                  <div className="flex items-center gap-3 truncate">
                    <span className="w-6 h-6 rounded-full bg-[var(--md-sys-color-primary-container)] text-[var(--md-sys-color-on-primary-container)] flex items-center justify-center font-bold text-xs shrink-0">
                      {idx + 1}
                    </span>
                    <div className="truncate">
                      <h4 className="text-xs font-bold text-[var(--md-sys-color-on-surface)] truncate">
                        {p.name}
                      </h4>
                      <span className="text-[11px] text-[var(--md-sys-color-on-surface-variant)]">{p.quantity} قطعة مباعة</span>
                    </div>
                  </div>

                  <span className="font-mono text-xs font-bold text-[var(--md-sys-color-primary)] shrink-0">
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
