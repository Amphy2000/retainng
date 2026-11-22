'use client';

import {
  Business,
  Customer,
  CustomerConsentRecord,
  SaleOrVisit,
  CustomerSegment,
  CampaignDraft,
  CampaignPreviewItem,
  OnboardingState,
  ConsentStatus,
  ConsentSource,
} from '@/types';
import {
  INITIAL_BUSINESSES,
  INITIAL_CUSTOMERS,
  INITIAL_SALES,
  INITIAL_CONSENT_RECORDS,
  INITIAL_CAMPAIGNS,
} from './seedData';

const STORAGE_KEYS = {
  ACTIVE_BIZ_ID: 'kudi_retention_active_biz_id',
  BUSINESSES: 'kudi_retention_businesses',
  CUSTOMERS: 'kudi_retention_customers',
  SALES: 'kudi_retention_sales',
  CONSENT_RECORDS: 'kudi_retention_consent_records',
  CAMPAIGNS: 'kudi_retention_campaigns',
  ONBOARDING: 'kudi_retention_onboarding',
};

// Safe localStorage access helper
function getStored<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const item = localStorage.getItem(key);
    return item ? (JSON.parse(item) as T) : fallback;
  } catch (e) {
    console.error(`Error reading ${key} from localStorage`, e);
    return fallback;
  }
}

function setStored<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error(`Error writing ${key} to localStorage`, e);
  }
}

// Initialize seed data if not present
export function initLocalStorage(): void {
  if (typeof window === 'undefined') return;

  if (!localStorage.getItem(STORAGE_KEYS.BUSINESSES)) {
    setStored(STORAGE_KEYS.BUSINESSES, INITIAL_BUSINESSES);
  }
  if (!localStorage.getItem(STORAGE_KEYS.ACTIVE_BIZ_ID)) {
    setStored(STORAGE_KEYS.ACTIVE_BIZ_ID, INITIAL_BUSINESSES[0].id);
  }
  if (!localStorage.getItem(STORAGE_KEYS.CUSTOMERS)) {
    setStored(STORAGE_KEYS.CUSTOMERS, INITIAL_CUSTOMERS);
  }
  if (!localStorage.getItem(STORAGE_KEYS.SALES)) {
    setStored(STORAGE_KEYS.SALES, INITIAL_SALES);
  }
  if (!localStorage.getItem(STORAGE_KEYS.CONSENT_RECORDS)) {
    setStored(STORAGE_KEYS.CONSENT_RECORDS, INITIAL_CONSENT_RECORDS);
  }
  if (!localStorage.getItem(STORAGE_KEYS.CAMPAIGNS)) {
    setStored(STORAGE_KEYS.CAMPAIGNS, INITIAL_CAMPAIGNS);
  }
}

// ----------------------------------------------------------------------------
// BUSINESSES
// ----------------------------------------------------------------------------
export function getBusinesses(): Business[] {
  initLocalStorage();
  return getStored<Business[]>(STORAGE_KEYS.BUSINESSES, INITIAL_BUSINESSES);
}

export function getActiveBusiness(): Business {
  initLocalStorage();
  const businesses = getBusinesses();
  const activeId = getStored<string>(STORAGE_KEYS.ACTIVE_BIZ_ID, businesses[0]?.id || 'biz_lekki_barber');
  const found = businesses.find((b) => b.id === activeId);
  return found || businesses[0] || INITIAL_BUSINESSES[0];
}

export function setActiveBusiness(businessId: string): Business {
  setStored(STORAGE_KEYS.ACTIVE_BIZ_ID, businessId);
  return getActiveBusiness();
}

