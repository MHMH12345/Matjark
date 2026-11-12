/**
 * Virtualized Invoices & Sales History with ZATCA QR inspection and Refund processing.
 */

import React, { useState, useMemo } from 'react';
import {
  FileText,
  Printer,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  Calendar,
  CreditCard,
  Banknote,
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { Invoice } from '../../types';
import { ThermalReceipt } from '../pos/ThermalReceipt';
import { MuiButton } from '../ui/MuiButton';
import { MuiChip } from '../ui/MuiChip';
import { GridColumn, MuiDataGrid } from '../ui/MuiDataGrid';
import { MuiDialog } from '../ui/MuiDialog';
import { MuiIconButton } from '../ui/MuiIconButton';
import { MuiChipGroup } from '../ui/MuiChipGroup';

export const InvoicesScreen: React.FC = () => {
  const { invoices, refundInvoice, settings, formatCurrency } = useStore();
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'refunded'>('all');

  const filteredInvoices = useMemo(() => {
    if (statusFilter === 'all') return invoices;
    return invoices.filter((i) => i.status === statusFilter);
  }, [invoices, statusFilter]);

  // Aggregate invoice metrics
  const invoiceMetrics = useMemo(() => {
    let completedCount = 0;
    let completedSum = 0;
    let refundedCount = 0;
    let refundedSum = 0;
    let taxTotal = 0;

    invoices.forEach((inv) => {
      if (inv.status === 'completed') {
        completedCount++;
        completedSum += inv.grandTotal;
        taxTotal += inv.taxTotal;
      } else if (inv.status === 'refunded') {
        refundedCount++;
        refundedSum += inv.grandTotal;
      }
    });

    return {
      completedCount,
      completedSum: Math.round(completedSum * 100) / 100,
      refundedCount,
      refundedSum: Math.round(refundedSum * 100) / 100,
      taxTotal: Math.round(taxTotal * 100) / 100,
    };
  }, [invoices]);

  const columns: GridColumn<Invoice>[] = useMemo(
    () => [
      {
        field: 'invoiceNumber',
        headerName: 'رقم الفاتورة',
        width: 140,
        renderCell: (row) => (
          <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
            {row.invoiceNumber}
          </span>
        ),
      },
      {
        field: 'timestamp',
        headerName: 'التاريخ والوقت',
        width: 160,
        renderCell: (row) => (
          <span className="text-[11px] text-slate-600 dark:text-slate-400 font-mono">
            {new Date(row.timestamp).toLocaleDateString('ar-EG', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        ),
      },
      {
        field: 'customerName',
        headerName: 'العميل',
        minWidth: 140,
        renderCell: (row) => (
          <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
            {row.customerName || 'عميل نقدي'}
          </span>
        ),
      },
      {
        field: 'paymentMethod',
        headerName: 'طريقة الدفع',
        width: 120,
        align: 'center',
        renderCell: (row) => {
          const isCard = row.paymentMethod === 'card';
          const isCash = row.paymentMethod === 'cash';
          const isWallet = row.paymentMethod === 'wallet';
          return (
            <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800">
              {isCard ? (
                <CreditCard className="w-3 h-3 text-blue-500" />
              ) : isCash ? (
                <Banknote className="w-3 h-3 text-emerald-500" />
              ) : isWallet ? (
                <span className="text-[10px] font-bold text-rose-500">كاش</span>
              ) : (
                <Clock className="w-3 h-3 text-amber-500" />
              )}
              {isCard ? 'فيزا/ميزة' : isCash ? 'نقدي' : isWallet ? 'فودافون كاش' : 'تحويل'}
            </span>
          );
        },
      },
      {
        field: 'items',
        headerName: 'الأصناف',
        width: 80,
        align: 'center',
        renderCell: (row) => <span className="font-mono">{row.items.length}</span>,
      },
      {
        field: 'taxTotal',
        headerName: 'الضريبة',
        width: 120,
        align: 'right',
        renderCell: (row) => (
          <span className="font-mono text-slate-500">
            {row.taxTotal > 0 ? formatCurrency(row.taxTotal) : 'معفاة'}
          </span>
        ),
      },
      {
        field: 'grandTotal',
        headerName: 'الإجمالي الكلي',
        width: 130,
        align: 'right',
        renderCell: (row) => (
          <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
            {formatCurrency(row.grandTotal)}
          </span>
        ),
      },
      {
        field: 'status',
        headerName: 'الحالة',
        width: 100,
        align: 'center',
        renderCell: (row) => (
          <MuiChip
            label={row.status === 'completed' ? 'مكتملة' : 'مسترجعة'}
            color={row.status === 'completed' ? 'success' : 'error'}
            size="small"
          />
        ),
      },
      {
        field: 'actions',
        headerName: 'إجراءات',
        width: 120,
        align: 'center',
        sortable: false,
        renderCell: (row) => (
          <div className="flex items-center justify-center gap-1">
            <MuiIconButton
              icon={<Eye className="w-4 h-4" />}
              ariaLabel={`معاينة الفاتورة ${row.invoiceNumber}`}
              title="معاينة وطباعة الإيصال"
              size="extraSmall"
              shape="square"
              className="matjark-table-icon-button matjark-icon-button--primary"
              onClick={() => setSelectedInvoice(row)}
            />
            {row.status === 'completed' && (
              <MuiIconButton
                icon={<RotateCcw className="w-4 h-4" />}
                ariaLabel={`استرجاع الفاتورة ${row.invoiceNumber}`}
                title="استرجاع الفاتورة وإعادة الكمية للمخزون"
                size="extraSmall"
                shape="square"
                className="matjark-table-icon-button matjark-icon-button--danger"
                onClick={() => refundInvoice(row.id)}
              />
            )}
          </div>
        ),
      },
    ],
    [refundInvoice, formatCurrency]
  );

  return (
    <div className="space-y-4">
      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-[#1e1e1e] p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 block">إجمالي المبيعات النشطة</span>
            <span className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
              {formatCurrency(invoiceMetrics.completedSum)}
            </span>
          </div>
          <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-[#1e1e1e] p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 block">عدد الفواتير المصدرة</span>
            <span className="text-xl font-bold font-mono text-slate-900 dark:text-slate-100">
              {invoiceMetrics.completedCount} فاتورة
            </span>
          </div>
          <div className="p-2.5 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600">
            <FileText className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-[#1e1e1e] p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 block">ضريبة القيمة المضافة المحصلة</span>
            <span className="text-xl font-bold font-mono text-purple-600 dark:text-purple-400">
              {formatCurrency(invoiceMetrics.taxTotal)}
            </span>
          </div>
          <div className="p-2.5 rounded-lg bg-purple-50 dark:bg-purple-950/50 text-purple-600">
            <span className="font-bold text-xs font-mono">VAT</span>
          </div>
        </div>

        <div className="bg-white dark:bg-[#1e1e1e] p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 block">المبالغ المسترجعة</span>
            <span className="text-xl font-bold font-mono text-rose-500">
              {formatCurrency(invoiceMetrics.refundedSum)}
            </span>
          </div>
          <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/50 text-rose-600">
            <RotateCcw className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Virtualized Invoices Grid */}
      <MuiDataGrid
        rows={filteredInvoices}
        columns={columns}
        height={540}
        searchPlaceholder="بحث برقم الفاتورة أو اسم العميل..."
        searchFields={['invoiceNumber', 'customerName', 'cashierName']}
        toolbarActions={
          <MuiChipGroup
            value={statusFilter}
            onChange={(value) => setStatusFilter(value as typeof statusFilter)}
            ariaLabel="تصفية الفواتير"
            className="matjark-filter-chips"
            options={[
              { value: 'all', label: 'الكل' },
              { value: 'completed', label: `المكتملة (${invoiceMetrics.completedCount})` },
              { value: 'refunded', label: `المسترجعة (${invoiceMetrics.refundedCount})` },
            ]}
          />
        }
      />

      {/* Invoice Viewer Modal */}
      {selectedInvoice && (
        <MuiDialog
          open={!!selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
          title={`تفاصيل الفاتورة ${selectedInvoice.invoiceNumber}`}
          maxWidth="sm"
        >
          <ThermalReceipt
            invoice={selectedInvoice}
            settings={settings}
            onClose={() => setSelectedInvoice(null)}
          />
        </MuiDialog>
      )}
    </div>
  );
};
