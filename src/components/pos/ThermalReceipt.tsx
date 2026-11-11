import React, { memo, useMemo } from 'react';
import { Invoice, StoreSettings } from '../../types';
import { generateQrMatrix } from '../../utils/zatcaQr';
import { formatEgp } from '../../utils/currency';
import { Printer, CheckCircle2 } from 'lucide-react';
import { MuiButton } from '../ui/MuiButton';

interface ThermalReceiptProps {
  invoice: Invoice;
  settings: StoreSettings;
  onClose?: () => void;
}

export const ThermalReceipt: React.FC<ThermalReceiptProps> = memo(({ invoice, settings, onClose }) => {
  // Generate QR matrix from the invoice data
  const qrMatrix = useMemo(() => {
    const text = invoice.zatcaQrString || `INV:${invoice.invoiceNumber}:${invoice.grandTotal}:${settings.storeName}`;
    return generateQrMatrix(text);
  }, [invoice, settings.storeName]);

  const handlePrint = () => {
    window.print();
  };

  const formattedDate = useMemo(() => {
    return new Date(invoice.timestamp).toLocaleString('ar-EG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }, [invoice.timestamp]);

  const paymentLabel = useMemo(() => {
    switch (invoice.paymentMethod) {
      case 'cash':
        return 'نقدي (كاش)';
      case 'card':
        return 'بطاقة بنكية (فيزا / ميزة)';
      case 'wallet':
        return 'محفظة إلكترونية (فودافون كاش / إنستاباي)';
      case 'transfer':
        return 'تحويل بنكي مباشر';
      case 'credit':
        return 'آجل / على الحساب';
      default:
        return 'نقدي';
    }
  }, [invoice.paymentMethod]);

  const hasTax = invoice.isTaxEnabled && invoice.taxTotal > 0;

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Actions (Hidden during print) */}
      <div className="flex items-center gap-3 no-print w-full justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-sm font-semibold">
          <CheckCircle2 className="w-5 h-5" />
          <span>{hasTax ? 'فاتورة مبيعات ضريبية صادرة' : 'إيصال مبيعات نقدي صادر بنجاح'}</span>
        </div>
        <div className="flex items-center gap-2">
          <MuiButton
            variant="contained"
            color="primary"
            size="small"
            startIcon={<Printer className="w-4 h-4" />}
            onClick={handlePrint}
          >
            طباعة الفاتورة (80mm)
          </MuiButton>
          {onClose && (
            <MuiButton variant="outlined" size="small" onClick={onClose}>
              إغلاق
            </MuiButton>
          )}
        </div>
      </div>

      {/* Printable 80mm Receipt Area */}
      <div
        id="thermal-receipt-print-area"
        className="w-[320px] bg-white text-black p-4 rounded-lg shadow-md border border-slate-200 font-mono text-xs leading-tight select-text"
        dir="rtl"
      >
        {/* Store Header */}
        <div className="text-center pb-3 border-b border-dashed border-gray-400">
          <h2 className="text-base font-bold text-black">{settings.storeName}</h2>
          {settings.storeNameEn && <p className="text-[11px] text-gray-700">{settings.storeNameEn}</p>}
          <p className="text-[10px] text-gray-700 mt-1">{settings.branchName}</p>
          <p className="text-[10px] text-gray-700">{settings.address}</p>
          <p className="text-[10px] text-gray-700">هاتف: {settings.phone}</p>
          <div className="mt-1.5 pt-1 border-t border-gray-200">
            {settings.taxNumber && <p className="text-[11px] font-bold">ب.ض: {settings.taxNumber}</p>}
            {settings.crNumber && <p className="text-[10px] text-gray-600">س.ت: {settings.crNumber}</p>}
          </div>
        </div>

        {/* Invoice Info */}
        <div className="py-2 border-b border-dashed border-gray-400 space-y-1 text-[11px]">
          <div className="flex justify-between font-bold">
            <span>{hasTax ? 'فاتورة ضريبية مبسطة' : 'إيصال مبيعات نقدية'}</span>
            <span>{invoice.invoiceNumber}</span>
          </div>
          <div className="flex justify-between text-gray-700">
            <span>التاريخ والوقت:</span>
            <span>{formattedDate}</span>
          </div>
          <div className="flex justify-between text-gray-700">
            <span>الكاشير:</span>
            <span>{invoice.cashierName}</span>
          </div>
          <div className="flex justify-between text-gray-700">
            <span>العميل:</span>
            <span>{invoice.customerName || 'عميل نقدي'}</span>
          </div>
          {invoice.customerTaxNumber && (
            <div className="flex justify-between text-gray-700">
              <span>رقم ضريبة العميل:</span>
              <span>{invoice.customerTaxNumber}</span>
            </div>
          )}
        </div>

        {/* Line Items Table */}
        <div className="py-2 border-b border-dashed border-gray-400">
          <div className="flex justify-between font-bold text-[10px] pb-1 border-b border-gray-300">
            <span className="w-1/2">الصنف</span>
            <span className="w-1/6 text-center">الكمية</span>
            <span className="w-1/6 text-center">السعر</span>
            <span className="w-1/6 text-end">الإجمالي</span>
          </div>
          <div className="divide-y divide-gray-100 py-1">
            {invoice.items.map((item, idx) => (
              <div key={idx} className="py-1 text-[10px]">
                <div className="font-semibold">{item.productName}</div>
                <div className="flex justify-between text-gray-600 pt-0.5">
                  <span className="w-1/2 text-[9px]">{item.barcode}</span>
                  <span className="w-1/6 text-center">{item.quantity}</span>
                  <span className="w-1/6 text-center">{item.unitPrice.toFixed(2)}</span>
                  <span className="w-1/6 text-end font-bold text-black">{item.total.toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Totals Summary */}
        <div className="py-2 border-b border-dashed border-gray-400 space-y-1 text-xs">
          <div className="flex justify-between">
            <span>المجموع الأساسي:</span>
            <span>{formatEgp(invoice.subtotal, { customSymbol: settings.currency })}</span>
          </div>
          {invoice.discountTotal > 0 && (
            <div className="flex justify-between text-red-600">
              <span>إجمالي الخصم:</span>
              <span>-{formatEgp(invoice.discountTotal, { customSymbol: settings.currency })}</span>
            </div>
          )}
          {hasTax && (
            <div className="flex justify-between">
              <span>ضريبة القيمة المضافة (14%):</span>
              <span>{formatEgp(invoice.taxTotal, { customSymbol: settings.currency })}</span>
            </div>
          )}
          <div className="flex justify-between font-extrabold text-sm pt-1 border-t border-gray-300">
            <span>المجموع النهائي المطلوب:</span>
            <span>{formatEgp(invoice.grandTotal, { customSymbol: settings.currency })}</span>
          </div>
        </div>

        {/* Payment Details */}
        <div className="py-2 border-b border-dashed border-gray-400 space-y-1 text-[11px] text-gray-700">
          <div className="flex justify-between">
            <span>طريقة الدفع:</span>
            <span className="font-bold">{paymentLabel}</span>
          </div>
          <div className="flex justify-between">
            <span>المبلغ المدفوع:</span>
            <span>{formatEgp(invoice.amountPaid, { customSymbol: settings.currency })}</span>
          </div>
          {invoice.changeDue > 0 && (
            <div className="flex justify-between font-semibold">
              <span>المتبقي للعميل (الباقي):</span>
              <span>{formatEgp(invoice.changeDue, { customSymbol: settings.currency })}</span>
            </div>
          )}
        </div>

        {/* Official QR Code Stamp */}
        <div className="py-3 flex flex-col items-center justify-center">
          <div className="p-1 bg-white border border-gray-800 rounded-xs">
            <svg
              width="130"
              height="130"
              viewBox={`0 0 ${qrMatrix.length} ${qrMatrix.length}`}
              shapeRendering="crispEdges"
              className="w-32 h-32"
            >
              <rect width={qrMatrix.length} height={qrMatrix.length} fill="#ffffff" />
              {qrMatrix.map((row, rIdx) =>
                row.map((cell, cIdx) =>
                  cell ? (
                    <rect key={`${rIdx}-${cIdx}`} x={cIdx} y={rIdx} width="1" height="1" fill="#000000" />
                  ) : null
                )
              )}
            </svg>
          </div>
          <p className="text-[9px] text-gray-500 mt-1">رمز الاستجابة السريع للتحقق من الفاتورة</p>
        </div>

        {/* Footer Message */}
        <div className="text-center text-[10px] text-gray-600 pt-1 border-t border-dashed border-gray-300">
          <p>{settings.receiptFooterMessage}</p>
          <p className="text-[8px] text-gray-400 mt-1">نظام متجرك Matjark POS - نسخة رسمية</p>
        </div>
      </div>
    </div>
  );
});

ThermalReceipt.displayName = 'ThermalReceipt';