export function createBusiness(data: Omit<Business, 'id' | 'created_at' | 'opt_in_slug' | 'is_demo'>): Business {
  const businesses = getBusinesses();
  const slugBase = data.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  const uniqueSlug = `${slugBase}-${Math.random().toString(36).substring(2, 6)}`;

  const newBiz: Business = {
    ...data,
    id: `biz_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    currency: 'NGN',
    timezone: data.timezone || 'Africa/Lagos',
    opt_in_slug: uniqueSlug,
    is_demo: false,
    created_at: new Date().toISOString(),
  };

  const updated = [...businesses, newBiz];
  setStored(STORAGE_KEYS.BUSINESSES, updated);
  setActiveBusiness(newBiz.id);
  return newBiz;
}

export function updateBusiness(id: string, updates: Partial<Business>): Business {
  const businesses = getBusinesses();
  const updated = businesses.map((b) => (b.id === id ? { ...b, ...updates, updated_at: new Date().toISOString() } : b));
  setStored(STORAGE_KEYS.BUSINESSES, updated);
  return updated.find((b) => b.id === id) || businesses[0];
}

export function getBusinessBySlug(slug: string): Business | undefined {
  const businesses = getBusinesses();
  return businesses.find((b) => b.opt_in_slug === slug);
}

// ----------------------------------------------------------------------------
// CUSTOMERS
// ----------------------------------------------------------------------------
export function getCustomers(businessId: string): Customer[] {
  initLocalStorage();
  const allCustomers = getStored<Customer[]>(STORAGE_KEYS.CUSTOMERS, INITIAL_CUSTOMERS);
  const allSales = getStored<SaleOrVisit[]>(STORAGE_KEYS.SALES, INITIAL_SALES);

  const bizCustomers = allCustomers.filter((c) => c.business_id === businessId);
  const bizSales = allSales.filter((s) => s.business_id === businessId);

  // Compute stats per customer
  return bizCustomers.map((cust) => {
    const custSales = bizSales
      .filter((s) => s.customer_id === cust.id)
      .sort((a, b) => new Date(b.visit_date).getTime() - new Date(a.visit_date).getTime());

    const totalSpent = custSales.reduce((acc, s) => acc + (Number(s.amount_ngn) || 0), 0);
    const lastVisit = custSales.length > 0 ? custSales[0].visit_date : undefined;

    return {
      ...cust,
      total_visits: custSales.length,
      total_spent_ngn: totalSpent,
      last_visit_date: lastVisit,
    };
  });
}

export function getCustomer(businessId: string, customerId: string): {
  customer: Customer | undefined;
  sales: SaleOrVisit[];
  consentRecords: CustomerConsentRecord[];
} {
  const customers = getCustomers(businessId);
  const customer = customers.find((c) => c.id === customerId);

  const allSales = getStored<SaleOrVisit[]>(STORAGE_KEYS.SALES, INITIAL_SALES);
  const sales = allSales
    .filter((s) => s.business_id === businessId && s.customer_id === customerId)
    .sort((a, b) => new Date(b.visit_date).getTime() - new Date(a.visit_date).getTime());

  const allConsents = getStored<CustomerConsentRecord[]>(STORAGE_KEYS.CONSENT_RECORDS, INITIAL_CONSENT_RECORDS);
  const consentRecords = allConsents
    .filter((cr) => cr.business_id === businessId && cr.customer_id === customerId)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return { customer, sales, consentRecords };
}

export function saveCustomer(
  businessId: string,
  data: {
    id?: string;
    full_name: string;
    phone: string;
    email?: string;
    tags?: string[];
    notes?: string;
    consent_status: ConsentStatus;
    consent_source?: ConsentSource;
    consent_notes?: string;
  }
): Customer {
  const allCustomers = getStored<Customer[]>(STORAGE_KEYS.CUSTOMERS, INITIAL_CUSTOMERS);
  const allConsents = getStored<CustomerConsentRecord[]>(STORAGE_KEYS.CONSENT_RECORDS, INITIAL_CONSENT_RECORDS);

  const isNew = !data.id;
  const custId = data.id || `cust_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString();

  let targetCustomer: Customer;

  if (isNew) {
    targetCustomer = {
      id: custId,
      business_id: businessId,
      full_name: data.full_name.trim(),
      phone: data.phone.trim(),
      email: data.email?.trim() || undefined,
      tags: data.tags || [],
      notes: data.notes?.trim() || undefined,
      consent_status: data.consent_status,
      consent_source: data.consent_source || (data.consent_status === 'consented' ? 'in_store_verbal' : 'manual_entry'),
      consent_date: data.consent_status === 'consented' ? now : undefined,
      created_at: now,
      updated_at: now,
    };
    allCustomers.push(targetCustomer);

    // Audit record for initial consent state
    allConsents.push({
      id: `cons_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      business_id: businessId,
      customer_id: custId,
      status: data.consent_status,
      source: targetCustomer.consent_source || 'manual_entry',
      notes: data.consent_notes || (data.consent_status === 'consented' ? 'Initial opt-in granted' : 'Created with unconfirmed consent'),
      created_at: now,
    });
  } else {
    const existingIndex = allCustomers.findIndex((c) => c.id === custId && c.business_id === businessId);
    if (existingIndex === -1) {
      throw new Error('Customer not found');
    }

    const prev = allCustomers[existingIndex];
    const consentChanged = prev.consent_status !== data.consent_status;

    targetCustomer = {
      ...prev,
      full_name: data.full_name.trim(),
      phone: data.phone.trim(),
      email: data.email?.trim() || undefined,
      tags: data.tags !== undefined ? data.tags : prev.tags,
      notes: data.notes !== undefined ? data.notes.trim() : prev.notes,
      consent_status: data.consent_status,
      consent_source: data.consent_source || prev.consent_source,
      consent_date: consentChanged && data.consent_status === 'consented' ? now : prev.consent_date,
      updated_at: now,
    };
    allCustomers[existingIndex] = targetCustomer;

    if (consentChanged) {
      allConsents.push({
        id: `cons_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        business_id: businessId,
        customer_id: custId,
        status: data.consent_status,
        source: data.consent_source || 'manual_edit',
        notes: data.consent_notes || `Status changed from ${prev.consent_status} to ${data.consent_status}`,
        created_at: now,
      });
    }
  }

  setStored(STORAGE_KEYS.CUSTOMERS, allCustomers);
  setStored(STORAGE_KEYS.CONSENT_RECORDS, allConsents);

  return targetCustomer;
}

