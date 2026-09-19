/**
 * CardFlow AI Multi-Tenant Data Store
 * Provides organization-isolated persistence for Organizations, Users, Roles,
 * Contacts, Leads, AI Agents, Knowledge Base, Conversations, and Google Sheets Sync.
 */

export interface Permission {
  id: string;
  name: string;
  description: string;
}

export interface Role {
  id: string;
  organization_id: number;
  name: string;
  description: string;
  permissions: string[];
}

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
  is_verified: boolean;
  created_at: string;
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
  synced_to_sheets: boolean;
  synced_account_email?: string;
  synced_sheet_id?: string;
  synced_sheet_title?: string;
  synced_at?: string;
  card_front_preview?: string;
  card_back_preview?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Lead {
  id: string;
  organization_id: number;
  contact_id?: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  status: 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'PROPOSAL' | 'WON' | 'LOST';
  deal_value: number;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  source: 'CARD_SCAN' | 'AI_RECEPTIONIST' | 'INBOUND_WEB' | 'REFERRAL';
  assigned_to_user_id?: number;
  notes: string;
  summary?: string;
  created_at: string;
  updated_at: string;
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
  business_hours: {
    enabled: boolean;
    timezone: string;
    start_time: string;
    end_time: string;
    work_days: string[];
  };
  lead_capture_enabled: boolean;
  lead_capture_fields: string[];
  knowledge_base_ids: string[];
  is_published: boolean;
  total_conversations: number;
  total_leads_captured: number;
  created_at: string;
  updated_at: string;
}

export interface KnowledgeDocument {
  id: string;
  organization_id: number;
  knowledge_base_id: string;
  title: string;
  content: string;
  category: 'faq' | 'product' | 'pricing' | 'policy' | 'custom';
  status: 'READY' | 'PROCESSING' | 'FAILED';
  chunk_count: number;
  word_count: number;
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

// Canonical Permissions
export const CANONICAL_PERMISSIONS: Permission[] = [
  { id: 'user:create', name: 'user:create', description: 'Create organization users.' },
  { id: 'user:read', name: 'user:read', description: 'Read organization users.' },
  { id: 'user:update', name: 'user:update', description: 'Update organization users.' },
  { id: 'user:delete', name: 'user:delete', description: 'Delete organization users.' },
  { id: 'role:create', name: 'role:create', description: 'Create organization roles.' },
  { id: 'role:read', name: 'role:read', description: 'Read organization roles.' },
  { id: 'role:update', name: 'role:update', description: 'Update organization roles.' },
  { id: 'role:delete', name: 'role:delete', description: 'Delete organization roles.' },
  { id: 'organization:read', name: 'organization:read', description: 'Read organization settings.' },
  { id: 'organization:update', name: 'organization:update', description: 'Update organization settings.' },
  { id: 'agent:create', name: 'agent:create', description: 'Create AI agents.' },
  { id: 'agent:read', name: 'agent:read', description: 'Read AI agents.' },
  { id: 'agent:update', name: 'agent:update', description: 'Update and publish AI agents.' },
  { id: 'agent:delete', name: 'agent:delete', description: 'Delete AI agents.' },
  { id: 'lead:create', name: 'lead:create', description: 'Create leads.' },
  { id: 'lead:read', name: 'lead:read', description: 'Read leads.' },
  { id: 'lead:update', name: 'lead:update', description: 'Update leads.' },
  { id: 'lead:delete', name: 'lead:delete', description: 'Delete leads.' },
  { id: 'contact:create', name: 'contact:create', description: 'Create contacts.' },
  { id: 'contact:read', name: 'contact:read', description: 'Read contacts.' },
  { id: 'contact:update', name: 'contact:update', description: 'Update contacts.' },
  { id: 'contact:delete', name: 'contact:delete', description: 'Delete contacts.' },
];

export const ADMIN_ROLE_NAME = 'organization_admin';

// In-Memory Multi-Tenant Store
class CardFlowDatabase {
  organizations: Organization[] = [
    {
      id: 1,
      name: 'CardFlow Enterprise Technologies',
      email: 'contact@cardflow.ai',
      industry: 'B2B Software & AI Automation',
      timezone: 'America/New_York',
      plan: 'enterprise',
      created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
    },
  ];

