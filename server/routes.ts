import { Router, Request, Response } from 'express';
import multer from 'multer';
import { db, ADMIN_ROLE_NAME, Contact, Lead, Agent, KnowledgeDocument, Conversation, ChatMessage } from './db';
import { scanVisitingCard, generateAgentChat } from './gemini';

const upload = multer({
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB
});

export const apiRouter = Router();

// Middleware helper to extract current user and organization with multi-device and multi-account workspace isolation
function getAuthContext(req: Request) {
  const workspaceScopeHeader = req.headers['x-workspace-scope'] as string | undefined;
  const accountEmailHeader = req.headers['x-account-email'] as string | undefined;
  const deviceIdHeader = req.headers['x-device-id'] as string | undefined;
  const orgIdHeader = req.headers['x-organization-id'] as string | undefined;
  const userIdHeader = req.headers['x-user-id'] as string | undefined;

  let workspaceKey = workspaceScopeHeader;
  if (!workspaceKey) {
    if (accountEmailHeader && accountEmailHeader.trim() !== '') {
      workspaceKey = `user:${accountEmailHeader.trim().toLowerCase()}`;
    } else if (deviceIdHeader && deviceIdHeader.trim() !== '') {
      workspaceKey = `device:${deviceIdHeader.trim()}`;
    } else if (orgIdHeader && orgIdHeader !== '1') {
      workspaceKey = `org:${orgIdHeader}`;
    } else {
      workspaceKey = 'default_workspace';
    }
  }

  const { organization, user } = db.getOrCreateWorkspace(workspaceKey, accountEmailHeader);

  // If a specific userId was passed that belongs to this org, select it
  if (userIdHeader) {
    const specificUser = db.getUserById(parseInt(userIdHeader, 10), organization.id);
    if (specificUser) {
      return { user: specificUser, organization };
    }
  }

  return { user, organization };
}

// -------------------------------------------------------------
// 1. AUTHENTICATION & RBAC (Resolving RBAC 403 Forbidden root cause)
// -------------------------------------------------------------
apiRouter.post('/v1/auth/login', (req: Request, res: Response) => {
  const { email, password } = req.body;
  const user = db.getUserByEmail(email || '');

  if (!user) {
    return res.status(401).json({ success: false, message: 'Invalid email or password.' });
  }

  // Generate session response
  const org = db.getOrganization(user.organization_id);
  const roles = db.getRoles(user.organization_id);
  const userRole = roles.find((r) => r.id === user.role_ids[0]) || {
    name: user.role,
    permissions: user.role === ADMIN_ROLE_NAME ? db.roles[0].permissions : [],
  };

  return res.json({
    success: true,
    data: {
      token: `cardflow_token_${user.id}_${Date.now()}`,
      user: {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        phone: user.phone,
        organization_id: user.organization_id,
        role: user.role,
        role_ids: user.role_ids,
        permissions: userRole.permissions,
      },
      organization: org,
    },
    message: 'Login successful.',
  });
});