export function deleteCustomer(businessId: string, customerId: string): void {
  const allCustomers = getStored<Customer[]>(STORAGE_KEYS.CUSTOMERS, INITIAL_CUSTOMERS);
  const allSales = getStored<SaleOrVisit[]>(STORAGE_KEYS.SALES, INITIAL_SALES);
  const allConsents = getStored<CustomerConsentRecord[]>(STORAGE_KEYS.CONSENT_RECORDS, INITIAL_CONSENT_RECORDS);

  setStored(
    STORAGE_KEYS.CUSTOMERS,
    allCustomers.filter((c) => !(c.id === customerId && c.business_id === businessId))
  );
  setStored(
    STORAGE_KEYS.SALES,
    allSales.filter((s) => !(s.customer_id === customerId && s.business_id === businessId))
  );
  setStored(
    STORAGE_KEYS.CONSENT_RECORDS,
    allConsents.filter((cr) => !(cr.customer_id === customerId && cr.business_id === businessId))
  );
}

// ----------------------------------------------------------------------------
// SALES / VISITS
// ----------------------------------------------------------------------------
export function getSales(businessId: string): SaleOrVisit[] {
  initLocalStorage();
  const allSales = getStored<SaleOrVisit[]>(STORAGE_KEYS.SALES, INITIAL_SALES);
  return allSales
    .filter((s) => s.business_id === businessId)
    .sort((a, b) => new Date(b.visit_date).getTime() - new Date(a.visit_date).getTime());
}