  roles: Role[] = [
    {
      id: 'role_admin_1',
      organization_id: 1,
      name: ADMIN_ROLE_NAME,
      description: 'Full administrative access within this organization.',
      permissions: CANONICAL_PERMISSIONS.map((p) => p.name),
    },
    {
      id: 'role_manager_1',
      organization_id: 1,
      name: 'sales_manager',
      description: 'Manage contacts, leads, and view AI receptionist metrics.',
      permissions: [
        'contact:create', 'contact:read', 'contact:update', 'contact:delete',
        'lead:create', 'lead:read', 'lead:update', 'lead:delete',
        'agent:read', 'organization:read', 'user:read'
      ],
    },
    {
      id: 'role_operator_1',
      organization_id: 1,
      name: 'agent_operator',
      description: 'Configure and monitor AI receptionist dialogues and knowledge bases.',
      permissions: ['agent:read', 'agent:update', 'lead:read', 'contact:read', 'organization:read'],
    },
  ];

  users: User[] = [
    {
      id: 1,
      organization_id: 1,
      first_name: 'Alex',
      last_name: 'Mercer',
      email: 'admin@cardflow.ai',
      phone: '+1 (555) 234-5678',
      role: ADMIN_ROLE_NAME,
      role_ids: ['role_admin_1'],
      is_active: true,
      is_verified: true,
      created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
    },
    {
      id: 2,
      organization_id: 1,
      first_name: 'Elena',
      last_name: 'Rostova',
      email: 'elena.rostova@cardflow.ai',
      phone: '+1 (555) 876-5432',
      role: 'sales_manager',
      role_ids: ['role_manager_1'],
      is_active: true,
      is_verified: true,
      created_at: new Date(Date.now() - 20 * 86400000).toISOString(),
    },
  ];

