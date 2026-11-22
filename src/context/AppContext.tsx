'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Business, Customer, SaleOrVisit } from '@/types';
import { getActiveBusiness, getCustomers, getSales } from '@/lib/storage';

interface AppContextType {
  activeBusiness: Business | null;
  customers: Customer[];
  sales: SaleOrVisit[];
  refreshData: () => void;
  openRecordSaleModal: (preselectedCustomerId?: string) => void;
  closeRecordSaleModal: () => void;
  isRecordSaleOpen: boolean;
  preselectedCustomerId?: string;
  openQrModal: (printCard?: boolean | unknown) => void;
  closeQrModal: () => void;
  isQrOpen: boolean;
  isQrPrintCard: boolean;
  selectedCustomerIdForDetail: string | null;
  openCustomerDetail: (id: string) => void;
  closeCustomerDetail: () => void;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [activeBusiness, setActiveBusiness] = useState<Business | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [sales, setSales] = useState<SaleOrVisit[]>([]);

  const [isRecordSaleOpen, setIsRecordSaleOpen] = useState(false);
  const [preselectedCustomerId, setPreselectedCustomerId] = useState<string | undefined>(undefined);

  const [isQrOpen, setIsQrOpen] = useState(false);
  const [isQrPrintCard, setIsQrPrintCard] = useState(false);
  const [selectedCustomerIdForDetail, setSelectedCustomerIdForDetail] = useState<string | null>(null);

  function refreshData() {
    const biz = getActiveBusiness();
    setActiveBusiness(biz);
    if (biz) {
      setCustomers(getCustomers(biz.id));
      setSales(getSales(biz.id));
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      refreshData();
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  function openRecordSaleModal(custId?: string) {
    setPreselectedCustomerId(custId);
    setIsRecordSaleOpen(true);
  }

  function closeRecordSaleModal() {
    setIsRecordSaleOpen(false);
    setPreselectedCustomerId(undefined);
  }

  function openQrModal(printCard?: boolean | unknown) {
    setIsQrPrintCard(printCard === true);
    setIsQrOpen(true);
  }

  function closeQrModal() {
    setIsQrOpen(false);
    setIsQrPrintCard(false);
  }

  function openCustomerDetail(id: string) {
    setSelectedCustomerIdForDetail(id);
  }

  function closeCustomerDetail() {
    setSelectedCustomerIdForDetail(null);
  }

  return (
    <AppContext.Provider
      value={{
        activeBusiness,
        customers,
        sales,
        refreshData,
        openRecordSaleModal,
        closeRecordSaleModal,
        isRecordSaleOpen,
        preselectedCustomerId,
        openQrModal,
        closeQrModal,
        isQrOpen,
        isQrPrintCard,
        selectedCustomerIdForDetail,
        openCustomerDetail,
        closeCustomerDetail,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