export function recordSale(
  businessId: string,
  params: {
    customer_id?: string;
    new_customer_name?: string;
    new_customer_phone?: string;
    amount_ngn: number;
    visit_date: string;
    service_or_product?: string;
    notes?: string;
    grant_marketing_consent?: boolean;
  }
): SaleOrVisit {
  let customerId = params.customer_id;
  let customerName = '';
  let customerPhone = '';

  const allCustomers = getCustomers(businessId);

  if (!customerId) {
    if (!params.new_customer_name || !params.new_customer_phone) {
      throw new Error('Please select an existing customer or enter both a name and phone number');
    }

    const consentStatus: ConsentStatus = params.grant_marketing_consent ? 'consented' : 'unconfirmed';
    const newCust = saveCustomer(businessId, {
      full_name: params.new_customer_name,
      phone: params.new_customer_phone,
      consent_status: consentStatus,
      consent_source: params.grant_marketing_consent ? 'in_store_verbal' : 'manual_entry',
      consent_notes: params.grant_marketing_consent
        ? 'Customer consented verbally during checkout sale record'
        : 'Visit recorded without marketing consent',
    });
    customerId = newCust.id;
    customerName = newCust.full_name;
    customerPhone = newCust.phone;
  } else {
    const existing = allCustomers.find((c) => c.id === customerId);
    customerName = existing?.full_name || 'Customer';
    customerPhone = existing?.phone || '';
  }

  const allSales = getStored<SaleOrVisit[]>(STORAGE_KEYS.SALES, INITIAL_SALES);
  const newSale: SaleOrVisit = {
    id: `sale_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    business_id: businessId,
    customer_id: customerId,
    customer_name: customerName,
    customer_phone: customerPhone,
    amount_ngn: Math.max(0, Number(params.amount_ngn) || 0),
    visit_date: params.visit_date || new Date().toISOString().split('T')[0],
    service_or_product: params.service_or_product?.trim() || undefined,
    notes: params.notes?.trim() || undefined,
    is_manual_entry: true,
    created_at: new Date().toISOString(),
  };

  allSales.unshift(newSale);
  setStored(STORAGE_KEYS.SALES, allSales);
  return newSale;
}

export function updateSale(saleId: string, updates: Partial<SaleOrVisit>): SaleOrVisit {
  const allSales = getStored<SaleOrVisit[]>(STORAGE_KEYS.SALES, INITIAL_SALES);
  const index = allSales.findIndex((s) => s.id === saleId);
  if (index === -1) throw new Error('Sale record not found');

  allSales[index] = {
    ...allSales[index],
    ...updates,
    amount_ngn: updates.amount_ngn !== undefined ? Number(updates.amount_ngn) : allSales[index].amount_ngn,
  };
  setStored(STORAGE_KEYS.SALES, allSales);
  return allSales[index];
}

export function deleteSale(saleId: string): void {
  const allSales = getStored<SaleOrVisit[]>(STORAGE_KEYS.SALES, INITIAL_SALES);
  setStored(
    STORAGE_KEYS.SALES,
    allSales.filter((s) => s.id !== saleId)
  );
}

// ----------------------------------------------------------------------------
// CUSTOMER SEGMENTS
// ----------------------------------------------------------------------------
export function getSegments(businessId: string): CustomerSegment[] {
  const customers = getCustomers(businessId);
  const now = new Date();

  function daysSince(dateStr?: string): number | null {
    if (!dateStr) return null;
    const diffMs = now.getTime() - new Date(dateStr).getTime();
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  }

  // 1. All Customers
  const all = customers;
  // 2. Consented Only
  const consentedOnly = customers.filter((c) => c.consent_status === 'consented');
  // 3. Recently Active (visited in last 30 days)
  const recent30 = customers.filter((c) => {
    const days = daysSince(c.last_visit_date);
    return days !== null && days <= 30;
  });
  // 4. Inactive 30+ days (had a visit, but none in last 30 days)
  const inactive30 = customers.filter((c) => {
    const days = daysSince(c.last_visit_date);
    return days !== null && days > 30;
  });
  // 5. Frequent (3+ visits)
  const frequent3Plus = customers.filter((c) => (c.total_visits || 0) >= 3);
  // 6. No purchase recorded yet
  const noPurchases = customers.filter((c) => (c.total_visits || 0) === 0);

  return [
    {
      id: 'all_customers',
      name: 'All Customers',
      description: 'Every customer profile recorded in your system.',
      rule_type: 'all',
      customer_count: all.length,
      consented_count: all.filter((c) => c.consent_status === 'consented').length,
    },
    {
      id: 'consented_only',
      name: 'All Consented Contacts',
      description: 'Customers with verified consent to receive messages.',
      rule_type: 'consented_only',
      customer_count: consentedOnly.length,
      consented_count: consentedOnly.length,
    },
    {
      id: 'recent_active',
      name: 'Recently Active (Last 30 Days)',
      description: 'Customers who visited or made a purchase within the last 30 days.',
      rule_type: 'recent_active',
      days_threshold: 30,
      customer_count: recent30.length,
      consented_count: recent30.filter((c) => c.consent_status === 'consented').length,
    },
    {
      id: 'inactive_30d',
      name: 'Lapsed Customers (30+ Days Away)',
      description: 'Past visitors who have not returned in 30 days or more. Ideal for re-engagement.',
      rule_type: 'inactive_days',
      days_threshold: 30,
      customer_count: inactive30.length,
      consented_count: inactive30.filter((c) => c.consent_status === 'consented').length,
    },
    {
      id: 'frequent_visitors',
      name: 'Frequent Customers (3+ Visits)',
      description: 'High-loyalty customers with 3 or more recorded visits.',
      rule_type: 'frequent_visitors',
      min_visits: 3,
      customer_count: frequent3Plus.length,
      consented_count: frequent3Plus.filter((c) => c.consent_status === 'consented').length,
    },
    {
      id: 'no_purchases',
      name: 'Registered, No Visit Yet',
      description: 'Contacts who registered via QR or link but have zero recorded visits.',
      rule_type: 'no_purchases',
      customer_count: noPurchases.length,
      consented_count: noPurchases.filter((c) => c.consent_status === 'consented').length,
    },
  ];
}

// ----------------------------------------------------------------------------
// CAMPAIGNS & AUDIT PREVIEWS
// ----------------------------------------------------------------------------
export function getCampaignDrafts(businessId: string): CampaignDraft[] {
  initLocalStorage();
  const allCampaigns = getStored<CampaignDraft[]>(STORAGE_KEYS.CAMPAIGNS, INITIAL_CAMPAIGNS);
  return allCampaigns
    .filter((c) => c.business_id === businessId)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export function saveCampaignDraft(
  businessId: string,
  data: {
    id?: string;
    title: string;
    message_template: string;
    target_segment_id: string;
  }
): CampaignDraft {
  const allCampaigns = getStored<CampaignDraft[]>(STORAGE_KEYS.CAMPAIGNS, INITIAL_CAMPAIGNS);
  const now = new Date().toISOString();

  if (data.id) {
    const idx = allCampaigns.findIndex((c) => c.id === data.id && c.business_id === businessId);
    if (idx !== -1) {
      allCampaigns[idx] = {
        ...allCampaigns[idx],
        title: data.title.trim(),
        message_template: data.message_template.trim(),
        target_segment_id: data.target_segment_id,
        updated_at: now,
      };
      setStored(STORAGE_KEYS.CAMPAIGNS, allCampaigns);
      return allCampaigns[idx];
    }
  }

  const newDraft: CampaignDraft = {
    id: `camp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    business_id: businessId,
    title: data.title.trim(),
    message_template: data.message_template.trim(),
    target_segment_id: data.target_segment_id,
    status: 'draft',
    created_at: now,
  };

  allCampaigns.unshift(newDraft);
  setStored(STORAGE_KEYS.CAMPAIGNS, allCampaigns);
  return newDraft;
}

