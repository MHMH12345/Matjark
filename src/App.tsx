/**
 * متجرك Matjark - Main Application Shell (React 19 & Material 3)
 */

import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/layout/Sidebar';
import { CashierScreen } from './components/pos/CashierScreen';
import { InventoryScreen } from './components/inventory/InventoryScreen';
import { InvoicesScreen } from './components/invoices/InvoicesScreen';
import { AccountingScreen } from './components/accounting/AccountingScreen';
import { ReportsScreen } from './components/reports/ReportsScreen';
import { CustomersScreen } from './components/customers/CustomersScreen';
import { SettingsScreen } from './components/settings/SettingsScreen';
import { PerformanceBenchmarkModal } from './components/performance/PerformanceBenchmarkModal';
import { MuiSnackbar } from './components/ui/MuiSnackbar';
import { StoreProvider, useStore } from './context/StoreContext';
import { perfTracker } from './utils/performance';

function MainAppContent() {
  const { activeTab, snackbars, dismissToast } = useStore();
  const [perfModalOpen, setPerfModalOpen] = useState(false);

  useEffect(() => {
    const t0 = performance.now();
    return () => {
      const duration = performance.now() - t0;
      perfTracker.recordRenderDuration(duration);
    };
  });

  return (
    <div className="h-screen w-screen flex flex-row bg-[var(--md-sys-color-background)] text-[var(--md-sys-color-on-background)] font-['Cairo',sans-serif] overflow-hidden" dir="rtl">
      
      {/* الشريط الجانبي على اليمين */}
      <Sidebar />

      {/* المحتوى الأساسي (بياخد باقي المساحة) */}
      <main className="flex-1 h-full min-w-0 min-h-0 overflow-y-auto p-4 sm:p-6">
        {activeTab === 'pos' && <CashierScreen />}
        {activeTab === 'inventory' && <InventoryScreen />}
        {activeTab === 'invoices' && <InvoicesScreen />}
        {activeTab === 'accounting' && <AccountingScreen />}
        {activeTab === 'reports' && <ReportsScreen />}
        {activeTab === 'customers' && <CustomersScreen />}
        {activeTab === 'settings' && <SettingsScreen />}
      </main>

      <PerformanceBenchmarkModal open={perfModalOpen} onClose={() => setPerfModalOpen(false)} />
      <MuiSnackbar messages={snackbars} onDismiss={dismissToast} />
    </div>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <MainAppContent />
    </StoreProvider>
  );
}