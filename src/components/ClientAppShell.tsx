'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { AppProvider, useApp } from '@/context/AppContext';
import { Navbar } from './Navbar';
import { RecordSaleModal } from './RecordSaleModal';
import { QrCodeModal } from './QrCodeModal';
import { CustomerDetailModal } from './CustomerDetailModal';
import { ErrorBoundary } from './ErrorBoundary';
import { FounderLock } from './FounderLock';

function ShellInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPublicPage =
    pathname?.startsWith('/opt-in') ||
    pathname?.startsWith('/kiosk') ||
    pathname?.startsWith('/portal') ||
    pathname?.startsWith('/billing');

  const {
    refreshData,
    isRecordSaleOpen,
    closeRecordSaleModal,
    preselectedCustomerId,
    openRecordSaleModal,
    isQrOpen,
    isQrPrintCard,
    closeQrModal,
    openQrModal,
    selectedCustomerIdForDetail,
    closeCustomerDetail,
  } = useApp();

  if (isPublicPage) {
    return <main>{children}</main>;
  }

  return (
    <FounderLock>
      <div className="flex flex-col min-h-screen">
        <Navbar
          onOpenRecordModal={() => openRecordSaleModal()}
          onOpenQrModal={openQrModal}
          onBusinessChanged={refreshData}
        />

        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-5 pb-24 lg:pb-10">
          {children}
        </main>

        {/* Global Modals */}
        <RecordSaleModal
          isOpen={isRecordSaleOpen}
          onClose={closeRecordSaleModal}
          onSuccess={refreshData}
          preselectedCustomerId={preselectedCustomerId}
        />

        <QrCodeModal
          isOpen={isQrOpen}
          onClose={closeQrModal}
          initialShowPrintCard={isQrPrintCard}
        />

        <CustomerDetailModal
          customerId={selectedCustomerIdForDetail}
          isOpen={Boolean(selectedCustomerIdForDetail)}
          onClose={closeCustomerDetail}
          onUpdated={refreshData}
          onRecordVisitForCustomer={(id) => openRecordSaleModal(id)}
        />
      </div>
    </FounderLock>
  );
}

export function ClientAppShell({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
      <React.Suspense fallback={<div className="min-h-screen bg-slate-50" />}>
        <AppProvider>
          <ShellInner>{children}</ShellInner>
        </AppProvider>
      </React.Suspense>
    </ErrorBoundary>
  );
}