  contacts: Contact[] = [
    {
      id: 'cnt_101',
      organization_id: 1,
      name: 'Dr. Vikram Rao',
      company_name: 'Apex Digital Health Solutions',
      designation: 'Chief Technology Officer',
      mobile_numbers: ['+1 (415) 555-0192', '+91 98490 12345'],
      email_addresses: ['vikram.rao@apexdigital.io', 'vrao@healthtech.org'],
      website: 'https://apexdigital.io',
      address: 'Suite 400, 100 Innovation Way, Boston, MA 02110',
      linkedin: 'https://linkedin.com/in/vikram-rao-cto',
      other_details: 'Met at TechSparks Global Summit. Interested in enterprise AI receptionist with multilingual patient intake support.',
      source: 'CARD_SCAN',
      tags: ['Enterprise', 'Healthcare', 'High Value', 'Decision Maker'],
      synced_to_sheets: true,
      created_at: new Date(Date.now() - 3 * 86400000).toISOString(),
      updated_at: new Date(Date.now() - 3 * 86400000).toISOString(),
    },
    {
      id: 'cnt_102',
      organization_id: 1,
      name: 'Sarah Jenkins',
      company_name: 'Starlight Capital Partners',
      designation: 'Managing Partner',
      mobile_numbers: ['+1 (212) 555-4920'],
      email_addresses: ['sjenkins@starlightcap.com'],
      website: 'https://starlightcap.com',
      address: '745 Fifth Avenue, 22nd Floor, New York, NY 10151',
      linkedin: 'https://linkedin.com/in/sarahjenkins-vc',
      other_details: 'Specializes in Series A/B B2B SaaS investments. Requested demo of CardFlow business card OCR and CRM pipeline sync.',
      source: 'CARD_SCAN',
      tags: ['Investor', 'VIP', 'Venture Capital'],
      synced_to_sheets: true,
      created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
      updated_at: new Date(Date.now() - 5 * 86400000).toISOString(),
    },
    {
      id: 'cnt_103',
      organization_id: 1,
      name: 'Rajesh K. Varma',
      company_name: 'Varma Global Logistics Pvt Ltd',
      designation: 'Director of Global Operations',
      mobile_numbers: ['+91 94401 88990', '+1 (312) 555-8371'],
      email_addresses: ['rajesh.varma@varmalogistics.com'],
      website: 'https://varmalogistics.com',
      address: 'Hitech City Phase 2, Madhapur, Hyderabad, Telangana 500081',
      linkedin: 'https://linkedin.com/in/rajesh-varma-logistics',
      other_details: 'Card contained bilingual English & Telugu designations. Needs automated lead capture from warehouse visitors and transport partner queries.',
      source: 'CARD_SCAN',
      tags: ['Logistics', 'Operations', 'Global'],
      synced_to_sheets: true,
      created_at: new Date(Date.now() - 7 * 86400000).toISOString(),
      updated_at: new Date(Date.now() - 7 * 86400000).toISOString(),
    },
    {
      id: 'cnt_104',
      organization_id: 1,
      name: 'Chloe Dubois',
      company_name: 'Horizon Smart Mobility',
      designation: 'Head of Strategic Partnerships',
      mobile_numbers: ['+33 1 42 68 55 00', '+1 (415) 555-6623'],
      email_addresses: ['chloe.dubois@horizonmobility.fr'],
      website: 'https://horizonmobility.fr',
      address: '14 Rue de la Paix, 75002 Paris, France',
      linkedin: 'https://linkedin.com/in/chloedubois-mobility',
      other_details: 'Engaged through AI Receptionist web widget on pricing queries. Converted automatically to contact.',
      source: 'AI_RECEPTIONIST',
      tags: ['Automotive', 'Inbound', 'Europe'],
      synced_to_sheets: false,
      created_at: new Date(Date.now() - 1 * 86400000).toISOString(),
      updated_at: new Date(Date.now() - 1 * 86400000).toISOString(),
    },
  ];

