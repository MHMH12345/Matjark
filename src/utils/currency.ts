/**
 * Unified Egyptian Pound (EGP / ج.م) Currency Formatting & Accounting Utilities.
 * Optimized for peak performance in POS, Invoicing, and Inventory calculations.
 */

export interface CurrencyFormatOptions {
  /** If true, appends English ISO code: '1,250.00 ج.م (EGP)' */
  showCode?: boolean;
  /** Use English ISO code exclusively: '1,250.00 EGP' */
  codeOnly?: boolean;
  /** Compact format for tight badges/charts: '12.5k ج.م' */
  compact?: boolean;
  /** Force specific symbol (defaults to 'ج.م') */
  customSymbol?: string;
  /** Minimum fraction digits (default: 2) */
  minFractionDigits?: number;
  /** Maximum fraction digits (default: 2) */
  maxFractionDigits?: number;
}

/**
 * Standard number formatter using standard numerals with thousands comma separators.
 * This avoids numeral garbling on thermal printers and across different browser OS configurations.
 */
const standardNumberFormat = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const compactNumberFormat = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  compactDisplay: 'short',
  maximumFractionDigits: 1,
});

/**
 * Formats monetary amounts in Egyptian Pounds (EGP / ج.م) uniformly.
 * Examples:
 *   formatEgp(1250) -> '1,250.00 ج.م'
 *   formatEgp(1250, { showCode: true }) -> '1,250.00 ج.م (EGP)'
 *   formatEgp(1250, { codeOnly: true }) -> '1,250.00 EGP'
 *   formatEgp(-45.5) -> '-45.50 ج.م'
 */
export function formatEgp(amount: number | null | undefined, options?: CurrencyFormatOptions): string {
  const safeAmount = Number.isFinite(amount) ? (amount as number) : 0;
  const symbol = options?.customSymbol || 'ج.م';

  if (options?.compact) {
    const compactNum = compactNumberFormat.format(safeAmount);
    return `${compactNum} ${symbol}`;
  }

  let formattedNumber: string;
  if (options?.minFractionDigits !== undefined || options?.maxFractionDigits !== undefined) {
    formattedNumber = safeAmount.toLocaleString('en-US', {
      minimumFractionDigits: options.minFractionDigits ?? 2,
      maximumFractionDigits: options.maxFractionDigits ?? 2,
    });
  } else {
    formattedNumber = standardNumberFormat.format(safeAmount);
  }

  if (options?.codeOnly) {
    return `${formattedNumber} EGP`;
  }

  if (options?.showCode) {
    return `${formattedNumber} ${symbol} (EGP)`;
  }

  return `${formattedNumber} ${symbol}`;
}

/**
 * Convenience helper that always returns both Arabic symbol and English ISO code.
 * Example: '1,250.00 ج.م (EGP)'
 */
export function formatEgpWithCode(amount: number | null | undefined): string {
  return formatEgp(amount, { showCode: true });
}

/**
 * Convenience helper that returns only the formatted number without currency sign.
 * Example: '1,250.00'
 */
