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

export const AccountingScreen: React.FC = () => {
  const { expenses, addExpense, deleteExpense, invoices, settings, showToast, formatCurrency } = useStore();

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<Expense['category']>('utilities');
  const [amount, setAmount] = useState<number>(100);
  const [taxAmount, setTaxAmount] = useState<number>(14);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card');
  const [notes, setNotes] = useState('');
  const [receiptNumber, setReceiptNumber] = useState('');

  // Comprehensive P&L Financial Calculations
  const financialSummary = useMemo(() => {
    let grossRevenue = 0;
    let costOfGoodsSold = 0;
    let salesVatCollected = 0;

    invoices.forEach((inv) => {
      if (inv.status === 'completed') {
        grossRevenue += inv.subtotal;
        salesVatCollected += inv.taxTotal;

        inv.items.forEach((item) => {
          costOfGoodsSold += item.costPrice * item.quantity;
        });
      }
    });

    let totalExpenses = 0;
    let expensesVatPaid = 0;

    expenses.forEach((e) => {
      totalExpenses += e.amount;
      expensesVatPaid += e.taxAmount || 0;
    });

    const grossProfit = grossRevenue - costOfGoodsSold;
    const netProfit = grossProfit - totalExpenses;
    const netVatPayable = salesVatCollected - expensesVatPaid;

    return {
      grossRevenue: Math.round(grossRevenue * 100) / 100,
      costOfGoodsSold: Math.round(costOfGoodsSold * 100) / 100,
      grossProfit: Math.round(grossProfit * 100) / 100,
      totalExpenses: Math.round(totalExpenses * 100) / 100,
      netProfit: Math.round(netProfit * 100) / 100,
      salesVatCollected: Math.round(salesVatCollected * 100) / 100,
      expensesVatPaid: Math.round(expensesVatPaid * 100) / 100,
      netVatPayable: Math.round(netVatPayable * 100) / 100,
    };
  }, [invoices, expenses]);

  const handleAmountChange = (val: number) => {
    setAmount(val);
    setTaxAmount(Math.round(val * settings.defaultTaxRate * 100) / 100);
  };

  const handleCreateExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || amount <= 0) {
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
      receiptNumber: receiptNumber || `EXP-${Date.now().toString().slice(-5)}`,
    });

    setTitle('');
    setAmount(100);
    setTaxAmount(15);
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
          <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
            {row.receiptNumber || row.id}
          </span>
        ),
      },
      {
        field: 'date',
        headerName: 'التاريخ',
        width: 140,
        renderCell: (row) => (
          <span className="text-[11px] font-mono text-slate-500">
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
            <span className="font-bold text-slate-800 dark:text-slate-200 truncate">{row.title}</span>
            {row.notes && <span className="text-[10px] text-slate-400 truncate">{row.notes}</span>}
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
          <span className="text-xs text-slate-600 dark:text-slate-400">
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
          <span className="font-mono text-xs text-slate-500">
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
          <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
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
        <MuiCard variant="outlined" className="matjark-surface-card matjark-surface-card--horizontal"></MuiCard>

        <MuiCard variant="outlined" className="matjark-surface-card matjark-surface-card--horizontal"></MuiCard>

        <MuiCard variant="outlined" className="matjark-surface-card matjark-surface-card--horizontal"></MuiCard>

        <MuiCard variant="outlined" className="matjark-surface-card matjark-surface-card--horizontal"></MuiCard>
      </div>

      {/* VAT Settlement Banner */}
      {settings.enableTax ? (
        <MuiCard variant="filled" className="matjark-surface-card matjark-surface-card--horizontal"></MuiCard>
      ) : (
        <MuiCard variant="filled" className="matjark-surface-card matjark-surface-card--compact matjark-surface-card--horizontal"></MuiCard>
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
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                بند / فئة المصروف
              </label>
              <MuiSelect
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full bg-white dark:bg-[#1e1e1e] border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-sm text-slate-800 dark:text-slate-100 outline-none"
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
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                طريقة الدفع
              </label>
              <MuiSelect
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as any)}
                className="w-full bg-white dark:bg-[#1e1e1e] border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-sm text-slate-800 dark:text-slate-100 outline-none"
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