  leads: Lead[] = [
    {
      id: 'lead_201',
      organization_id: 1,
      contact_id: 'cnt_101',
      name: 'Dr. Vikram Rao',
      company: 'Apex Digital Health Solutions',
      email: 'vikram.rao@apexdigital.io',
      phone: '+1 (415) 555-0192',
      status: 'QUALIFIED',
      deal_value: 36000,
      priority: 'HIGH',
      source: 'CARD_SCAN',
      assigned_to_user_id: 1,
      notes: 'Requires HIPAA-compliant CRM workflow and visiting card scanning for 12 regional clinic directors.',
      summary: 'High readiness, budget allocated for Q3 rollout.',
      created_at: new Date(Date.now() - 3 * 86400000).toISOString(),
      updated_at: new Date(Date.now() - 1 * 86400000).toISOString(),
    },
    {
      id: 'lead_202',
      organization_id: 1,
      contact_id: 'cnt_102',
      name: 'Sarah Jenkins',
      company: 'Starlight Capital Partners',
      email: 'sjenkins@starlightcap.com',
      phone: '+1 (212) 555-4920',
      status: 'PROPOSAL',
      deal_value: 50000,
      priority: 'URGENT',
      source: 'CARD_SCAN',
      assigned_to_user_id: 2,
      notes: 'Sent enterprise pitch deck and multi-seat commercial license tier proposal.',
      summary: 'Executive proposal delivered. Follow up scheduled for Friday.',
      created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
      updated_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    },
    {
      id: 'lead_203',
      organization_id: 1,
      contact_id: 'cnt_103',
      name: 'Rajesh K. Varma',
      company: 'Varma Global Logistics Pvt Ltd',
      email: 'rajesh.varma@varmalogistics.com',
      phone: '+91 94401 88990',
      status: 'CONTACTED',
      deal_value: 18000,
      priority: 'MEDIUM',
      source: 'CARD_SCAN',
      assigned_to_user_id: 1,
      notes: 'Initial discovery call held. Demonstrated Google Sheets live sync feature.',
      summary: 'Interested in automated contact extraction for on-field sales team.',
      created_at: new Date(Date.now() - 7 * 86400000).toISOString(),
      updated_at: new Date(Date.now() - 4 * 86400000).toISOString(),
    },
    {
      id: 'lead_204',
      organization_id: 1,
      contact_id: 'cnt_104',
      name: 'Chloe Dubois',
      company: 'Horizon Smart Mobility',
      email: 'chloe.dubois@horizonmobility.fr',
      phone: '+33 1 42 68 55 00',
      status: 'NEW',
      deal_value: 24000,
      priority: 'HIGH',
      source: 'AI_RECEPTIONIST',
      assigned_to_user_id: 2,
      notes: 'Captured by AI Receptionist (Aria) after asking about custom integration APIs.',
      summary: 'Inbound prospect qualified through chat questionnaire.',
      created_at: new Date(Date.now() - 1 * 86400000).toISOString(),
      updated_at: new Date(Date.now() - 1 * 86400000).toISOString(),
    },
    {
      id: 'lead_205',
      organization_id: 1,
      name: 'Marcus Sterling',
      company: 'Sterling Real Estate Group',
      email: 'msterling@sterlingre.com',
      phone: '+1 (310) 555-9201',
      status: 'WON',
      deal_value: 42000,
      priority: 'HIGH',
      source: 'CARD_SCAN',
      assigned_to_user_id: 1,
      notes: 'Closed annual enterprise subscription for 45 real estate agents using mobile card scanner.',
      summary: 'Contract signed. Onboarding scheduled.',
      created_at: new Date(Date.now() - 18 * 86400000).toISOString(),
      updated_at: new Date(Date.now() - 6 * 86400000).toISOString(),
    },
  ];

  agents: Agent[] = [
    {
      id: 'agent_301',
      organization_id: 1,
      name: 'Aria',
      public_slug: 'aria-receptionist',
      title: 'Senior Solutions Advisor & AI Receptionist',
      avatar_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
      welcome_message: "Hello! I'm Aria, your AI business receptionist at CardFlow Enterprise. How may I assist your business today?",
      system_instructions: `You are Aria, the intelligent corporate AI receptionist for CardFlow Enterprise.
Your goals:
1. Warmly greet every client and visitor.
2. Answer inquiries about CardFlow AI services, business card scanner, CRM features, Google Sheets integrations, and pricing based on the company knowledge base.
3. Automatically qualify prospects by gently asking for their Name, Company, Work Email, and specific business challenges.
4. When the visitor provides contact details, thank them and inform them that an account executive will reach out within 2 hours.
Keep your responses polite, authoritative, articulate, and succinct. Never hallucinate pricing or terms outside the knowledge base.`,
      tone: 'consultative',
      language: 'English (US & International)',
      business_hours: {
        enabled: true,
        timezone: 'America/New_York',
        start_time: '08:00',
        end_time: '19:00',
        work_days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      },
      lead_capture_enabled: true,
      lead_capture_fields: ['name', 'email', 'phone', 'company', 'budget'],
      knowledge_base_ids: ['kb_401'],
      is_published: true,
      total_conversations: 48,
      total_leads_captured: 19,
      created_at: new Date(Date.now() - 25 * 86400000).toISOString(),
      updated_at: new Date(Date.now() - 1 * 86400000).toISOString(),
    },
    {
      id: 'agent_302',
      organization_id: 1,
      name: 'Nexus Tech Desk',
      public_slug: 'nexus-support',
      title: 'Technical Integration & API Specialist',
      avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      welcome_message: 'Hi there! I am Nexus, your CardFlow integration assistant. Looking to connect Google Sheets, CRM webhooks, or API keys?',
      system_instructions: 'You are Nexus, specializing in technical documentation, REST API endpoints, webhook setup, and Google Workspace OAuth sync for CardFlow AI.',
      tone: 'professional',
      language: 'English',
      business_hours: {
        enabled: false,
        timezone: 'UTC',
        start_time: '00:00',
        end_time: '23:59',
        work_days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
      },
      lead_capture_enabled: true,
      lead_capture_fields: ['name', 'email', 'company'],
      knowledge_base_ids: ['kb_401'],
      is_published: true,
      total_conversations: 24,
      total_leads_captured: 8,
      created_at: new Date(Date.now() - 14 * 86400000).toISOString(),
      updated_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    },
  ];