export function getEligibleRecipients(
  businessId: string,
  segmentId: string,
  messageTemplate: string
): {
  eligible: CampaignPreviewItem[];
  excluded: CampaignPreviewItem[];
  segmentName: string;
} {
  const business = getActiveBusiness();
  const customers = getCustomers(businessId);
  const now = new Date();

  function daysSince(dateStr?: string): number | null {
    if (!dateStr) return null;
    const diffMs = now.getTime() - new Date(dateStr).getTime();
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  }

  // Filter by segment rule first
  let candidates: Customer[] = [];
  let segmentName = 'Selected Segment';

  switch (segmentId) {
    case 'all_customers':
      candidates = customers;
      segmentName = 'All Customers';
      break;
    case 'consented_only':
      candidates = customers.filter((c) => c.consent_status === 'consented');
      segmentName = 'All Consented Contacts';
      break;
    case 'recent_active':
      candidates = customers.filter((c) => {
        const days = daysSince(c.last_visit_date);
        return days !== null && days <= 30;
      });
      segmentName = 'Recently Active (Last 30 Days)';
      break;
    case 'inactive_30d':
      candidates = customers.filter((c) => {
        const days = daysSince(c.last_visit_date);
        return days !== null && days > 30;
      });
      segmentName = 'Lapsed Customers (30+ Days Away)';
      break;
    case 'frequent_visitors':
      candidates = customers.filter((c) => (c.total_visits || 0) >= 3);
      segmentName = 'Frequent Customers (3+ Visits)';
      break;
    case 'no_purchases':
      candidates = customers.filter((c) => (c.total_visits || 0) === 0);
      segmentName = 'Registered, No Visit Yet';
      break;
    default:
      candidates = customers;
  }

  const eligible: CampaignPreviewItem[] = [];
  const excluded: CampaignPreviewItem[] = [];

  for (const c of candidates) {
    const firstName = c.full_name.split(' ')[0] || c.full_name;
    const personalized = messageTemplate
      .replace(/\{\{\s*name\s*\}\}/gi, firstName)
      .replace(/\{\{\s*business_name\s*\}\}/gi, business.name);

    if (c.consent_status === 'consented') {
      eligible.push({
        customer_id: c.id,
        customer_name: c.full_name,
        phone: c.phone,
        personalized_text: personalized,
        consent_status: 'consented',
        is_eligible: true,
      });
    } else {
      const reason =
        c.consent_status === 'opted_out'
          ? 'Customer explicitly opted out of marketing'
          : 'Consent unconfirmed — no marketing permission on file';
      excluded.push({
        customer_id: c.id,
        customer_name: c.full_name,
        phone: c.phone,
        personalized_text: personalized,
        consent_status: c.consent_status,
        is_eligible: false,
        reason_excluded: reason,
      });
    }
  }

  return { eligible, excluded, segmentName };
}

