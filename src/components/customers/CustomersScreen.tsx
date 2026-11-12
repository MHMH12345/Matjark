/**
 * Customers & Suppliers Directory with Balances and Quick Contacts.
 */

import React, { useState, useMemo } from 'react';
import { MuiCard } from '../ui/MuiCard';
import {
  Users,
  Building2,
  Plus,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  Search,
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { Customer, Supplier } from '../../types';
import { MuiButton } from '../ui/MuiButton';
import { MuiChipGroup } from '../ui/MuiChipGroup';
import { GridColumn, MuiDataGrid } from '../ui/MuiDataGrid';
import { MuiDialog } from '../ui/MuiDialog';
import { MuiTextField } from '../ui/MuiTextField';

export const CustomersScreen: React.FC = () => {
  const {
    customers,
    suppliers,
    addCustomer,
    updateCustomer,
    addSupplier,
    updateSupplier,
    settings,
    showToast,
    formatCurrency,
  } = useStore();

  const [activeSubTab, setActiveSubTab] = useState<'customers' | 'suppliers'>('customers');
  const [modalOpen, setModalOpen] = useState(false);

  // Customer Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [taxNumber, setTaxNumber] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [companyName, setCompanyName] = useState('');

  const handleOpenAdd = () => {
    setName('');
    setPhone('');
    setTaxNumber('');
    setEmail('');
    setAddress('');
    setCompanyName('');
    setModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      showToast('يرجى كتابة الاسم ورقم الهاتف', 'error');
      return;
    }

    if (activeSubTab === 'customers') {
      addCustomer({
        name,
        phone,
        taxNumber,
        email,
        address,
        balance: 0,
      });
    } else {
      addSupplier({
        name,
        phone,
        taxNumber,
        companyName: companyName || name,
        balance: 0,
      });
    }

    setModalOpen(false);
  };

  // Customers Grid Columns
  const customerColumns: GridColumn<Customer>[] = useMemo(
    () => [
      {
        field: 'name',
        headerName: 'اسم العميل',
        minWidth: 160,
        renderCell: (row) => (
          <div className="flex flex-col truncate">
            <span className="font-bold text-slate-800 dark:text-slate-200 truncate">{row.name}</span>
            {row.address && <span className="text-[10px] text-slate-400 truncate">{row.address}</span>}
          </div>
        ),
      },
      {
        field: 'phone',
        headerName: 'رقم الجوال',
        width: 140,
        renderCell: (row) => (
          <a
            href={`tel:${row.phone}`}
            className="font-mono text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
          >
            <Phone className="w-3 h-3 text-slate-400" />
            <span>{row.phone}</span>
          </a>
        ),
      },
      {
        field: 'taxNumber',
        headerName: 'الرقم الضريبي',
        width: 150,
        renderCell: (row) => (
          <span className="font-mono text-xs text-slate-500">
            {row.taxNumber || 'غير مسجل'}
          </span>
        ),
      },
      {
        field: 'balance',
        headerName: 'الرصيد / الآجل المستحق',
        width: 170,
        align: 'right',
        renderCell: (row) => (
          <span
            className={`font-mono font-bold ${
              row.balance > 0 ? 'text-amber-600' : 'text-emerald-600 dark:text-emerald-400'
            }`}
          >
            {row.balance > 0 ? `+${formatCurrency(row.balance)}` : formatCurrency(0)}
          </span>
        ),
      },
    ],
    [formatCurrency]
  );

  // Suppliers Grid Columns
  const supplierColumns: GridColumn<Supplier>[] = useMemo(
    () => [
      {
        field: 'companyName',
        headerName: 'اسم الشركة / المؤسسة',
        minWidth: 180,
        renderCell: (row) => (
          <div className="flex flex-col truncate">
            <span className="font-bold text-slate-800 dark:text-slate-200 truncate">
              {row.companyName}
            </span>
            <span className="text-[10px] text-slate-400 truncate">المندوب: {row.name}</span>
          </div>
        ),
      },
      {
        field: 'phone',
        headerName: 'رقم الهاتف',
        width: 140,
        renderCell: (row) => (
          <a
            href={`tel:${row.phone}`}
            className="font-mono text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
          >
            <Phone className="w-3 h-3 text-slate-400" />
            <span>{row.phone}</span>
          </a>
        ),
      },
      {
        field: 'taxNumber',
        headerName: 'الرقم الضريبي',
        width: 150,
        renderCell: (row) => (
          <span className="font-mono text-xs text-slate-500">{row.taxNumber || 'غير مسجل'}</span>
        ),
      },
      {
        field: 'balance',
        headerName: 'المستحق للمورد',
        width: 170,
        align: 'right',
        renderCell: (row) => (
          <span
            className={`font-mono font-bold ${
              row.balance > 0 ? 'text-rose-600' : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            {formatCurrency(row.balance)}
          </span>
        ),
      },
    ],
    [formatCurrency]
  );

  return (
    <div className="space-y-4">
      {/* Switcher Tab */}
      <MuiCard variant="outlined" className="matjark-surface-card matjark-surface-card--compact matjark-surface-card--horizontal">
        <MuiChipGroup
          value={activeSubTab}
          onChange={(value) => setActiveSubTab(value as typeof activeSubTab)}
          ariaLabel="التبديل بين دليل العملاء والموردين"
          className="matjark-filter-chips"
          options={[
            { value: 'customers', label: `دليل العملاء (${customers.length})`, icon: <Users className="w-4 h-4" /> },
            { value: 'suppliers', label: `دليل الموردين (${suppliers.length})`, icon: <Building2 className="w-4 h-4" /> },
          ]}
        />

        <MuiButton
          variant="contained"
          color="primary"
          size="small"
          startIcon={<Plus className="w-4 h-4" />}
          onClick={handleOpenAdd}
        >
          {activeSubTab === 'customers' ? 'إضافة عميل جديد' : 'إضافة مورد جديد'}
        </MuiButton>
      </MuiCard>

      {/* Virtualized Grid */}
      {activeSubTab === 'customers' ? (
        <MuiDataGrid
          rows={customers}
          columns={customerColumns}
          height={540}
          searchPlaceholder="بحث في العملاء بالاسم أو الجوال..."
          searchFields={['name', 'phone', 'taxNumber', 'address']}
        />
      ) : (
        <MuiDataGrid
          rows={suppliers}
          columns={supplierColumns}
          height={540}
          searchPlaceholder="بحث في الموردين بالاسم أو الشركة..."
          searchFields={['companyName', 'name', 'phone', 'taxNumber']}
        />
      )}

      {/* Add Dialog */}
      <MuiDialog
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={activeSubTab === 'customers' ? 'إضافة عميل جديد' : 'إضافة مورد / جهة توريد جديدة'}
        maxWidth="md"
        actions={
          <>
            <MuiButton variant="outlined" onClick={() => setModalOpen(false)}>
              إلغاء
            </MuiButton>
            <MuiButton variant="contained" color="primary" onClick={handleSave}>
              حفظ وتأكيد
            </MuiButton>
          </>
        }
      >
        <form onSubmit={handleSave} className="space-y-4">
          {activeSubTab === 'suppliers' && (
            <MuiTextField
              label="اسم الشركة / المؤسسة الموردة *"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="مثال: شركة التوريدات المتقدمة"
              required
            />
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <MuiTextField
              label={activeSubTab === 'customers' ? 'اسم العميل الكامل *' : 'اسم المندوب المسؤول *'}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <MuiTextField
              label="رقم الجوال أو الهاتف *"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="05XXXXXXXX"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <MuiTextField
              label="الرقم الضريبي (15 رقم للمؤسسات والشركات)"
              value={taxNumber}
              onChange={(e) => setTaxNumber(e.target.value)}
              placeholder="3XXXXXXXXXXXX03"
            />
            <MuiTextField
              label="البريد الإلكتروني"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="contact@domain.sa"
            />
          </div>

          <MuiTextField
            label="العنوان والمدينة"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="الرياض، حي السليمانية..."
          />
        </form>
      </MuiDialog>
    </div>
  );
};