  knowledgeBases: KnowledgeBase[] = [
    {
      id: 'kb_401',
      organization_id: 1,
      name: 'Corporate Services, Pricing & OCR Specifications',
      description: 'Comprehensive product documentation, subscription packages, and integration guidelines for AI Receptionists and CRM.',
      document_count: 3,
      created_at: new Date(Date.now() - 25 * 86400000).toISOString(),
    },
  ];

  documents: KnowledgeDocument[] = [
    {
      id: 'doc_501',
      organization_id: 1,
      knowledge_base_id: 'kb_401',
      title: 'CardFlow AI Core Product Capabilities & Specifications',
      content: `CardFlow AI is an all-in-one business contact management, AI card scanner, CRM, and automated AI receptionist platform.
Key Highlights:
- High-accuracy dual-sided visiting card scanner powered by Google Gemini Vision.
- Multilingual OCR support including English, Telugu, Spanish, Hindi, and European languages.
- Automatic extraction into structured CRM fields: Full Name, Company, Designation, Mobile Numbers, Emails, Website, Address, LinkedIn, and Notes.
- One-click Google Sheets bidirectional sync with deduplication algorithms.
- Full multi-tenant RBAC security architecture ensuring strict tenant data isolation.`,
      category: 'product',
      status: 'READY',
      chunk_count: 5,
      word_count: 85,
      created_at: new Date(Date.now() - 25 * 86400000).toISOString(),
      updated_at: new Date(Date.now() - 25 * 86400000).toISOString(),
    },
    {
      id: 'doc_502',
      organization_id: 1,
      knowledge_base_id: 'kb_401',
      title: 'Enterprise Subscription Tiers & Pricing Schedule 2026',
      content: `Subscription Plans:
1. Starter Plan: $49/month. Includes 1 AI Receptionist, 250 business card scans/month, Google Sheets sync, and single-seat CRM access.
2. Professional Plan: $149/month. Includes 5 AI Receptionists, 1,500 card scans/month, custom knowledge base uploads, priority Gemini model execution, and up to 10 team seats with RBAC.
3. Enterprise Plan: $499/month. Unlimited AI receptionists, unlimited card scans, dedicated Google Sheets sync pipeline, 24/7 SLA, and custom domain widget deployment.`,
      category: 'pricing',
      status: 'READY',
      chunk_count: 4,
      word_count: 75,
      created_at: new Date(Date.now() - 20 * 86400000).toISOString(),
      updated_at: new Date(Date.now() - 20 * 86400000).toISOString(),
    },
    {
      id: 'doc_503',
      organization_id: 1,
      knowledge_base_id: 'kb_401',
      title: 'Google Sheets Integration & Data Governance Policy',
      content: `Google Sheets Sync Specs:
- Uses Google Sheets REST API to append and update CRM records.
- Fields mapped: Contact ID, Full Name, Organization, Role, Primary Phone, Secondary Phone, Email 1, Email 2, Web Address, Physical Address, LinkedIn Profile, Captured Source, Date Created.
- Built-in deduplication matches against email and standardized phone number hashes.`,
      category: 'policy',
      status: 'READY',
      chunk_count: 3,
      word_count: 55,
      created_at: new Date(Date.now() - 15 * 86400000).toISOString(),
      updated_at: new Date(Date.now() - 15 * 86400000).toISOString(),
    },
  ];

