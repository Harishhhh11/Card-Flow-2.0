import {
  User,
  Organization,
  Role,
  Contact,
  VisitingCardScanResult,
  Lead,
  Agent,
  KnowledgeBase,
  KnowledgeDocument,
  Conversation,
  ChatMessage,
  GoogleSheetsConfig,
  SyncLog,
  AnalyticsStats,
} from '../types';
import { getActiveAccountEmail } from './googleSheets';

const API_BASE = '/api';
const DEVICE_ID_KEY = 'cardflow_client_device_id';

export function getClientDeviceId(): string {
  try {
    let id = localStorage.getItem(DEVICE_ID_KEY);
    if (!id) {
      id = 'dev_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now().toString(36);
      localStorage.setItem(DEVICE_ID_KEY, id);
    }
    return id;
  } catch {
    return 'device_session_fallback';
  }
}

export function getWorkspaceScope(): string {
  const activeEmail = getActiveAccountEmail();
  if (activeEmail && activeEmail.trim() !== '') {
    return `user:${activeEmail.trim().toLowerCase()}`;
  }
  return `device:${getClientDeviceId()}`;
}

// Helper for dynamic, strictly isolated multi-device and multi-account workspace headers
function getHeaders(): HeadersInit {
  const scope = getWorkspaceScope();
  const activeEmail = getActiveAccountEmail() || '';
  const deviceId = getClientDeviceId();

  return {
    'Content-Type': 'application/json',
    'x-workspace-scope': scope,
    'x-account-email': activeEmail,
    'x-device-id': deviceId,
  };
}