// ----------------------------------------------------------------------------
// CSV IMPORT
// ----------------------------------------------------------------------------
export function importCustomersFromCsv(
  businessId: string,
  rows: Array<{
    name: string;
    phone: string;
    email?: string;
    tags?: string;
    notes?: string;
    consent?: string;
  }>
): {
  importedCount: number;
  updatedCount: number;
  skippedCount: number;
  errors: string[];
} {
  const allCustomers = getStored<Customer[]>(STORAGE_KEYS.CUSTOMERS, INITIAL_CUSTOMERS);
  const allConsents = getStored<CustomerConsentRecord[]>(STORAGE_KEYS.CONSENT_RECORDS, INITIAL_CONSENT_RECORDS);
  const now = new Date().toISOString();

  let importedCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;
  const errors: string[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 1;

    if (!row.name || !row.name.trim()) {
      errors.push(`Row ${rowNum}: Name is empty`);
      skippedCount++;
      continue;
    }

    if (!row.phone || !row.phone.trim()) {
      errors.push(`Row ${rowNum}: Phone number is empty`);
      skippedCount++;
      continue;
    }

    const cleanPhone = row.phone.trim();
    const cleanName = row.name.trim();

    // Parse consent from CSV cell safely:
    // Only 'yes', 'true', 'consented', 'agree' mark consent.
    // Everything else defaults to 'unconfirmed'.
    const consentVal = (row.consent || '').trim().toLowerCase();
    let status: ConsentStatus = 'unconfirmed';
    if (['yes', 'true', 'consented', 'agreed', '1'].includes(consentVal)) {
      status = 'consented';
    } else if (['opted_out', 'no', 'stop', 'unsubscribe'].includes(consentVal)) {
      status = 'opted_out';
    }

    const tags = row.tags
      ? row.tags
          .split(/[,;|]/)
          .map((t) => t.trim())
          .filter(Boolean)
      : [];

    // Duplicate check by phone for this business
    const existingIndex = allCustomers.findIndex(
      (c) => c.business_id === businessId && c.phone.replace(/[\s-]/g, '') === cleanPhone.replace(/[\s-]/g, '')
    );

    if (existingIndex !== -1) {
      // Update existing record
      const prev = allCustomers[existingIndex];
      allCustomers[existingIndex] = {
        ...prev,
        full_name: cleanName,
        email: row.email?.trim() || prev.email,
        tags: Array.from(new Set([...prev.tags, ...tags])),
        notes: row.notes?.trim() || prev.notes,
        updated_at: now,
      };
      updatedCount++;
    } else {
      // Insert new
      const newId = `cust_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      allCustomers.push({
        id: newId,
        business_id: businessId,
        full_name: cleanName,
        phone: cleanPhone,
        email: row.email?.trim() || undefined,
        tags,
        notes: row.notes?.trim() || undefined,
        consent_status: status,
        consent_source: 'csv_import',
        consent_date: status === 'consented' ? now : undefined,
        created_at: now,
        updated_at: now,
      });

      allConsents.push({
        id: `cons_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        business_id: businessId,
        customer_id: newId,
        status,
        source: 'csv_import',
        notes: `Imported via CSV. Consent marked as ${status}.`,
        created_at: now,
      });

      importedCount++;
    }
  }

  setStored(STORAGE_KEYS.CUSTOMERS, allCustomers);
  setStored(STORAGE_KEYS.CONSENT_RECORDS, allConsents);

  return { importedCount, updatedCount, skippedCount, errors };
}