  conversations: Conversation[] = [
    {
      id: 'conv_601',
      organization_id: 1,
      agent_id: 'agent_301',
      visitor_name: 'Chloe Dubois',
      visitor_email: 'chloe.dubois@horizonmobility.fr',
      visitor_phone: '+33 1 42 68 55 00',
      channel: 'web_widget',
      status: 'lead_captured',
      lead_id: 'lead_204',
      created_at: new Date(Date.now() - 1 * 86400000).toISOString(),
      updated_at: new Date(Date.now() - 1 * 86400000).toISOString(),
      messages: [
        {
          id: 'msg_1',
          role: 'assistant',
          content: "Hello! I'm Aria, your AI business receptionist at CardFlow Enterprise. How may I assist your business today?",
          timestamp: new Date(Date.now() - 1 * 86400000).toISOString(),
        },
        {
          id: 'msg_2',
          role: 'user',
          content: 'Hi Aria, we have 30 sales representatives in France and Germany who attend trade shows weekly. Can CardFlow scan both European cards and sync directly into our company Google Sheets?',
          timestamp: new Date(Date.now() - 1 * 86400000 + 45000).toISOString(),
        },
        {
          id: 'msg_3',
          role: 'assistant',
          content: 'Yes, absolutely! CardFlow AI features high-precision dual-sided visiting card scanning powered by Google Gemini Vision. It seamlessly recognizes international character formats and automatically syncs all extracted contacts directly to your designated Google Sheet in real time. Would you like to schedule an enterprise consultation?',
          timestamp: new Date(Date.now() - 1 * 86400000 + 90000).toISOString(),
        },
        {
          id: 'msg_4',
          role: 'user',
          content: 'Yes please. My name is Chloe Dubois, Head of Strategic Partnerships at Horizon Smart Mobility. Reach me at chloe.dubois@horizonmobility.fr or +33 1 42 68 55 00.',
          timestamp: new Date(Date.now() - 1 * 86400000 + 135000).toISOString(),
          lead_extracted: {
            name: 'Chloe Dubois',
            company: 'Horizon Smart Mobility',
            email: 'chloe.dubois@horizonmobility.fr',
            phone: '+33 1 42 68 55 00',
            intent: 'Enterprise 30-seat card scanner rollout with Google Sheets sync',
            budget: 24000,
          },
        },
        {
          id: 'msg_5',
          role: 'assistant',
          content: 'Thank you, Chloe! I have logged your request and qualified your inquiry for our Enterprise deployment tier. Our Senior Solutions team will connect with you within 2 hours to confirm your tailored demo.',
          timestamp: new Date(Date.now() - 1 * 86400000 + 150000).toISOString(),
        },
      ],
    },
  ];

  sheetsConfig: GoogleSheetsConfig = {
    organization_id: 1,
    connected: true,
    spreadsheet_id: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
    spreadsheet_name: 'CardFlow_Enterprise_Master_CRM_2026',
    target_sheet_name: 'Verified Contacts & Leads',
    auto_sync: true,
    last_synced_at: new Date(Date.now() - 3600000).toISOString(),
    total_rows_synced: 142,
    service_account_email: 'cardflow-sync-service@cardflow-ai.iam.gserviceaccount.com',
  };

  syncLogs: SyncLog[] = [
    {
      id: 'log_701',
      organization_id: 1,
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      records_count: 4,
      status: 'SUCCESS',
      details: 'Synced 4 contacts to sheet "Verified Contacts & Leads". 0 duplicates detected.',
    },
    {
      id: 'log_702',
      organization_id: 1,
      timestamp: new Date(Date.now() - 28 * 3600000).toISOString(),
      records_count: 12,
      status: 'SUCCESS',
      details: 'Initial batch sync completed for new organization import.',
    },
  ];

