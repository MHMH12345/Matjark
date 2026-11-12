/**
 * Accounting & Expenses Screen.
 * Tracks P&L, Cost of Goods Sold (COGS), VAT Settlement, and Operating Expense Vouchers.
 */

import React, { useState, useMemo } from 'react';
import { MuiCard } from '../ui/MuiCard';
import {
  Wallet,
  ArrowDownRight,
  ArrowUpRight,
  Plus,
  Trash2,
  FileCheck,
  TrendingDown,
  Building,
  CreditCard,
  Banknote,
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { Expense, PaymentMethod } from '../../types';
import { MuiButton } from '../ui/MuiButton';
import { MuiIconButton } from '../ui/MuiIconButton';
import { MuiChip } from '../ui/MuiChip';
import { GridColumn, MuiDataGrid } from '../ui/MuiDataGrid';
import { MuiDialog } from '../ui/MuiDialog';
import { MuiTextField } from '../ui/MuiTextField';
import { MuiSelect } from '../ui/MuiSelect';
import { computeAccountingMetrics, roundToTwoDecimals } from '../../utils/currency';

export const AccountingScreen: React.FC = () => {
  const { expenses, addExpense, deleteExpense, invoices, products, settings, showToast, formatCurrency } = useStore();

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<Expense['category']>('utilities');
  const [amount, setAmount] = useState<number>(100);
  const [taxAmount, setTaxAmount] = useState<number>(roundToTwoDecimals(100 * settings.defaultTaxRate));
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card');
  const [notes, setNotes] = useState('');
  const [receiptNumber, setReceiptNumber] = useState('');

  // Shared financial calculation rules are also used by the rest of the application.
  const financialSummary = useMemo(
    () => computeAccountingMetrics({ invoices, expenses, products }),
    [invoices, expenses, products]
  );

  const handleAmountChange = (val: number) => {
    setAmount(val);
    setTaxAmount(roundToTwoDecimals(val * settings.defaultTaxRate));
  };

  const handleCreateExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !Number.isFinite(amount) || amount <= 0 || !Number.isFinite(taxAmount) || taxAmount < 0) {
      showToast('يرجى كتابة بيان المصروف والمبلغ', 'error');
      return;
    }

    addExpense({
      title,
      category,
      amount: Number(amount),
      taxAmount: Number(taxAmount),
      date: Date.now(),
      paymentMethod,
      notes,
      receiptNumber: receiptNumber.trim() || undefined,
    });

    setTitle('');
    setAmount(100);
    setTaxAmount(roundToTwoDecimals(100 * settings.defaultTaxRate));
    setNotes('');
    setReceiptNumber('');
    setAddModalOpen(false);
  };

  const getCategoryArabic = (cat: Expense['category']): string => {
    const dict: Record<Expense['category'], string> = {
      rent: 'إيجار المحل',
      salaries: 'رواتب ومكافآت',
      utilities: 'كهرباء وإنترنت ومياه',
      inventory_purchase: 'شراء بضاعة',
      maintenance: 'صيانة وتشغيل',
      marketing: 'إعلانات وتسويق',
      other: 'مصروفات أخرى',
    };
    return dict[cat] || cat;
  };

  const columns: GridColumn<Expense>[] = useMemo(
    () => [
      {
        field: 'receiptNumber',
        headerName: 'رقم السند',
        width: 130,
        renderCell: (row) => (
          <span className="font-mono font-bold text-[var(--md-sys-color-on-surface-variant)]">
            {row.receiptNumber || row.id}
          </span>
        ),
      },
      {
        field: 'date',
        headerName: 'التاريخ',
        width: 140,
        renderCell: (row) => (
          <span className="text-[11px] font-mono text-[var(--md-sys-color-on-surface-variant)]">
            {new Date(row.date).toLocaleDateString('ar-EG', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })}
          </span>
        ),
      },
      {
        field: 'title',
        headerName: 'بيان المصروف',
        minWidth: 180,
        renderCell: (row) => (
          <div className="flex flex-col truncate">
            <span className="font-bold text-[var(--md-sys-color-on-surface)] truncate">{row.title}</span>
            {row.notes && <span className="text-[10px] text-[var(--md-sys-color-outline)] truncate">{row.notes}</span>}
          </div>
        ),
      },
      {
        field: 'category',
        headerName: 'التصنيف',
        width: 150,
        renderCell: (row) => (
          <MuiChip label={getCategoryArabic(row.category)} size="small" variant="outlined" />
        ),
      },
      {
        field: 'paymentMethod',
        headerName: 'طريقة الدفع',
        width: 120,
        align: 'center',
        renderCell: (row) => (
          <span className="text-xs text-[var(--md-sys-color-on-surface-variant)]">
            {row.paymentMethod === 'card' ? 'فيزا/ميزة' : row.paymentMethod === 'cash' ? 'نقدي (كاش)' : 'تحويل'}
          </span>
        ),
      },
      {
        field: 'taxAmount',
        headerName: 'الضريبة المستردة',
        width: 120,
        align: 'right',
        renderCell: (row) => (
          <span className="font-mono text-xs text-[var(--md-sys-color-on-surface-variant)]">
            {formatCurrency(row.taxAmount || 0)}
          </span>
        ),
      },
      {
        field: 'amount',
        headerName: 'المبلغ الإجمالي',
        width: 140,
        align: 'right',
        renderCell: (row) => (
          <span className="font-mono font-bold text-[var(--md-sys-color-error)]">
            {formatCurrency(row.amount + (row.taxAmount || 0))}
          </span>
        ),
      },
      {
        field: 'actions',
        headerName: 'حذف',
        width: 70,
        align: 'center',
        sortable: false,
        renderCell: (row) => (
          <MuiIconButton
            icon={<Trash2 className="w-4 h-4" />}
            ariaLabel={`حذف المصروف ${row.title}`}
            title="حذف المصروف"
            size="extraSmall"
            shape="square"
            className="matjark-table-icon-button matjark-icon-button--danger"
            onClick={() => deleteExpense(row.id)}
          />
        ),
      },
    ],
    [deleteExpense, formatCurrency]
  );

  return (
    <div className="space-y-4">
      {/* Financial Executive Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MuiCard variant="outlined" className="matjark-surface-card">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-[var(--md-sys-color-on-surface-variant)]">المبيعات (قبل الضريبة)</span>
            <ArrowUpRight className="w-4 h-4 text-[var(--md-sys-color-success)]" />
          </div>
          <span className="text-2xl font-bold font-mono text-[var(--md-sys-color-on-surface)]">
            {formatCurrency(financialSummary.grossRevenue)}
          </span>
          <span className="block text-[11px] text-[var(--md-sys-color-outline)] mt-1">
            تكلفة البضاعة: {formatCurrency(financialSummary.costOfGoodsSold)}
          </span>
        </MuiCard>

        <MuiCard variant="outlined" className="matjark-surface-card">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-[var(--md-sys-color-on-surface-variant)]">مجمل الربح (Gross Profit)</span>
            <span className="text-xs font-mono font-bold text-[var(--md-sys-color-primary)]">
              {financialSummary.grossRevenue > 0
                ? `${Math.round((financialSummary.grossProfit / financialSummary.grossRevenue) * 100)}%`
                : '0%'}
            </span>
          </div>
          <span className="text-2xl font-bold font-mono text-[var(--md-sys-color-primary)]">
            {formatCurrency(financialSummary.grossProfit)}
          </span>
          <span className="block text-[11px] text-[var(--md-sys-color-outline)] mt-1">قبل خصم المصروفات التشغيلية</span>
        </MuiCard>

        <MuiCard variant="outlined" className="matjark-surface-card">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-[var(--md-sys-color-on-surface-variant)]">المصروفات التشغيلية</span>
            <TrendingDown className="w-4 h-4 text-[var(--md-sys-color-error)]" />
          </div>
          <span className="text-2xl font-bold font-mono text-[var(--md-sys-color-error)]">
            {formatCurrency(financialSummary.totalExpenses)}
          </span>
          <span className="block text-[11px] text-[var(--md-sys-color-outline)] mt-1">
            {expenses.length} سند صرف مسجل
          </span>
        </MuiCard>

        <MuiCard variant="outlined" className="matjark-surface-card">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-[var(--md-sys-color-on-surface-variant)]">صافي الأرباح (Net Profit)</span>
            <Wallet className="w-4 h-4 text-[var(--md-sys-color-success)]" />
          </div>
          <span
            className={`text-2xl font-bold font-mono ${
              financialSummary.netProfit >= 0
                ? 'text-[var(--md-sys-color-success)]'
                : 'text-[var(--md-sys-color-error)]'
            }`}
          >
            {formatCurrency(financialSummary.netProfit)}
          </span>
          <span className="block text-[11px] text-[var(--md-sys-color-outline)] mt-1">
            الربح الصافي بعد كامل التكاليف
          </span>
        </MuiCard>
      </div>

      {/* VAT Settlement Banner */}
      {settings.enableTax ? (
        <MuiCard variant="filled" className="matjark-surface-card matjark-surface-card--horizontal matjark-vat-settlement">
          <div>
            <h4 className="text-sm font-bold flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-[var(--md-sys-color-primary)]" />
              <span>تسوية ضريبة القيمة المضافة (إقرار القيمة المضافة - {Math.round(settings.defaultTaxRate * 100)}%)</span>
            </h4>
            <p className="text-xs text-[var(--md-sys-color-on-primary-container)] mt-0.5">
              الضريبة المحصلة من المبيعات ({formatCurrency(financialSummary.salesVatCollected)}) - ضريبة المصروفات القابلة للاسترداد ({formatCurrency(financialSummary.expensesVatPaid)})
            </p>
          </div>
          <div className="bg-[var(--md-sys-color-primary)]/10 px-4 py-2 rounded-lg text-end">
            <span className="text-[11px] text-[var(--md-sys-color-on-primary-container)] block">صافي الضريبة المستحقة للسداد:</span>
            <span className="text-xl font-bold font-mono text-[var(--md-sys-color-on-primary-container)]">
              {formatCurrency(financialSummary.netVatPayable)}
            </span>
          </div>
        </MuiCard>
      ) : (
        <MuiCard variant="filled" className="matjark-surface-card matjark-surface-card--compact matjark-surface-card--horizontal">
          <div className="flex items-center gap-2 text-xs">
            <FileCheck className="w-4 h-4 text-[var(--md-sys-color-outline)]" />
            <span>حالة الضريبة: <strong>معفاة / ملغاة</strong> (المحل يعمل بدون إضافة ضريبة قيمة مضافة على الفواتير)</span>
          </div>
          <span className="text-xs font-mono text-[var(--md-sys-color-on-surface-variant)]">معدل الضريبة: 0%</span>
        </MuiCard>
      )}

      {/* Expenses Table */}
      <MuiDataGrid
        rows={expenses}
        columns={columns}
        height={500}
        searchPlaceholder="بحث في سندات الصرف..."
        searchFields={['title', 'receiptNumber', 'notes']}
        toolbarActions={
          <MuiButton
            variant="contained"
            color="primary"
            size="small"
            startIcon={<Plus className="w-4 h-4" />}
            onClick={() => setAddModalOpen(true)}
          >
            تسجيل سند صرف جديد
          </MuiButton>
        }
      />

      {/* Add Expense Dialog */}
      <MuiDialog
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        title="تسجيل سند صرف / مصروف جديد"
        maxWidth="md"
        actions={
          <>
            <MuiButton variant="outlined" onClick={() => setAddModalOpen(false)}>
              إلغاء
            </MuiButton>
            <MuiButton variant="contained" color="primary" onClick={handleCreateExpense}>
              حفظ سند الصرف
            </MuiButton>
          </>
        }
      >
        <form onSubmit={handleCreateExpense} className="space-y-4">
          <MuiTextField
            label="بيان المصروف *"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="مثال: فاتورة كهرباء الفرع، إيجار، أدوات تغليف..."
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-[var(--md-sys-color-on-surface-variant)] block mb-1">
                بند / فئة المصروف
              </label>
              <MuiSelect
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full bg-[var(--md-sys-color-surface-container)] border border-[var(--md-sys-color-outline)] rounded-lg p-2 text-sm text-[var(--md-sys-color-on-surface)] dark:text-[var(--md-sys-color-on-surface)] outline-none"
              >
                <option value="rent">إيجار المحل أو المستودع</option>
                <option value="salaries">رواتب وأجور الموظفين</option>
                <option value="utilities">فواتير كهرباء وإنترنت ومياه</option>
                <option value="inventory_purchase">شراء بضاعة ومخزون</option>
                <option value="maintenance">صيانة دورية وتشغيل</option>
                <option value="marketing">حملات إعلانية وتسويق</option>
                <option value="other">مصروفات إدارية أخرى</option>
              </MuiSelect>
            </div>

            <div>
              <label className="text-xs font-semibold text-[var(--md-sys-color-on-surface-variant)] block mb-1">
                طريقة الدفع
              </label>
              <MuiSelect
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as any)}
                className="w-full bg-[var(--md-sys-color-surface-container)] border border-[var(--md-sys-color-outline)] rounded-lg p-2 text-sm text-[var(--md-sys-color-on-surface)] dark:text-[var(--md-sys-color-on-surface)] outline-none"
              >
                <option value="card">بطاقة بنكية (فيزا / ميزة / ماستركارد)</option>
                <option value="transfer">تحويل بنكي / إنستاباي InstaPay</option>
                <option value="cash">نقدي (كاش من الخزينة)</option>
              </MuiSelect>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <MuiTextField
              label="المبلغ قبل الضريبة (ج.م) *"
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => handleAmountChange(parseFloat(e.target.value) || 0)}
              required
            />
            <MuiTextField
              label="ضريبة القيمة المضافة (14% ج.م)"
              type="number"
              step="0.01"
              value={taxAmount}
              onChange={(e) => setTaxAmount(parseFloat(e.target.value) || 0)}
            />
            <MuiTextField
              label="رقم الفاتورة أو السند الخارجي"
              value={receiptNumber}
              onChange={(e) => setReceiptNumber(e.target.value)}
              placeholder="مثال: INV-9902"
            />
          </div>

          <MuiTextField
            label="ملاحظات وتفاصيل إضافية"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="اسم المستلم، البنك المحول منه..."
          />
        </form>
      </MuiDialog>
    </div>
  );
};
