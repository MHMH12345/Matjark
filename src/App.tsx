/**
 * متجرك Matjark - Main Application Shell (React 19 & Material 3)
 */

import React, { lazy, Suspense, useState, useEffect } from 'react';
import { Sidebar } from './components/layout/Sidebar';
import { MobileNavigation } from './components/layout/MobileNavigation';
import { CashierScreen } from './components/pos/CashierScreen';
import { MuiSnackbar } from './components/ui/MuiSnackbar';
import { StoreProvider, useStore } from './context/StoreContext';
import { AuthProvider } from './context/AuthContext';
import { perfTracker } from './utils/performance';

const InventoryScreen = lazy(() =>
  import('./components/inventory/InventoryScreen').then((module) => ({ default: module.InventoryScreen }))
);
const InvoicesScreen = lazy(() =>
  import('./components/invoices/InvoicesScreen').then((module) => ({ default: module.InvoicesScreen }))
);
const AccountingScreen = lazy(() =>
  import('./components/accounting/AccountingScreen').then((module) => ({ default: module.AccountingScreen }))
);
const ReportsScreen = lazy(() =>
  import('./components/reports/ReportsScreen').then((module) => ({ default: module.ReportsScreen }))
);
const CustomersScreen = lazy(() =>
  import('./components/customers/CustomersScreen').then((module) => ({ default: module.CustomersScreen }))
);
const SettingsScreen = lazy(() =>
  import('./components/settings/SettingsScreen').then((module) => ({ default: module.SettingsScreen }))
);
const PerformanceBenchmarkModal = lazy(() =>
  import('./components/performance/PerformanceBenchmarkModal').then((module) => ({
    default: module.PerformanceBenchmarkModal,
  }))
);

function ScreenLoading() {
  return (
    <div
      className="min-h-[180px] w-full flex items-center justify-center text-sm text-[var(--md-sys-color-on-surface-variant)]"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      جارٍ تحميل الشاشة...
    </div>
  );
}

function MainAppContent() {
  const { activeTab, snackbars, dismissToast } = useStore();
  const [perfModalOpen, setPerfModalOpen] = useState(false);
  const isCashier = activeTab === 'pos';

  useEffect(() => {
    const t0 = performance.now();
    return () => {
      const duration = performance.now() - t0;
      perfTracker.recordRenderDuration(duration);
    };
  });

  return (
    <div className={"matjark-app-shell h-screen w-screen flex flex-row bg-[var(--md-sys-color-background)] text-[var(--md-sys-color-on-background)] font-['IBM_Plex_Sans_Arabic',sans-serif] overflow-hidden" + (isCashier ? " matjark-app-shell--cashier" : "")} dir="rtl">
      <Sidebar />
      <main className={"matjark-app-main flex-1 h-full min-w-0 min-h-0 overflow-y-auto p-4 sm:p-6" + (isCashier ? " matjark-app-main--cashier" : "")}>
        <div className={isCashier ? "matjark-screen-host matjark-screen-host--cashier" : "matjark-screen-host"}>
          {activeTab === 'pos' && <CashierScreen />}
          <Suspense fallback={<ScreenLoading />}>
            {activeTab === 'inventory' && <InventoryScreen />}
            {activeTab === 'invoices' && <InvoicesScreen />}
            {activeTab === 'accounting' && <AccountingScreen />}
            {activeTab === 'reports' && <ReportsScreen />}
            {activeTab === 'customers' && <CustomersScreen />}
            {activeTab === 'settings' && <SettingsScreen />}
          </Suspense>
        </div>
      </main>
      {!isCashier && <MobileNavigation />}
      {perfModalOpen && (
        <Suspense fallback={null}>
          <PerformanceBenchmarkModal open={perfModalOpen} onClose={() => setPerfModalOpen(false)} />
        </Suspense>
      )}
      <MuiSnackbar messages={snackbars} onDismiss={dismissToast} />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <StoreProvider>
        <MainAppContent />
      </StoreProvider>
    </AuthProvider>
  );
}