  // Helper Methods with Strict Organization Isolation
  getOrganization(id: number) {
    return this.organizations.find((o) => o.id === id);
  }

  getUsers(orgId: number) {
    return this.users.filter((u) => u.organization_id === orgId);
  }

  getUserById(id: number, orgId: number) {
    return this.users.find((u) => u.id === id && u.organization_id === orgId);
  }

  getUserByEmail(email: string) {
    return this.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  }

  getRoles(orgId: number) {
    return this.roles.filter((r) => r.organization_id === orgId);
  }

  getContacts(orgId: number) {
    return this.contacts.filter((c) => c.organization_id === orgId);
  }

  getLeads(orgId: number) {
    return this.leads.filter((l) => l.organization_id === orgId);
  }

  getAgents(orgId: number) {
    return this.agents.filter((a) => a.organization_id === orgId);
  }

  getAgentBySlug(slug: string) {
    return this.agents.find((a) => a.public_slug.toLowerCase() === slug.toLowerCase());
  }

  getKnowledgeBases(orgId: number) {
    return this.knowledgeBases.filter((kb) => kb.organization_id === orgId);
  }

  getDocuments(orgId: number) {
    return this.documents.filter((d) => d.organization_id === orgId);
  }

  getConversations(orgId: number) {
    return this.conversations.filter((c) => c.organization_id === orgId);
  }

  // Mapping from workspace identifier (e.g. 'user:harishsadula949@gmail.com' or 'device:uuid') to organization_id
  workspaceToOrgId: Map<string, number> = new Map();
  sheetsConfigs: Map<number, GoogleSheetsConfig> = new Map([
    [
      1,
      {
        organization_id: 1,
        connected: true,
        spreadsheet_id: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
        spreadsheet_name: 'CardFlow_Enterprise_Master_CRM_2026',
        target_sheet_name: 'Verified Contacts & Leads',
        auto_sync: true,
        last_synced_at: new Date(Date.now() - 3600000).toISOString(),
        total_rows_synced: 142,
        service_account_email: 'cardflow-sync-service@cardflow-ai.iam.gserviceaccount.com',
      },
    ],
  ]);