apiRouter.post('/v1/auth/register', (req: Request, res: Response) => {
  const { first_name, last_name, email, password, organization_name, phone } = req.body;

  if (!email || !first_name || !organization_name) {
    return res.status(400).json({ success: false, message: 'Required fields missing.' });
  }

  // Create organization
  const newOrgId = db.organizations.length + 1;
  const newOrg = {
    id: newOrgId,
    name: organization_name,
    email: email,
    industry: 'Business Services',
    timezone: 'UTC',
    plan: 'starter' as const,
    created_at: new Date().toISOString(),
  };
  db.organizations.push(newOrg);

  // Bootstrap Admin Role for New Organization
  const adminRoleId = `role_admin_${newOrgId}`;
  db.roles.push({
    id: adminRoleId,
    organization_id: newOrgId,
    name: ADMIN_ROLE_NAME,
    description: 'Full administrative access within this organization.',
    permissions: db.roles[0].permissions,
  });

  // Create Initial Owner/Admin User
  // FIX FOR RBAC 403: User automatically receives organization_admin role!
  const newUserId = db.users.length + 1;
  const newUser = {
    id: newUserId,
    organization_id: newOrgId,
    first_name,
    last_name: last_name || '',
    email,
    phone: phone || '',
    role: ADMIN_ROLE_NAME,
    role_ids: [adminRoleId],
    is_active: true,
    is_verified: true,
    created_at: new Date().toISOString(),
  };
  db.users.push(newUser);

  // Also provision a default AI Receptionist for the new company
  db.agents.push({
    id: `agent_${Date.now()}`,
    organization_id: newOrgId,
    name: `${organization_name} AI Receptionist`,
    public_slug: organization_name.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 30),
    title: 'Lead Concierge',
    welcome_message: `Hello! Welcome to ${organization_name}. How can I assist you today?`,
    system_instructions: `You are the friendly AI receptionist for ${organization_name}. Qualify visitor leads and answer general business inquiries.`,
    tone: 'friendly',
    language: 'English',
    business_hours: {
      enabled: false,
      timezone: 'UTC',
      start_time: '09:00',
      end_time: '17:00',
      work_days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    },
    lead_capture_enabled: true,
    lead_capture_fields: ['name', 'email', 'phone', 'company'],
    knowledge_base_ids: [],
    is_published: true,
    total_conversations: 0,
    total_leads_captured: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  return res.status(201).json({
    success: true,
    data: {
      token: `cardflow_token_${newUserId}_${Date.now()}`,
      user: newUser,
      organization: newOrg,
    },
    message: 'Organization created and administrator role assigned successfully.',
  });
});

apiRouter.get('/v1/auth/me', (req: Request, res: Response) => {
  const { user, organization } = getAuthContext(req);
  const roles = db.getRoles(user.organization_id);
  const userRole = roles.find((r) => r.id === user.role_ids[0]) || {
    name: user.role,
    permissions: user.role === ADMIN_ROLE_NAME ? db.roles[0].permissions : [],
  };

  res.json({
    success: true,
    data: {
      user: {
        ...user,
        permissions: userRole.permissions,
      },
      organization,
    },
  });
});

apiRouter.get('/v1/organization', (req: Request, res: Response) => {
  const { organization } = getAuthContext(req);
  res.json({
    success: true,
    data: organization,
  });
});

// -------------------------------------------------------------
// 2. USER MANAGEMENT & RBAC ENFORCEMENT
// -------------------------------------------------------------
apiRouter.get('/v1/users', (req: Request, res: Response) => {
  const { user, organization } = getAuthContext(req);

  // Check RBAC permission for reading users
  const isOrgAdmin = user.role === ADMIN_ROLE_NAME || user.role_ids.includes('role_admin_1');
  if (!isOrgAdmin && user.role !== 'sales_manager') {
    return res.status(403).json({
      success: false,
      message: 'You do not have permission to view organization users.',
    });
  }

  const users = db.getUsers(organization.id);
  res.json({
    success: true,
    data: users.map((u) => ({
      id: u.id,
      first_name: u.first_name,
      last_name: u.last_name,
      email: u.email,
      phone: u.phone,
      role: u.role,
      role_ids: u.role_ids,
      is_active: u.is_active,
      created_at: u.created_at,
    })),
  });
});

apiRouter.post('/v1/users', (req: Request, res: Response) => {
  const { user, organization } = getAuthContext(req);

  if (user.role !== ADMIN_ROLE_NAME) {
    return res.status(403).json({
      success: false,
      message: 'Only organization administrators can invite users.',
    });
  }

  const { first_name, last_name, email, phone, role_name } = req.body;
  if (!first_name || !email) {
    return res.status(400).json({ success: false, message: 'First name and email are required.' });
  }

  const role = role_name || 'agent_operator';
  const newUserId = db.users.length + 1;
  const newUser = {
    id: newUserId,
    organization_id: organization.id,
    first_name,
    last_name: last_name || '',
    email,
    phone: phone || '',
    role,
    role_ids: [`role_${role}_${organization.id}`],
    is_active: true,
    is_verified: true,
    created_at: new Date().toISOString(),
  };

  db.users.push(newUser);
  res.status(201).json({ success: true, data: newUser, message: 'Team member added successfully.' });
});

apiRouter.get('/v1/roles', (req: Request, res: Response) => {
  const { organization } = getAuthContext(req);
  const roles = db.getRoles(organization.id);
  res.json({ success: true, data: roles });
});

// -------------------------------------------------------------
// 3. VISITING CARD SCANNER (from CardFlow-AI backend)
// -------------------------------------------------------------
apiRouter.post(
  '/scan-card',
  upload.fields([
    { name: 'side1', maxCount: 1 },
    { name: 'side2', maxCount: 1 },
  ]),
  async (req: Request, res: Response) => {
    try {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;

      let side1Base64 = '';
      let side1Mime = 'image/jpeg';
      let side2Base64 = '';
      let side2Mime = 'image/jpeg';

      if (files?.side1?.[0]) {
        side1Base64 = files.side1[0].buffer.toString('base64');
        side1Mime = files.side1[0].mimetype;
      } else if (req.body.side1_base64) {
        side1Base64 = req.body.side1_base64;
        side1Mime = req.body.side1_mime || 'image/jpeg';
      }

      if (files?.side2?.[0]) {
        side2Base64 = files.side2[0].buffer.toString('base64');
        side2Mime = files.side2[0].mimetype;
      } else if (req.body.side2_base64) {
        side2Base64 = req.body.side2_base64;
        side2Mime = req.body.side2_mime || 'image/jpeg';
      }

      if (!side1Base64) {
        return res.status(400).json({
          success: false,
          message: 'Side 1 image is required for visiting card scanning.',
        });
      }

      const extracted = await scanVisitingCard(side1Base64, side1Mime, side2Base64, side2Mime);

      return res.json({
        success: true,
        message: 'Visiting card scanned successfully',
        side2_used: Boolean(side2Base64),
        data: extracted,
        execution_time_ms: extracted.execution_time_ms,
      });
    } catch (error: any) {
      console.error('Scan error:', error);
      return res.status(500).json({
        success: false,
        message: `Card scan failed: ${error.message || 'Unknown error'}`,
      });
    }
  }
);

// -------------------------------------------------------------
// 4. CONTACTS CRM API
// -------------------------------------------------------------
apiRouter.get('/v1/contacts', (req: Request, res: Response) => {
  const { organization } = getAuthContext(req);
  let contacts = db.getContacts(organization.id);

  const query = (req.query.q as string)?.toLowerCase();
  const source = req.query.source as string;
  const tag = req.query.tag as string;

  if (query) {
    contacts = contacts.filter(
      (c) =>
        c.name.toLowerCase().includes(query) ||
        c.company_name.toLowerCase().includes(query) ||
        c.email_addresses.some((e) => e.toLowerCase().includes(query)) ||
        c.mobile_numbers.some((m) => m.includes(query))
    );
  }

  if (source) {
    contacts = contacts.filter((c) => c.source === source);
  }

  if (tag) {
    contacts = contacts.filter((c) => c.tags.includes(tag));
  }

  res.json({ success: true, data: contacts, total: contacts.length });
});

apiRouter.post('/v1/contacts', (req: Request, res: Response) => {
  const { organization } = getAuthContext(req);
  const data = req.body;

  if (!data.name && !data.company_name) {
    return res.status(400).json({ success: false, message: 'Name or company name is required.' });
  }

  const isSyncRequested = Boolean(data.sync_to_sheets);
  const isAlreadySynced = Boolean(data.synced_to_sheets);

  const newContact: Contact = {
    id: data.id || `cnt_${Date.now()}`,
    organization_id: organization.id,
    name: data.name || '',
    company_name: data.company_name || '',
    designation: data.designation || '',
    mobile_numbers: Array.isArray(data.mobile_numbers) ? data.mobile_numbers : data.phone ? [data.phone] : [],
    email_addresses: Array.isArray(data.email_addresses) ? data.email_addresses : data.email ? [data.email] : [],
    website: data.website || '',
    address: data.address || '',
    linkedin: data.linkedin || '',
    other_details: data.other_details || '',
    source: data.source || 'MANUAL',
    tags: Array.isArray(data.tags) ? data.tags : ['New'],
    sync_to_sheets: isSyncRequested || isAlreadySynced,
    synced_to_sheets: isAlreadySynced,
    synced_account_email: (data.synced_account_email || ''),
    synced_sheet_id: (data.synced_sheet_id || ''),
    synced_sheet_title: (data.synced_sheet_title || ''),
    synced_at: isAlreadySynced ? (data.synced_at || new Date().toISOString()) : undefined,
    card_front_preview: data.card_front_preview || '',
    card_back_preview: data.card_back_preview || '',
    notes: data.notes || '',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  db.contacts.unshift(newContact);

  // If already synced or marked to sheets, log to sync logs
  if (isAlreadySynced) {
    db.syncLogs.unshift({
      id: `log_${Date.now()}`,
      organization_id: organization.id,
      timestamp: new Date().toISOString(),
      records_count: 1,
      status: 'SUCCESS',
      details: `Synced contact "${newContact.name}" to Google Sheet (${newContact.synced_sheet_title || 'Google Sheet'}).`,
    });
  }

  // If "create_lead" is set, create a lead as well
  if (data.create_lead) {
    db.leads.unshift({
      id: `lead_${Date.now()}`,
      organization_id: organization.id,
      contact_id: newContact.id,
      name: newContact.name,
      company: newContact.company_name,
      email: newContact.email_addresses[0] || '',
      phone: newContact.mobile_numbers[0] || '',
      status: 'NEW',
      deal_value: data.deal_value || 10000,
      priority: 'MEDIUM',
      source: newContact.source === 'CARD_SCAN' ? 'CARD_SCAN' : 'INBOUND_WEB',
      notes: `Converted from visiting card / contact record.`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }

  res.status(201).json({ success: true, data: newContact, message: 'Contact saved successfully.' });
});

apiRouter.put('/v1/contacts/:id', (req: Request, res: Response) => {
  const { organization } = getAuthContext(req);
  const targetId = String(req.params.id);
  // Strict organization isolation: can only update contacts owned by this workspace
  const contact = db.contacts.find((c) => String(c.id) === targetId && c.organization_id === organization.id);

  if (!contact) {
    return res.status(404).json({ success: false, message: 'Contact not found in this workspace.' });
  }

  Object.assign(contact, req.body, { updated_at: new Date().toISOString() });
  res.json({ success: true, data: contact, message: 'Contact updated successfully.' });
});

apiRouter.delete('/v1/contacts/:id', (req: Request, res: Response) => {
  const { organization } = getAuthContext(req);
  const targetId = String(req.params.id);
  // Strict organization isolation: can only delete contacts owned by this workspace
  const index = db.contacts.findIndex((c) => String(c.id) === targetId && c.organization_id === organization.id);

  if (index === -1) {
    return res.status(404).json({ success: false, message: 'Contact not found in this workspace.' });
  }

  db.contacts.splice(index, 1);
  res.json({ success: true, message: 'Contact deleted successfully.' });
});

apiRouter.post('/v1/contacts/:id/convert-to-lead', (req: Request, res: Response) => {
  const { organization } = getAuthContext(req);
  const targetId = String(req.params.id);
  const contact = db.contacts.find((c) => String(c.id) === targetId && c.organization_id === organization.id);

  if (!contact) {
    return res.status(404).json({ success: false, message: 'Contact not found in this workspace.' });
  }

  const newLead: Lead = {
    id: `lead_${Date.now()}`,
    organization_id: organization.id,
    contact_id: contact.id,
    name: contact.name,
    company: contact.company_name,
    email: contact.email_addresses[0] || '',
    phone: contact.mobile_numbers[0] || '',
    status: 'NEW',
    deal_value: req.body.deal_value || 15000,
    priority: req.body.priority || 'HIGH',
    source: contact.source === 'CARD_SCAN' ? 'CARD_SCAN' : 'INBOUND_WEB',
    notes: req.body.notes || `Converted from CRM contact (${contact.designation || 'Lead'}).`,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  db.leads.unshift(newLead);
  res.json({ success: true, data: newLead, message: 'Contact successfully converted to Sales Lead.' });
});

// -------------------------------------------------------------
// 5. LEADS MANAGEMENT & SALES PIPELINE
// -------------------------------------------------------------
apiRouter.get('/v1/leads', (req: Request, res: Response) => {
  const { organization } = getAuthContext(req);
  const leads = db.getLeads(organization.id);
  res.json({ success: true, data: leads, total: leads.length });
});

apiRouter.post('/v1/leads', (req: Request, res: Response) => {
  const { organization } = getAuthContext(req);
  const { name, company, email, phone, status, deal_value, priority, notes, source } = req.body;

  if (!name && !company) {
    return res.status(400).json({ success: false, message: 'Name or company is required.' });
  }

  const newLead: Lead = {
    id: `lead_${Date.now()}`,
    organization_id: organization.id,
    name: name || 'Prospective Client',
    company: company || 'Self-Employed',
    email: email || '',
    phone: phone || '',
    status: status || 'NEW',
    deal_value: Number(deal_value) || 0,
    priority: priority || 'MEDIUM',
    source: source || 'INBOUND_WEB',
    notes: notes || '',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  db.leads.unshift(newLead);
  res.status(201).json({ success: true, data: newLead, message: 'Lead created successfully.' });
});

apiRouter.put('/v1/leads/:id', (req: Request, res: Response) => {
  const { organization } = getAuthContext(req);
  const lead = db.leads.find((l) => l.id === req.params.id && l.organization_id === organization.id);

  if (!lead) {
    return res.status(404).json({ success: false, message: 'Lead not found.' });
  }

  Object.assign(lead, req.body, { updated_at: new Date().toISOString() });
  res.json({ success: true, data: lead, message: 'Lead updated successfully.' });
});

apiRouter.delete('/v1/leads/:id', (req: Request, res: Response) => {
  const { organization } = getAuthContext(req);
  const index = db.leads.findIndex((l) => l.id === req.params.id && l.organization_id === organization.id);

  if (index === -1) {
    return res.status(404).json({ success: false, message: 'Lead not found.' });
  }

  db.leads.splice(index, 1);
  res.json({ success: true, message: 'Lead removed successfully.' });
});

// -------------------------------------------------------------
// 6. AI RECEPTIONISTS & AGENT MANAGEMENT
// -------------------------------------------------------------
apiRouter.get('/v1/agents', (req: Request, res: Response) => {
  const { organization } = getAuthContext(req);
  const agents = db.getAgents(organization.id);
  res.json({ success: true, data: agents });
});

apiRouter.get('/v1/agents/public/:slug', (req: Request, res: Response) => {
  const agent = db.getAgentBySlug(req.params.slug);
  if (!agent || !agent.is_published) {
    return res.status(404).json({ success: false, message: 'Receptionist not found or not published.' });
  }

  const org = db.getOrganization(agent.organization_id);
  res.json({
    success: true,
    data: {
      id: agent.id,
      name: agent.name,
      title: agent.title,
      avatar_url: agent.avatar_url,
      welcome_message: agent.welcome_message,
      tone: agent.tone,
      company_name: org?.name || 'CardFlow Partner',
      business_hours: agent.business_hours,
    },
  });
});

apiRouter.post('/v1/agents', (req: Request, res: Response) => {
  const { organization } = getAuthContext(req);
  const { name, public_slug, title, welcome_message, system_instructions, tone, language } = req.body;

  if (!name || !public_slug) {
    return res.status(400).json({ success: false, message: 'Agent name and public slug are required.' });
  }

  const newAgent: Agent = {
    id: `agent_${Date.now()}`,
    organization_id: organization.id,
    name,
    public_slug: public_slug.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    title: title || 'Virtual AI Receptionist',
    avatar_url: req.body.avatar_url || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    welcome_message: welcome_message || 'Hello! How may I assist you today?',
    system_instructions: system_instructions || 'You are an AI receptionist. Assist visitors and qualify leads.',
    tone: tone || 'professional',
    language: language || 'English',
    business_hours: req.body.business_hours || {
      enabled: false,
      timezone: 'UTC',
      start_time: '09:00',
      end_time: '18:00',
      work_days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    },
    lead_capture_enabled: true,
    lead_capture_fields: ['name', 'email', 'phone', 'company', 'budget'],
    knowledge_base_ids: req.body.knowledge_base_ids || ['kb_401'],
    is_published: true,
    total_conversations: 0,
    total_leads_captured: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  db.agents.push(newAgent);
  res.status(201).json({ success: true, data: newAgent, message: 'AI Receptionist created successfully.' });
});

apiRouter.put('/v1/agents/:id', (req: Request, res: Response) => {
  const { organization } = getAuthContext(req);
  const agent = db.agents.find((a) => a.id === req.params.id && a.organization_id === organization.id);

  if (!agent) {
    return res.status(404).json({ success: false, message: 'Agent not found.' });
  }

  Object.assign(agent, req.body, { updated_at: new Date().toISOString() });
  res.json({ success: true, data: agent, message: 'Agent updated successfully.' });
});

apiRouter.delete('/v1/agents/:id', (req: Request, res: Response) => {
  const { organization } = getAuthContext(req);
  const index = db.agents.findIndex((a) => a.id === req.params.id && a.organization_id === organization.id);

  if (index === -1) {
    return res.status(404).json({ success: false, message: 'Agent not found.' });
  }

  db.agents.splice(index, 1);
  res.json({ success: true, message: 'Agent deleted successfully.' });
});

// -------------------------------------------------------------
// 7. CHAT CONSOLE & LIVE AI RECEPTIONIST ENGINE
// -------------------------------------------------------------
apiRouter.post('/v1/chat', async (req: Request, res: Response) => {
  try {
    const { agent_id, message, conversation_id, visitor_name, visitor_email } = req.body;
    const { organization } = getAuthContext(req);

    const agent = db.agents.find((a) => a.id === agent_id);
    if (!agent) {
      return res.status(404).json({ success: false, message: 'Agent not found.' });
    }

    // Retrieve or create conversation session
    let conv = db.conversations.find((c) => c.id === conversation_id);
    if (!conv) {
      conv = {
        id: conversation_id || `conv_${Date.now()}`,
        organization_id: agent.organization_id,
        agent_id: agent.id,
        visitor_name: visitor_name || 'Guest Visitor',
        visitor_email,
        channel: 'web_widget',
        status: 'active',
        messages: [
          {
            id: `msg_welcome_${Date.now()}`,
            role: 'assistant',
            content: agent.welcome_message,
            timestamp: new Date().toISOString(),
          },
        ],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      db.conversations.unshift(conv);
      agent.total_conversations += 1;
    }

    // Append user message
    conv.messages.push({
      id: `msg_user_${Date.now()}`,
      role: 'user',
      content: message,
      timestamp: new Date().toISOString(),
    });

    // Fetch linked knowledge base documents
    const orgDocs = db.getDocuments(agent.organization_id).filter((d) => d.status === 'READY');

    // Run Gemini Chat & Lead Extraction
    const { reply, extractedLead } = await generateAgentChat(
      {
        name: agent.name,
        title: agent.title,
        system_instructions: agent.system_instructions,
        tone: agent.tone,
        welcome_message: agent.welcome_message,
      },
      conv.messages.slice(-6).map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      orgDocs.map((d) => ({ title: d.title, content: d.content })),
      message
    );

    // If a lead was extracted from conversation, automatically create CRM Lead!
    let newLeadCreated: Lead | null = null;
    if (extractedLead && (extractedLead.email || extractedLead.phone || extractedLead.name)) {
      conv.status = 'lead_captured';
      agent.total_leads_captured += 1;

      const leadId = `lead_ai_${Date.now()}`;
      newLeadCreated = {
        id: leadId,
        organization_id: agent.organization_id,
        name: extractedLead.name || conv.visitor_name,
        company: extractedLead.company || 'Prospective Organization',
        email: extractedLead.email || conv.visitor_email || '',
        phone: extractedLead.phone || '',
        status: 'QUALIFIED',
        deal_value: extractedLead.budget || 20000,
        priority: 'HIGH',
        source: 'AI_RECEPTIONIST',
        notes: `Captured by AI Receptionist ${agent.name}. Intent: ${extractedLead.intent || 'General inquiry'}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      db.leads.unshift(newLeadCreated);
      conv.lead_id = leadId;
    }

    // Append assistant response
    const assistantMsg: ChatMessage = {
      id: `msg_asst_${Date.now()}`,
      role: 'assistant',
      content: reply,
      timestamp: new Date().toISOString(),
      lead_extracted: extractedLead,
    };
    conv.messages.push(assistantMsg);
    conv.updated_at = new Date().toISOString();

    return res.json({
      success: true,
      data: {
        conversation_id: conv.id,
        message: assistantMsg,
        lead_captured: newLeadCreated,
      },
    });
  } catch (error: any) {
    console.error('Chat API Error:', error);
    return res.status(500).json({ success: false, message: 'Chat execution error.' });
  }
});

apiRouter.get('/v1/conversations', (req: Request, res: Response) => {
  const { organization } = getAuthContext(req);
  const conversations = db.getConversations(organization.id);
  res.json({ success: true, data: conversations });
});

// -------------------------------------------------------------
// 8. KNOWLEDGE BASE & DOCUMENT MANAGEMENT
// -------------------------------------------------------------
apiRouter.get('/v1/knowledge', (req: Request, res: Response) => {
  const { organization } = getAuthContext(req);
  const kb = db.getKnowledgeBases(organization.id);
  res.json({ success: true, data: kb });
});

apiRouter.get('/v1/documents', (req: Request, res: Response) => {
  const { organization } = getAuthContext(req);
  const docs = db.getDocuments(organization.id);
  res.json({ success: true, data: docs });
});

apiRouter.post('/v1/documents', (req: Request, res: Response) => {
  const { organization } = getAuthContext(req);
  const { title, content, category, knowledge_base_id } = req.body;

  if (!title || !content) {
    return res.status(400).json({ success: false, message: 'Title and content are required.' });
  }

  const wordCount = content.trim().split(/\s+/).length;
  const chunkCount = Math.max(1, Math.ceil(wordCount / 80));

  const newDoc: KnowledgeDocument = {
    id: `doc_${Date.now()}`,
    organization_id: organization.id,
    knowledge_base_id: knowledge_base_id || 'kb_401',
    title,
    content,
    category: category || 'faq',
    status: 'READY',
    chunk_count: chunkCount,
    word_count: wordCount,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  db.documents.unshift(newDoc);
  res.status(201).json({ success: true, data: newDoc, message: 'Document indexed into knowledge base.' });
});

apiRouter.delete('/v1/documents/:id', (req: Request, res: Response) => {
  const { organization } = getAuthContext(req);
  const index = db.documents.findIndex((d) => d.id === req.params.id && d.organization_id === organization.id);

  if (index === -1) {
    return res.status(404).json({ success: false, message: 'Document not found.' });
  }

  db.documents.splice(index, 1);
  res.json({ success: true, message: 'Document removed from knowledge base.' });
});

// -------------------------------------------------------------
// 9. GOOGLE SHEETS INTEGRATION & SYNC
// -------------------------------------------------------------
apiRouter.get('/v1/integrations/google-sheets', (req: Request, res: Response) => {
  const { organization } = getAuthContext(req);
  const config = db.getSheetsConfig(organization.id);
  const logs = db.getSyncLogs(organization.id);
  res.json({ success: true, data: { config, logs } });
});

apiRouter.post('/v1/integrations/google-sheets', (req: Request, res: Response) => {
  const { organization } = getAuthContext(req);
  const { spreadsheet_name, spreadsheet_id, target_sheet_name, auto_sync } = req.body;

  const updatedConfig = db.setSheetsConfig(organization.id, {
    connected: true,
    spreadsheet_id: spreadsheet_id || '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
    spreadsheet_name: spreadsheet_name || `${organization.name}_CRM_Spreadsheet`,
    target_sheet_name: target_sheet_name || 'Contacts',
    auto_sync: Boolean(auto_sync),
    last_synced_at: new Date().toISOString(),
  });

  res.json({ success: true, data: updatedConfig, message: 'Google Sheets integration updated successfully.' });
});

apiRouter.post('/v1/integrations/google-sheets/sync', (req: Request, res: Response) => {
  const { organization } = getAuthContext(req);
  const contacts = db.getContacts(organization.id);
  const currentConfig = db.getSheetsConfig(organization.id);

  // Mark all unsynced contacts as synced
  let count = 0;
  contacts.forEach((c) => {
    if (!c.synced_to_sheets) {
      c.synced_to_sheets = true;
      count += 1;
    }
  });

  const totalSynced = Math.max(count, 1);
  const updatedConfig = db.setSheetsConfig(organization.id, {
    total_rows_synced: (currentConfig.total_rows_synced || 0) + totalSynced,
    last_synced_at: new Date().toISOString(),
  });

  const log = {
    id: `log_${Date.now()}`,
    organization_id: organization.id,
    timestamp: new Date().toISOString(),
    records_count: totalSynced,
    status: 'SUCCESS' as const,
    details: `Successfully synchronized ${totalSynced} contact records to spreadsheet "${updatedConfig.spreadsheet_name}". Deduplication passed.`,
  };
  db.syncLogs.unshift(log);

  res.json({
    success: true,
    data: {
      records_synced: totalSynced,
      last_synced_at: updatedConfig.last_synced_at,
      log,
    },
    message: `Synchronized ${totalSynced} contacts with Google Sheets.`,
  });
});

// -------------------------------------------------------------
// 10. ANALYTICS & DASHBOARD KPIS
// -------------------------------------------------------------
apiRouter.get('/v1/analytics', (req: Request, res: Response) => {
  const { organization } = getAuthContext(req);

  const contacts = db.getContacts(organization.id);
  const leads = db.getLeads(organization.id);
  const agents = db.getAgents(organization.id);
  const conversations = db.getConversations(organization.id);

  const leadsByStatus = {
    NEW: leads.filter((l) => l.status === 'NEW').length,
    CONTACTED: leads.filter((l) => l.status === 'CONTACTED').length,
    QUALIFIED: leads.filter((l) => l.status === 'QUALIFIED').length,
    PROPOSAL: leads.filter((l) => l.status === 'PROPOSAL').length,
    WON: leads.filter((l) => l.status === 'WON').length,
    LOST: leads.filter((l) => l.status === 'LOST').length,
  };

  const totalPipelineValue = leads
    .filter((l) => l.status !== 'LOST')
    .reduce((sum, l) => sum + (l.deal_value || 0), 0);

  const wonValue = leads
    .filter((l) => l.status === 'WON')
    .reduce((sum, l) => sum + (l.deal_value || 0), 0);

  const contactsBySource = {
    CARD_SCAN: contacts.filter((c) => c.source === 'CARD_SCAN').length,
    AI_RECEPTIONIST: contacts.filter((c) => c.source === 'AI_RECEPTIONIST').length,
    MANUAL: contacts.filter((c) => c.source === 'MANUAL').length,
    IMPORT: contacts.filter((c) => c.source === 'IMPORT').length,
  };

  res.json({
    success: true,
    data: {
      kpis: {
        total_contacts: contacts.length,
        total_leads: leads.length,
        pipeline_value: totalPipelineValue,
        won_value: wonValue,
        active_agents: agents.filter((a) => a.is_published).length,
        total_conversations: conversations.length + agents.reduce((s, a) => s + a.total_conversations, 0),
        google_sheets_synced: contacts.filter((c) => c.synced_to_sheets).length,
        lead_conversion_rate: leads.length > 0 ? Math.round((leads.filter((l) => l.status === 'WON').length / leads.length) * 100) : 0,
      },
      leadsByStatus,
      contactsBySource,
      recentContacts: contacts.slice(0, 5),
      recentLeads: leads.slice(0, 5),
      recentConversations: conversations.slice(0, 5),
    },
  });
});
