export type BusinessType =
  | 'barber'
  | 'salon'
  | 'laundry'
  | 'car_wash'
  | 'boutique'
  | 'spa_wellness'
  | 'pharmacy'
  | 'clinic'
  | 'other';

export type ConsentStatus = 'consented' | 'unconfirmed' | 'opted_out';

export type ConsentSource =
  | 'qr_optin'
  | 'in_store_verbal'
  | 'web_link'
  | 'csv_import'
  | 'manual_entry'
  | 'manual_edit';

export type WhatsAppRoutingMode = 'agency_concierge' | 'store_direct';

export interface Business {
  id: string;
  name: string;
  business_type: BusinessType;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  currency: string;
  timezone: string;
  logo_url?: string;
  opt_in_slug: string;
  is_demo: boolean;
  created_at: string;
  updated_at?: string;
  // WhatsApp Multi-Client Gateway Routing Configuration
  whatsapp_routing_mode?: WhatsAppRoutingMode;
  manager_alert_phone?: string;
  concierge_phone?: string;
}

export interface Customer {
  id: string;
  business_id: string;
  full_name: string;
  phone: string;
  email?: string;
  tags: string[];
  notes?: string;
  address?: string;
  consent_status: ConsentStatus;
  consent_source?: ConsentSource;
  consent_date?: string;
  created_at: string;
  updated_at?: string;
  // Computed / Joined statistics
  total_visits?: number;
  total_spent_ngn?: number;
  last_visit_date?: string;
}

export interface CustomerConsentRecord {
  id: string;
  business_id: string;
  customer_id: string;
  status: ConsentStatus;
  source: ConsentSource;
  notes?: string;
  created_at: string;
}

export interface SaleOrVisit {
  id: string;
  business_id: string;
  customer_id: string;
  customer_name?: string;
  customer_phone?: string;
  amount_ngn: number;
  visit_date: string; // YYYY-MM-DD
  service_or_product?: string;
  notes?: string;
  is_manual_entry: boolean;
  created_at: string;
}

export interface CustomerSegment {
  id: string;
  name: string;
  description: string;
  rule_type:
    | 'all'
    | 'consented_only'
    | 'recent_active'
    | 'inactive_days'
    | 'frequent_visitors'
    | 'no_purchases';
  days_threshold?: number;
  min_visits?: number;
  customer_count: number;
  consented_count: number;
}

export interface CampaignDraft {
  id: string;
  business_id: string;
  title: string;
  message_template: string;
  target_segment_id: string;
  status: 'draft' | 'simulated_sent';
  created_at: string;
  updated_at?: string;
}

export interface CampaignPreviewItem {
  customer_id: string;
  customer_name: string;
  phone: string;
  personalized_text: string;
  consent_status: ConsentStatus;
  is_eligible: boolean;
  reason_excluded?: string;
}

export interface OnboardingState {
  has_created_profile: boolean;
  has_added_customer: boolean;
  has_recorded_sale: boolean;
  has_viewed_qr: boolean;
  has_drafted_campaign: boolean;
}