export function formatNumberPlain(amount: number | null | undefined, decimals = 2): string {
  const safeAmount = Number.isFinite(amount) ? (amount as number) : 0;
  return safeAmount.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Safe monetary rounding to 2 decimal places to avoid floating-point inaccuracies.
 */
export function roundToTwoDecimals(val: number): number {
  return Math.round((val + Number.EPSILON) * 100) / 100;
}

/**
 * Common Egyptian banknote denominations in EGP for rapid cash checkout.
 */
export const EGYPTIAN_CASH_DENOMINATIONS = [5, 10, 20, 50, 100, 200] as const;

/**
 * Accounting Calculation Functions
 */

/**
 * Calculates net line item total, tax amount, and gross line total.
 */
export function calculateLineAccounting(params: {
  unitPrice: number;
  quantity: number;
  discountPerItem?: number;
  taxRate: number;
  isTaxEnabled: boolean;
  pricesIncludeTax?: boolean;
}): {
  subtotal: number;
  discountTotal: number;
  netLineTotal: number;
  taxAmount: number;
  totalWithTax: number;
} {
  const quantity = Number.isFinite(params.quantity) ? Math.max(0, params.quantity) : 0;
  const unitPrice = Number.isFinite(params.unitPrice) ? Math.max(0, params.unitPrice) : 0;
  const requestedDiscount = Number.isFinite(params.discountPerItem)
    ? Math.max(0, params.discountPerItem ?? 0)
    : 0;
  const discount = Math.min(unitPrice, requestedDiscount);

  const subtotal = roundToTwoDecimals(unitPrice * quantity);
  const discountTotal = roundToTwoDecimals(discount * quantity);
  const netLineTotal = Math.max(0, roundToTwoDecimals(subtotal - discountTotal));

  const taxRate = Number.isFinite(params.taxRate) ? Math.max(0, params.taxRate) : 0;
  const effectiveTaxRate = params.isTaxEnabled ? taxRate : 0;
  const discountedSubtotal = netLineTotal;

  if (params.pricesIncludeTax && effectiveTaxRate > 0) {
    // The entered/displayed price is the final gross price; extract VAT from it.
    const taxAmount = roundToTwoDecimals(
      discountedSubtotal - discountedSubtotal / (1 + effectiveTaxRate)
    );
    const netAmount = Math.max(0, roundToTwoDecimals(discountedSubtotal - taxAmount));

    return {
      subtotal,
      discountTotal,
      netLineTotal: netAmount,
      taxAmount,
      totalWithTax: discountedSubtotal,
    };
  }

  const taxAmount = roundToTwoDecimals(discountedSubtotal * effectiveTaxRate);
  const totalWithTax = roundToTwoDecimals(discountedSubtotal + taxAmount);

  return { subtotal, discountTotal, netLineTotal: discountedSubtotal, taxAmount, totalWithTax };
}

/**
 * Profit & Loss and VAT Settlement aggregator.
 */
export interface AccountingMetrics {
  grossRevenue: number;
  costOfGoodsSold: number;
  grossProfit: number;
  grossProfitMarginPercent: number;
  totalExpenses: number;
  netProfit: number;
  netProfitMarginPercent: number;
  salesVatCollected: number;
  expensesVatPaid: number;
  netVatPayable: number;
  inventoryValuationSale: number;
  inventoryValuationCost: number;
}

export function computeAccountingMetrics(params: {
  invoices: Array<{
    status: string;
    subtotal: number;
    discountTotal?: number;
    taxTotal: number;
    pricesIncludeTax?: boolean;
    grandTotal: number;
    items: Array<{ costPrice: number; quantity: number }>;
  }>;
  expenses: Array<{
    amount: number;
    taxAmount?: number;
    category?: string;
  }>;
  products: Array<{
    stock: number;
    costPrice: number;
    salePrice: number;
  }>;
}): AccountingMetrics {
  let grossRevenue = 0;
  let costOfGoodsSold = 0;
  let salesVatCollected = 0;

  params.invoices.forEach((invoice) => {
    if (invoice.status !== 'completed') return;

    // Invoice.subtotal is pre-discount; recognize revenue after discounts.
    const revenueAfterDiscount = invoice.subtotal - (invoice.discountTotal || 0);
    grossRevenue += Math.max(0, revenueAfterDiscount - (invoice.pricesIncludeTax ? invoice.taxTotal || 0 : 0));
    salesVatCollected += invoice.taxTotal || 0;

    invoice.items.forEach((item) => {
      costOfGoodsSold += (item.costPrice || 0) * (item.quantity || 0);
    });
  });

  let totalExpenses = 0;
  let expensesVatPaid = 0;

  params.expenses.forEach((expense) => {
    // Inventory purchases are assets; their cost enters COGS when the goods are sold.
    if (expense.category !== 'inventory_purchase') {
      totalExpenses += expense.amount || 0;
    }
    // Input VAT is tracked separately, including VAT paid on inventory purchases.
    expensesVatPaid += expense.taxAmount || 0;
  });

  let inventoryValuationSale = 0;
  let inventoryValuationCost = 0;

  params.products.forEach((product) => {
    if (product.stock > 0) {
      inventoryValuationSale += product.salePrice * product.stock;
      inventoryValuationCost += product.costPrice * product.stock;
    }
  });

  const roundedGrossRevenue = roundToTwoDecimals(grossRevenue);
  const roundedCogs = roundToTwoDecimals(costOfGoodsSold);
  const roundedGrossProfit = roundToTwoDecimals(roundedGrossRevenue - roundedCogs);
  const grossProfitMarginPercent =
    roundedGrossRevenue > 0 ? roundToTwoDecimals((roundedGrossProfit / roundedGrossRevenue) * 100) : 0;

  const roundedExpenses = roundToTwoDecimals(totalExpenses);
  const roundedNetProfit = roundToTwoDecimals(roundedGrossProfit - roundedExpenses);
  const netProfitMarginPercent =
    roundedGrossRevenue > 0 ? roundToTwoDecimals((roundedNetProfit / roundedGrossRevenue) * 100) : 0;

  const roundedSalesVat = roundToTwoDecimals(salesVatCollected);
  const roundedExpensesVat = roundToTwoDecimals(expensesVatPaid);
  const roundedNetVat = roundToTwoDecimals(roundedSalesVat - roundedExpensesVat);

  return {
    grossRevenue: roundedGrossRevenue,
    costOfGoodsSold: roundedCogs,
    grossProfit: roundedGrossProfit,
    grossProfitMarginPercent,
    totalExpenses: roundedExpenses,
    netProfit: roundedNetProfit,
    netProfitMarginPercent,
    salesVatCollected: roundedSalesVat,
    expensesVatPaid: roundedExpensesVat,
    netVatPayable: roundedNetVat,
    inventoryValuationSale: roundToTwoDecimals(inventoryValuationSale),
    inventoryValuationCost: roundToTwoDecimals(inventoryValuationCost),
  };
}
