// ==========================================
// CARDFLOW AI - ENTERPRISE DOMAIN TYPES
// ==========================================

export type NavigationTab =
  | 'dashboard'
  | 'scanner'
  | 'contacts'
  | 'leads'
  | 'integrations'
  | 'settings';

export type Language = 'en' | 'hi' | 'te';

export interface User {
  id: number;
  organization_id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  role: string;
  role_ids: string[];
  is_active: boolean;
  is_verified?: boolean;
  created_at: string;
  permissions?: string[];
}

export interface Organization {
  id: number;
  name: string;
  email: string;
  industry?: string;
  timezone?: string;
  plan: 'starter' | 'pro' | 'enterprise';
  created_at: string;
}

export interface Role {
  id: string;
  organization_id: number;
  name: string;
  description: string;
  permissions: string[];
}

export interface Contact {
  id: string;
  organization_id: number;
  name: string;
  company_name: string;
  designation: string;
  mobile_numbers: string[];
  email_addresses: string[];
  website: string;
  address: string;
  linkedin: string;
  other_details: string;
  source: 'CARD_SCAN' | 'MANUAL' | 'AI_RECEPTIONIST' | 'IMPORT';
  tags: string[];
  sync_to_sheets?: boolean;
  synced_to_sheets: boolean;
  synced_account_email?: string;
  synced_sheet_id?: string;
  synced_sheet_title?: string;
  synced_at?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface VisitingCardScanResult {
  name: string;
  company_name: string;
  designation: string;
  mobile_numbers: string[];
  email_addresses: string[];
  website: string;
  address: string;
  linkedin: string;
  other_details: string;
  execution_time_ms?: number;
}

export type LeadStage = 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'PROPOSAL' | 'WON' | 'LOST';
export type LeadPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type LeadSource = 'CARD_SCAN' | 'AI_RECEPTIONIST' | 'INBOUND_WEB' | 'REFERRAL';

export interface Lead {
  id: string;
  organization_id: number;
  contact_id?: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  status: LeadStage;
  deal_value: number;
  priority: LeadPriority;
  source: LeadSource;
  assigned_to_user_id?: number;
  notes: string;
  summary?: string;
  created_at: string;
  updated_at: string;
}

export interface AgentBusinessHours {
  enabled: boolean;
  timezone: string;
  start_time: string;
  end_time: string;
  work_days: string[];
}

export interface Agent {
  id: string;
  organization_id: number;
  name: string;
  public_slug: string;
  title: string;
  avatar_url?: string;
  welcome_message: string;
  system_instructions: string;
  tone: 'professional' | 'friendly' | 'concise' | 'consultative';
  language: string;
  business_hours: AgentBusinessHours;
  lead_capture_enabled: boolean;
  lead_capture_fields: string[];
  knowledge_base_ids: string[];
  is_published: boolean;
  total_conversations: number;
  total_leads_captured: number;
  created_at: string;
  updated_at: string;
}

export interface KnowledgeBase {
  id: string;
  organization_id: number;
  name: string;
  description: string;
  document_count: number;
  created_at: string;
}

export interface KnowledgeDocument {
  id: string;
  organization_id: number;
  knowledge_base_id: string;
  title: string;
  content: string;
  category: 'faq' | 'product' | 'pricing' | 'policy' | 'custom' | 'Products' | 'Pricing' | 'Services' | 'FAQ' | 'Company Policy' | string;
  status: 'READY' | 'PROCESSING' | 'FAILED';
  chunk_count: number;
  word_count: number;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  lead_extracted?: {
    name?: string;
    email?: string;
    phone?: string;
    company?: string;
    intent?: string;
    budget?: number;
  };
}

export interface Conversation {
  id: string;
  organization_id: number;
  agent_id: string;
  visitor_name: string;
  visitor_email?: string;
  visitor_phone?: string;
  channel: 'web_widget' | 'dashboard_test' | 'phone_demo';
  status: 'active' | 'resolved' | 'lead_captured';
  messages: ChatMessage[];
  lead_id?: string;
  created_at: string;
  updated_at: string;
}

export interface GoogleSheetsConfig {
  organization_id: number;
  connected: boolean;
  spreadsheet_id: string;
  spreadsheet_name: string;
  target_sheet_name: string;
  auto_sync: boolean;
  last_synced_at?: string;
  total_rows_synced: number;
  service_account_email: string;
}

export interface SyncLog {
  id: string;
  organization_id: number;
  timestamp: string;
  records_count: number;
  status: 'SUCCESS' | 'WARNING' | 'FAILED';
  details: string;
}

export interface AnalyticsStats {
  kpis: {
    total_contacts: number;
    total_leads: number;
    pipeline_value: number;
    won_value: number;
    active_agents: number;
    total_conversations: number;
    google_sheets_synced: number;
    lead_conversion_rate: number;
  };
  leadsByStatus: Record<LeadStage, number>;
  contactsBySource: Record<string, number>;
  recentContacts: Contact[];
  recentLeads: Lead[];
  recentConversations: Conversation[];
}

// ==========================================
// LEGACY WORKSPACE COMPATIBILITY TYPES
// ==========================================
export type Priority = 'low' | 'medium' | 'high' | 'urgent';

export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

export interface LegacyTagObject {
  id: string;
  name: string;
  color?: string;
  bgColor?: string;
}

export type Tag = any;

export interface FlowCard {
  id: string;
  title: string;
  description?: string;
  columnId: string;
  priority: Priority;
  tags: any[];
  assignee?: string;
  dueDate?: string;
  checklist?: ChecklistItem[];
  createdAt: string;
  updatedAt?: string;
  order?: number;
  [key: string]: any;
}

export interface FlowColumn {
  id: string;
  title: string;
  color: string;
  wipLimit?: number;
  order?: number;
  [key: string]: any;
}

export interface FilterOptions {
  search?: string;
  searchQuery?: string;
  priority?: Priority | 'all';
  tag?: string;
  tagId?: string | 'all';
  assignee?: string | 'all';
  [key: string]: any;
}