// ----------------------------------------------------------------------------
// PUBLIC CUSTOMER OPT-IN (QR / LINK)
// ----------------------------------------------------------------------------
export function registerCustomerOptIn(
  slug: string,
  data: {
    full_name: string;
    phone: string;
    email?: string;
    agreed_to_marketing: boolean;
  }
): { success: boolean; message: string; customerId?: string } {
  const business = getBusinessBySlug(slug);
  if (!business) {
    return { success: false, message: 'Business not found. Please check the link or QR code.' };
  }

  if (!data.agreed_to_marketing) {
    return {
      success: false,
      message: 'You must check the consent box to receive updates and exclusive offers.',
    };
  }

  const allCustomers = getStored<Customer[]>(STORAGE_KEYS.CUSTOMERS, INITIAL_CUSTOMERS);
  const allConsents = getStored<CustomerConsentRecord[]>(STORAGE_KEYS.CONSENT_RECORDS, INITIAL_CONSENT_RECORDS);
  const now = new Date().toISOString();

  const cleanPhone = data.phone.trim();
  const cleanName = data.full_name.trim();

  // Find if already exists
  const existingIdx = allCustomers.findIndex(
    (c) => c.business_id === business.id && c.phone.replace(/[\s-]/g, '') === cleanPhone.replace(/[\s-]/g, '')
  );

  let custId: string;

  if (existingIdx !== -1) {
    custId = allCustomers[existingIdx].id;
    allCustomers[existingIdx] = {
      ...allCustomers[existingIdx],
      full_name: cleanName,
      email: data.email?.trim() || allCustomers[existingIdx].email,
      consent_status: 'consented',
      consent_source: 'qr_optin',
      consent_date: now,
      updated_at: now,
    };
  } else {
    custId = `cust_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    allCustomers.push({
      id: custId,
      business_id: business.id,
      full_name: cleanName,
      phone: cleanPhone,
      email: data.email?.trim() || undefined,
      tags: ['Self-Registered', 'Opt-In'],
      notes: 'Customer signed up via QR code or public link.',
      consent_status: 'consented',
      consent_source: 'qr_optin',
      consent_date: now,
      created_at: now,
      updated_at: now,
    });
  }

  allConsents.push({
    id: `cons_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    business_id: business.id,
    customer_id: custId,
    status: 'consented',
    source: 'qr_optin',
    notes: `Customer signed up directly on web form/QR with explicit checkbox checked.`,
    created_at: now,
  });

  setStored(STORAGE_KEYS.CUSTOMERS, allCustomers);
  setStored(STORAGE_KEYS.CONSENT_RECORDS, allConsents);

  return { success: true, message: `Thank you, ${cleanName}! You're registered with ${business.name}.`, customerId: custId };
}

