/**
 * High-Performance Virtualized Inventory Screen with Client-Side Image Compression.
 */

import React, { useState, useMemo, useCallback, useRef } from 'react';
import { MuiCard } from '../ui/MuiCard';
import {
  Package,
  Plus,
  AlertTriangle,
  Upload,
  Download,
  Barcode,
  Edit2,
  Trash2,
  DollarSign,
  TrendingUp,
  Image as ImageIcon,
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { Product } from '../../types';
import { compressProductImage, getProductPlaceholderSvg } from '../../utils/imageCompressor';
import { MuiButton } from '../ui/MuiButton';
import { MuiChip } from '../ui/MuiChip';
import { GridColumn, MuiDataGrid } from '../ui/MuiDataGrid';
import { MuiDialog } from '../ui/MuiDialog';
import { MuiTextField } from '../ui/MuiTextField';
import { MuiSelect } from '../ui/MuiSelect';
import { MuiIconButton } from '../ui/MuiIconButton';
import { MuiChipGroup } from '../ui/MuiChipGroup';

export const InventoryScreen: React.FC = () => {
  const { products, addProduct, updateProduct, deleteProduct, categories, settings, showToast, formatCurrency } =
    useStore();

  const [filterState, setFilterState] = useState<'all' | 'low_stock' | 'out_of_stock'>('all');
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form State for Add / Edit
  const [name, setName] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [barcode, setBarcode] = useState('');
  const [category, setCategory] = useState('أطعمة');
  const [costPrice, setCostPrice] = useState<number>(10);
  const [salePrice, setSalePrice] = useState<number>(15);
  const [stock, setStock] = useState<number>(50);
  const [minStockAlert, setMinStockAlert] = useState<number>(10);
  const [unit, setUnit] = useState('حبة');
  const [imageUrl, setImageUrl] = useState<string>('');
  const [isCompressingImage, setIsCompressingImage] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Filtered products list
  const filteredProducts = useMemo(() => {
    if (filterState === 'low_stock') {
      return products.filter((p) => p.stock > 0 && p.stock <= p.minStockAlert);
    }
    if (filterState === 'out_of_stock') {
      return products.filter((p) => p.stock <= 0);
    }
    return products;
  }, [products, filterState]);

  // Inventory Totals (memoized)
  const inventoryStats = useMemo(() => {
    let totalItems = products.length;
    let totalStockUnits = 0;
    let totalCostValuation = 0;
    let totalSaleValuation = 0;
    let lowStockCount = 0;

    products.forEach((p) => {
      totalStockUnits += p.stock;
      totalCostValuation += p.stock * p.costPrice;
      totalSaleValuation += p.stock * p.salePrice;
      if (p.stock <= p.minStockAlert) lowStockCount++;
    });

    return {
      totalItems,
      totalStockUnits,
      totalCostValuation: Math.round(totalCostValuation),
      totalSaleValuation: Math.round(totalSaleValuation),
      lowStockCount,
    };
  }, [products]);

  // Handle image upload with auto-compression
  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsCompressingImage(true);
      const compressedBase64 = await compressProductImage(file, 400, 0.75);
      setImageUrl(compressedBase64);
      showToast('تم ضغط الصورة وتحسينها بنجاح (<40KB)', 'success');
    } catch (err: any) {
      showToast(err?.message || 'فشل ضغط الصورة', 'error');
    } finally {
      setIsCompressingImage(false);
    }
  };

  const handleOpenAdd = () => {
    setEditingProduct(null);
    setName('');
    setNameEn('');
    setBarcode(`622${Math.floor(100000000 + Math.random() * 900000000)}`);
    setCategory(categories[0] || 'بقالة أساسية');
    setCostPrice(20);
    setSalePrice(25);
    setStock(50);
    setMinStockAlert(10);
    setUnit('قطعة');
    setImageUrl('');
    setAddModalOpen(true);
  };

  const handleOpenEdit = useCallback((prod: Product) => {
    setEditingProduct(prod);
    setName(prod.name);
    setNameEn(prod.nameEn || '');
    setBarcode(prod.barcode);
    setCategory(prod.category);
    setCostPrice(prod.costPrice);
    setSalePrice(prod.salePrice);
    setStock(prod.stock);
    setMinStockAlert(prod.minStockAlert);
    setUnit(prod.unit);
    setImageUrl(prod.imageUrl || '');
    setAddModalOpen(true);
  }, []);

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !barcode.trim()) {
      showToast('يرجى ملء اسم المنتج والباركود', 'error');
      return;
    }

    if (editingProduct) {
      updateProduct(editingProduct.id, {
        name,
        nameEn,
        barcode,
        category,
        costPrice: Number(costPrice),
        salePrice: Number(salePrice),
        stock: Number(stock),
        minStockAlert: Number(minStockAlert),
        unit,
        imageUrl,
      });
      showToast('تم تحديث بيانات المنتج', 'success');
    } else {
      addProduct({
        name,
        nameEn,
        barcode,
        category,
        costPrice: Number(costPrice),
        salePrice: Number(salePrice),
        stock: Number(stock),
        minStockAlert: Number(minStockAlert),
        taxRate: settings.defaultTaxRate,
        unit,
        imageUrl,
      });
    }
    setAddModalOpen(false);
  };

  // Virtualized DataGrid Columns Definition
  const columns: GridColumn<Product>[] = useMemo(
    () => [
      {
        field: 'imageUrl',
        headerName: 'الصورة',
        width: 70,
        sortable: false,
        align: 'center',
        renderCell: (row) => {
          const fallback = getProductPlaceholderSvg(row.name, row.category);
          return (
            <img
              src={row.imageUrl || fallback}
              alt=""
              loading="lazy"
              decoding="async"
              className="w-8 h-8 rounded-md object-cover border border-slate-200 dark:border-slate-700 mx-auto"
            />
          );
        },
      },
      {
        field: 'name',
        headerName: 'اسم المنتج',
        minWidth: 160,
        renderCell: (row) => (
          <div className="flex flex-col truncate">
            <span className="font-bold text-slate-900 dark:text-slate-100 truncate">{row.name}</span>
            {row.nameEn && <span className="text-[10px] text-slate-400 truncate">{row.nameEn}</span>}
          </div>
        ),
      },
      {
        field: 'barcode',
        headerName: 'الباركود',
        width: 140,
        renderCell: (row) => (
          <span className="font-mono text-xs text-slate-600 dark:text-slate-400 tracking-wider">
            {row.barcode}
          </span>
        ),
      },
      {
        field: 'category',
        headerName: 'الفئة',
        width: 110,
        renderCell: (row) => <MuiChip label={row.category} size="small" variant="outlined" />,
      },
      {
        field: 'salePrice',
        headerName: 'سعر البيع',
        width: 130,
        align: 'right',
        renderCell: (row) => (
          <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
            {formatCurrency(row.salePrice)}
          </span>
        ),
      },
      {
        field: 'costPrice',
        headerName: 'التكلفة',
        width: 120,
        align: 'right',
        renderCell: (row) => (
          <span className="font-mono text-slate-500">
            {formatCurrency(row.costPrice)}
          </span>
        ),
      },
      {
        field: 'profit',
        headerName: 'الهامش',
        width: 90,
        align: 'center',
        renderCell: (row) => {
          const profit = row.salePrice - row.costPrice;
          const pct = Math.round((profit / (row.costPrice || 1)) * 100);
          return (
            <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
              +{pct}%
            </span>
          );
        },
      },
      {
        field: 'stock',
        headerName: 'المخزون',
        width: 120,
        align: 'center',
        renderCell: (row) => {
          const isOut = row.stock <= 0;
          const isLow = row.stock > 0 && row.stock <= row.minStockAlert;

          return (
            <div className="flex items-center justify-center gap-1.5">
              <span
                className={`font-mono font-bold ${
                  isOut ? 'text-rose-600' : isLow ? 'text-amber-600' : 'text-slate-800 dark:text-slate-200'
                }`}
              >
                {row.stock} {row.unit}
              </span>
              {isLow && (
                <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" title="قارب النفاد" />
              )}
            </div>
          );
        },
      },
      {
        field: 'actions',
        headerName: 'إجراءات',
        width: 100,
        align: 'center',
        sortable: false,
        renderCell: (row) => (
          <div className="flex items-center justify-center gap-1">
            <MuiIconButton
              icon={<Edit2 className="w-4 h-4" />}
              ariaLabel={`تعديل المنتج ${row.name}`}
              title="تعديل"
              size="extraSmall"
              shape="square"
              className="matjark-table-icon-button matjark-icon-button--primary"
              onClick={() => handleOpenEdit(row)}
            />
            <MuiIconButton
              icon={<Trash2 className="w-4 h-4" />}
              ariaLabel={`حذف المنتج ${row.name}`}
              title="حذف"
              size="extraSmall"
              shape="square"
              className="matjark-table-icon-button matjark-icon-button--danger"
              onClick={() => deleteProduct(row.id)}
            />
          </div>
        ),
      },
    ],
    [handleOpenEdit, deleteProduct, formatCurrency]
  );

  return (
    <div className="space-y-4">
      {/* Top Inventory Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MuiCard variant="outlined" className="matjark-surface-card matjark-surface-card--compact matjark-surface-card--horizontal">
          <div>
            <span className="text-xs text-slate-500 block">إجمالي المنتجات</span>
            <span className="text-xl font-bold font-mono text-slate-900 dark:text-slate-100">
              {inventoryStats.totalItems.toLocaleString('ar-EG')}
            </span>
          </div>
          <div className="p-2.5 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600">
            <Package className="w-5 h-5" />
          </div>
        </MuiCard>

        <MuiCard variant="outlined" className="matjark-surface-card matjark-surface-card--compact matjark-surface-card--horizontal">
          <div>
            <span className="text-xs text-slate-500 block">قيمة المخزون (سعر البيع)</span>
            <span className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
              {formatCurrency(inventoryStats.totalSaleValuation)}
            </span>
          </div>
          <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600">
            <TrendingUp className="w-5 h-5" />
          </div>
        </MuiCard>

        <MuiCard variant="outlined" className="matjark-surface-card matjark-surface-card--compact matjark-surface-card--horizontal">
          <div>
            <span className="text-xs text-slate-500 block">تكلفة رأس المال</span>
            <span className="text-xl font-bold font-mono text-slate-700 dark:text-slate-300">
              {formatCurrency(inventoryStats.totalCostValuation)}
            </span>
          </div>
          <div className="p-2.5 rounded-lg bg-purple-50 dark:bg-purple-950/50 text-purple-600">
            <DollarSign className="w-5 h-5" />
          </div>
        </MuiCard>

        <MuiCard variant="outlined" className="matjark-surface-card matjark-surface-card--compact matjark-surface-card--horizontal">
          <div>
            <span className="text-xs text-slate-500 block">نواقص تحتاج إعادة طلب</span>
            <span className="text-xl font-bold font-mono text-amber-600">
              {inventoryStats.lowStockCount}
            </span>
          </div>
          <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-600">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </MuiCard>
      </div>

      {/* Main Virtualized Grid */}
      <MuiDataGrid
        rows={filteredProducts}
        columns={columns}
        height={560}
        searchPlaceholder="بحث فوري في المخزون بالاسم أو الباركود..."
        toolbarActions={
          <div className="flex items-center gap-2">
            <MuiChipGroup
              value={filterState}
              onChange={(value) => setFilterState(value as typeof filterState)}
              ariaLabel="تصفية المخزون"
              className="matjark-filter-chips"
              options={[
                { value: 'all', label: 'الكل' },
                { value: 'low_stock', label: `قارب النفاد (${inventoryStats.lowStockCount})` },
                { value: 'out_of_stock', label: 'نفد' },
              ]}
            />

            <MuiButton
              variant="contained"
              color="primary"
              size="small"
              startIcon={<Plus className="w-4 h-4" />}
              onClick={handleOpenAdd}
            >
              إضافة منتج جديد
            </MuiButton>
          </div>
        }
      />

      {/* Add / Edit Product Dialog with Image Compression */}
      <MuiDialog
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        title={editingProduct ? 'تعديل بيانات المنتج' : 'إضافة منتج جديد للمخزون'}
        maxWidth="md"
        actions={
          <>
            <MuiButton variant="outlined" onClick={() => setAddModalOpen(false)}>
              إلغاء
            </MuiButton>
            <MuiButton variant="contained" color="primary" onClick={handleSaveProduct}>
              {editingProduct ? 'حفظ التعديلات' : 'إضافة المنتج'}
            </MuiButton>
          </>
        }
      >
        <form onSubmit={handleSaveProduct} className="space-y-4">
          {/* Image Upload with Client-Side Compression */}
          <MuiCard variant="filled" className="matjark-surface-card matjark-surface-card--compact matjark-surface-card--horizontal">
            <div className="w-20 h-20 rounded-lg overflow-hidden bg-white dark:bg-[#202020] border border-slate-300 dark:border-slate-700 shrink-0 flex items-center justify-center relative">
              {imageUrl ? (
                <img src={imageUrl} alt="preview" className="w-full h-full object-cover" />
              ) : (
                <ImageIcon className="w-8 h-8 text-slate-400" />
              )}
              {isCompressingImage && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white text-[10px]">
                  جارِ الضغط...
                </div>
              )}
            </div>

            <div className="flex-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                صورة المنتج (يتم ضغطها آليًا إلى WebP فائق الخفة)
              </label>
              <div className="flex flex-wrap items-center gap-2">
                <MuiButton
                  variant="outlined"
                  color="primary"
                  size="small"
                  startIcon={<Upload className="w-4 h-4" />}
                  onClick={() => imageInputRef.current?.click()}
                  disabled={isCompressingImage}
                >
                  اختيار صورة المنتج
                </MuiButton>
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageFileChange}
                  className="sr-only"
                  tabIndex={-1}
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                تطبيق ضغط متقدم على المتصفح يمنع استهلاك الذاكرة وتخمة التخزين
              </p>
            </div>
          </MuiCard>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <MuiTextField
              label="اسم المنتج (عربي) *"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <MuiTextField
              label="اسم المنتج (إنجليزي - اختياري)"
              value={nameEn}
              onChange={(e) => setNameEn(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <MuiTextField
              label="الباركود الدولي أو المحلي *"
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              startAdornment={<Barcode className="w-4 h-4" />}
              required
            />

            <div>
              <MuiTextField
                label="التصنيف / الفئة"
                list="category-suggestions"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                density="compact"
                className="matjark-inventory-category-field"
              />
              <datalist id="category-suggestions">
                {categories.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                وحدة القياس
              </label>
              <MuiSelect
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full bg-white dark:bg-[#1e1e1e] border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-slate-100 outline-none focus:border-blue-600"
              >
                <option value="قطعة">قطعة</option>
                <option value="علبة">علبة</option>
                <option value="كيس">كيس</option>
                <option value="كرتونة">كرتونة</option>
                <option value="زجاجة">زجاجة</option>
                <option value="كيلو">كيلو جرام</option>
                <option value="باكت">باكت</option>
                <option value="شيكارة">شيكارة</option>
              </MuiSelect>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <MuiTextField
              label="سعر التكلفة (ج.م) *"
              type="number"
              step="0.01"
              value={costPrice}
              onChange={(e) => setCostPrice(parseFloat(e.target.value) || 0)}
              required
            />
            <MuiTextField
              label="سعر البيع (ج.م) *"
              type="number"
              step="0.01"
              value={salePrice}
              onChange={(e) => setSalePrice(parseFloat(e.target.value) || 0)}
              required
            />
            <MuiTextField
              label="الكمية المتوفرة *"
              type="number"
              value={stock}
              onChange={(e) => setStock(parseInt(e.target.value, 10) || 0)}
              required
            />
            <MuiTextField
              label="تنبيه قلة المخزون *"
              type="number"
              value={minStockAlert}
              onChange={(e) => setMinStockAlert(parseInt(e.target.value, 10) || 0)}
              required
            />
          </div>
        </form>
      </MuiDialog>
    </div>
  );
};