export const api = {
  // Auth & Profile
  async getCurrentUser(): Promise<{ user: User; organization: Organization }> {
    const res = await fetch(`${API_BASE}/v1/auth/me`, { headers: getHeaders() });
    const json = await res.json();
    return json.data;
  },

  async getOrganization(): Promise<Organization> {
    const res = await fetch(`${API_BASE}/v1/organization`, { headers: getHeaders() });
    const json = await res.json();
    return json.data;
  },

  async getUsers(): Promise<User[]> {
    const res = await fetch(`${API_BASE}/v1/users`, { headers: getHeaders() });
    const json = await res.json();
    if (!json.success) throw new Error(json.message || 'Failed to fetch users');
    return json.data;
  },

  async getTeamUsers(): Promise<User[]> {
    return this.getUsers();
  },

  async createUser(data: Partial<User>): Promise<User> {
    const res = await fetch(`${API_BASE}/v1/users`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.message || 'Failed to create user');
    return json.data;
  },

  async inviteUser(data: Partial<User>): Promise<User> {
    return this.createUser(data);
  },

  async getRoles(): Promise<Role[]> {
    const res = await fetch(`${API_BASE}/v1/roles`, { headers: getHeaders() });
    const json = await res.json();
    return json.data;
  },

  // Visiting Card Scanner
  async scanCard(
    side1Base64: string,
    side2Base64?: string
  ): Promise<{ data: VisitingCardScanResult; side2_used: boolean; execution_time_ms?: number }> {
    const res = await fetch(`${API_BASE}/scan-card`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        side1_base64: side1Base64,
        side2_base64: side2Base64,
      }),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.message || 'Visiting card scan failed');
    if (json.data && json.execution_time_ms) {
      json.data.execution_time_ms = json.execution_time_ms;
    }
    return json;
  },

  // Contacts
  async getContacts(params?: { q?: string; source?: string; tag?: string }): Promise<Contact[]> {
    const query = new URLSearchParams();
    if (params?.q) query.set('q', params.q);
    if (params?.source) query.set('source', params.source);
    if (params?.tag) query.set('tag', params.tag);

    const res = await fetch(`${API_BASE}/v1/contacts?${query.toString()}`, { headers: getHeaders() });
    const json = await res.json();
    return json.data;
  },

  async createContact(contact: Partial<Contact> & { sync_to_sheets?: boolean; create_lead?: boolean; deal_value?: number }): Promise<Contact> {
    const res = await fetch(`${API_BASE}/v1/contacts`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(contact),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.message || 'Failed to create contact');
    return json.data;
  },

  async updateContact(id: string, contact: Partial<Contact>): Promise<Contact> {
    const res = await fetch(`${API_BASE}/v1/contacts/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(contact),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.message || 'Failed to update contact');
    return json.data;
  },

  async deleteContact(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/v1/contacts/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.message || 'Failed to delete contact');
  },

  async convertContactToLead(id: string, options?: { deal_value?: number; priority?: string; notes?: string }): Promise<Lead> {
    const res = await fetch(`${API_BASE}/v1/contacts/${id}/convert-to-lead`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(options || {}),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.message || 'Failed to convert contact to lead');
    return json.data;
  },

  // Leads
  async getLeads(): Promise<Lead[]> {
    const res = await fetch(`${API_BASE}/v1/leads`, { headers: getHeaders() });
    const json = await res.json();
    return json.data;
  },

  async createLead(lead: Partial<Lead>): Promise<Lead> {
    const res = await fetch(`${API_BASE}/v1/leads`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(lead),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.message || 'Failed to create lead');
    return json.data;
  },

  async updateLead(id: string, lead: Partial<Lead>): Promise<Lead> {
    const res = await fetch(`${API_BASE}/v1/leads/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(lead),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.message || 'Failed to update lead');
    return json.data;
  },

  async deleteLead(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/v1/leads/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.message || 'Failed to delete lead');
  },

  // AI Receptionists (Agents)
  async getAgents(): Promise<Agent[]> {
    const res = await fetch(`${API_BASE}/v1/agents`, { headers: getHeaders() });
    const json = await res.json();
    return json.data;
  },

  async createAgent(agent: Partial<Agent>): Promise<Agent> {
    const res = await fetch(`${API_BASE}/v1/agents`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(agent),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.message || 'Failed to create agent');
    return json.data;
  },

  async updateAgent(id: string, agent: Partial<Agent>): Promise<Agent> {
    const res = await fetch(`${API_BASE}/v1/agents/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(agent),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.message || 'Failed to update agent');
    return json.data;
  },

  async deleteAgent(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/v1/agents/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.message || 'Failed to delete agent');
  },

  // Chat & Conversations
  async sendChat(params: {
    agent_id: string;
    message: string;
    conversation_id?: string;
    visitor_name?: string;
    visitor_email?: string;
  }): Promise<{ conversation_id: string; message: ChatMessage; lead_captured?: Lead }> {
    const res = await fetch(`${API_BASE}/v1/chat`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(params),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.message || 'Chat message failed');
    return json.data;
  },

  async getConversations(): Promise<Conversation[]> {
    const res = await fetch(`${API_BASE}/v1/conversations`, { headers: getHeaders() });
    const json = await res.json();
    return json.data;
  },

  // Knowledge Base & Docs
  async getKnowledgeBases(): Promise<KnowledgeBase[]> {
    const res = await fetch(`${API_BASE}/v1/knowledge`, { headers: getHeaders() });
    const json = await res.json();
    return json.data;
  },

  async getDocuments(): Promise<KnowledgeDocument[]> {
    const res = await fetch(`${API_BASE}/v1/documents`, { headers: getHeaders() });
    const json = await res.json();
    return json.data;
  },

  async getKnowledgeDocs(): Promise<KnowledgeDocument[]> {
    return this.getDocuments();
  },

  async createDocument(doc: Partial<KnowledgeDocument>): Promise<KnowledgeDocument> {
    const res = await fetch(`${API_BASE}/v1/documents`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(doc),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.message || 'Failed to create document');
    return json.data;
  },

  async createKnowledgeDoc(doc: Partial<KnowledgeDocument>): Promise<KnowledgeDocument> {
    return this.createDocument(doc);
  },

  async deleteDocument(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/v1/documents/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.message || 'Failed to delete document');
  },

  async deleteKnowledgeDoc(id: string): Promise<void> {
    return this.deleteDocument(id);
  },

  // Google Sheets Integration
  async getGoogleSheetsConfig(): Promise<{ config: GoogleSheetsConfig; logs: SyncLog[] }> {
    const res = await fetch(`${API_BASE}/v1/integrations/google-sheets`, { headers: getHeaders() });
    const json = await res.json();
    return json.data;
  },

  async updateGoogleSheetsConfig(data: Partial<GoogleSheetsConfig>): Promise<GoogleSheetsConfig> {
    const res = await fetch(`${API_BASE}/v1/integrations/google-sheets`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    const json = await res.json();
    return json.data;
  },

  async syncGoogleSheets(): Promise<{ records_synced: number; synced_count: number; last_synced_at: string; log: SyncLog }> {
    const res = await fetch(`${API_BASE}/v1/integrations/google-sheets/sync`, {
      method: 'POST',
      headers: getHeaders(),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.message || 'Sync failed');
    return {
      ...json.data,
      synced_count: json.data.records_synced || 0,
    };
  },

  async triggerGoogleSheetsSync(): Promise<{ records_synced: number; synced_count: number; last_synced_at: string; log?: SyncLog }> {
    return this.syncGoogleSheets();
  },

  // Analytics
  async getAnalytics(): Promise<AnalyticsStats> {
    const res = await fetch(`${API_BASE}/v1/analytics`, { headers: getHeaders() });
    const json = await res.json();
    return json.data;
  },
};