// ----------------------------------------------------------------------------
// DEMO RESET & CLEAR
// ----------------------------------------------------------------------------
export function resetDemoData(): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.BUSINESSES, JSON.stringify(INITIAL_BUSINESSES));
  localStorage.setItem(STORAGE_KEYS.ACTIVE_BIZ_ID, JSON.stringify(INITIAL_BUSINESSES[0].id));
  localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(INITIAL_CUSTOMERS));
  localStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify(INITIAL_SALES));
  localStorage.setItem(STORAGE_KEYS.CONSENT_RECORDS, JSON.stringify(INITIAL_CONSENT_RECORDS));
  localStorage.setItem(STORAGE_KEYS.CAMPAIGNS, JSON.stringify(INITIAL_CAMPAIGNS));
}

export function clearBusinessData(businessId: string): void {
  const allCustomers = getStored<Customer[]>(STORAGE_KEYS.CUSTOMERS, INITIAL_CUSTOMERS);
  const allSales = getStored<SaleOrVisit[]>(STORAGE_KEYS.SALES, INITIAL_SALES);
  const allConsents = getStored<CustomerConsentRecord[]>(STORAGE_KEYS.CONSENT_RECORDS, INITIAL_CONSENT_RECORDS);
  const allCampaigns = getStored<CampaignDraft[]>(STORAGE_KEYS.CAMPAIGNS, INITIAL_CAMPAIGNS);

  setStored(
    STORAGE_KEYS.CUSTOMERS,
    allCustomers.filter((c) => c.business_id !== businessId)
  );
  setStored(
    STORAGE_KEYS.SALES,
    allSales.filter((s) => s.business_id !== businessId)
  );
  setStored(
    STORAGE_KEYS.CONSENT_RECORDS,
    allConsents.filter((cr) => cr.business_id !== businessId)
  );
  setStored(
    STORAGE_KEYS.CAMPAIGNS,
    allCampaigns.filter((camp) => camp.business_id !== businessId)
  );
}

// ----------------------------------------------------------------------------
// ONBOARDING PROGRESS
// ----------------------------------------------------------------------------
export function getOnboardingState(businessId: string): OnboardingState {
  const business = getActiveBusiness();
  const customers = getCustomers(businessId);
  const sales = getSales(businessId);
  const campaigns = getCampaignDrafts(businessId);

  return {
    has_created_profile: Boolean(business.name && business.business_type),
    has_added_customer: customers.length > 0,
    has_recorded_sale: sales.length > 0,
    has_viewed_qr: true, // always accessible
    has_drafted_campaign: campaigns.length > 0,
  };
}