  getOrCreateWorkspace(workspaceKey: string, userEmail?: string): { organization: Organization; user: User } {
    const normalizedKey = (workspaceKey || 'default').trim().toLowerCase();

    // 1. Direct workspace key lookup
    let orgId = this.workspaceToOrgId.get(normalizedKey);
    let organization = orgId ? this.getOrganization(orgId) : undefined;

    // 2. Email fallback lookup
    if (!organization && userEmail) {
      const existingUser = this.getUserByEmail(userEmail);
      if (existingUser) {
        organization = this.getOrganization(existingUser.organization_id);
        if (organization) {
          orgId = organization.id;
          this.workspaceToOrgId.set(normalizedKey, orgId);
        }
      }
    }

    // 3. If workspace does not exist yet, provision an isolated Organization and User
    if (!organization) {
      const newOrgId = this.organizations.length > 0 ? Math.max(...this.organizations.map((o) => o.id)) + 1 : 1;
      const isEmail = normalizedKey.startsWith('user:') || (Boolean(userEmail) && userEmail!.includes('@'));
      const email = userEmail || (isEmail ? normalizedKey.replace('user:', '') : `user_${newOrgId}@device.cardflow.local`);
      const rawName = isEmail ? email.split('@')[0] : `Device #${newOrgId}`;
      const capitalizedName = rawName.charAt(0).toUpperCase() + rawName.slice(1);

      organization = {
        id: newOrgId,
        name: `${capitalizedName} Workspace`,
        email: email,
        industry: 'Business Services',
        timezone: 'UTC',
        plan: 'enterprise',
        created_at: new Date().toISOString(),
      };
      this.organizations.push(organization);
      this.workspaceToOrgId.set(normalizedKey, newOrgId);
      if (userEmail) {
        this.workspaceToOrgId.set(`user:${userEmail.toLowerCase()}`, newOrgId);
      }

      // Create Admin Role & User
      const newUserId = this.users.length > 0 ? Math.max(...this.users.map((u) => u.id)) + 1 : 1;
      const adminRoleId = `role_admin_${newOrgId}`;
      this.roles.push({
        id: adminRoleId,
        organization_id: newOrgId,
        name: ADMIN_ROLE_NAME,
        description: 'Full administrative access within this organization.',
        permissions: CANONICAL_PERMISSIONS.map((p) => p.name),
      });

      const user: User = {
        id: newUserId,
        organization_id: newOrgId,
        first_name: capitalizedName,
        last_name: isEmail ? '' : '(Device)',
        email: email,
        role: ADMIN_ROLE_NAME,
        role_ids: [adminRoleId],
        is_active: true,
        is_verified: true,
        created_at: new Date().toISOString(),
      };
      this.users.push(user);

      // Seed independent starter contacts for this new isolated workspace
      // Each contact has a unique ID and belongs EXCLUSIVELY to newOrgId!
      const templateContacts = this.contacts.filter((c) => c.organization_id === 1);
      if (templateContacts.length > 0) {
        templateContacts.forEach((tc, idx) => {
          this.contacts.push({
            ...tc,
            id: `cnt_${newOrgId}_${idx + 101}`,
            organization_id: newOrgId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
        });
      }

      // Seed independent starter leads
      const templateLeads = this.leads.filter((l) => l.organization_id === 1);
      if (templateLeads.length > 0) {
        templateLeads.forEach((tl, idx) => {
          this.leads.push({
            ...tl,
            id: `lead_${newOrgId}_${idx + 201}`,
            organization_id: newOrgId,
            contact_id: tl.contact_id ? `cnt_${newOrgId}_101` : undefined,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
        });
      }

      // Seed independent default Sheets Config
      this.sheetsConfigs.set(newOrgId, {
        organization_id: newOrgId,
        connected: false,
        spreadsheet_id: '',
        spreadsheet_name: `${capitalizedName}_CardFlow_CRM`,
        target_sheet_name: 'Contacts',
        auto_sync: false,
        total_rows_synced: 0,
        service_account_email: 'cardflow-sync-service@cardflow-ai.iam.gserviceaccount.com',
      });

      return { organization, user };
    }

    const user = this.getUsers(organization.id)[0] || this.users[0];
    return { organization, user };
  }

  getSheetsConfig(orgId: number): GoogleSheetsConfig {
    const found = this.sheetsConfigs.get(orgId);
    if (found) return found;
    const initialConfig: GoogleSheetsConfig = {
      organization_id: orgId,
      connected: false,
      spreadsheet_id: '',
      spreadsheet_name: `CardFlow_CRM_${orgId}`,
      target_sheet_name: 'Contacts',
      auto_sync: false,
      total_rows_synced: 0,
      service_account_email: 'cardflow-sync-service@cardflow-ai.iam.gserviceaccount.com',
    };
    this.sheetsConfigs.set(orgId, initialConfig);
    return initialConfig;
  }

  setSheetsConfig(orgId: number, config: Partial<GoogleSheetsConfig>): GoogleSheetsConfig {
    const existing = this.getSheetsConfig(orgId);
    const updated: GoogleSheetsConfig = {
      ...existing,
      ...config,
      organization_id: orgId,
    };
    this.sheetsConfigs.set(orgId, updated);
    return updated;
  }

  getSyncLogs(orgId: number) {
    return this.syncLogs.filter((l) => l.organization_id === orgId);
  }
}

export const db = new CardFlowDatabase();
