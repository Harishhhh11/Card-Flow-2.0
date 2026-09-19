import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';

// Initialize Gemini client with standard telemetry User-Agent
let aiClient: GoogleGenAI | null = null;
function getGenAI() {
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY || '',
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

export interface ExtractedCardData {
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

/**
 * Cleanly parse and sanitize incoming image payload (Data URI, base64, or SVG text)
 */
function parseImagePayload(input: string, fallbackMime: string = 'image/jpeg'): {
  data: string;
  mimeType: string;
  isSvg: boolean;
  svgContent?: string;
} {
  const trimmed = (input || '').trim();
  if (!trimmed) {
    return { data: '', mimeType: fallbackMime, isSvg: false };
  }

  // Handle standard data URI: data:<mime>;base64,<content>
  const dataUriMatch = trimmed.match(/^data:([^;,]+)(?:;[^,]*)?;base64,(.*)$/s);
  if (dataUriMatch) {
    const rawMime = dataUriMatch[1].toLowerCase();
    const cleanData = dataUriMatch[2].replace(/\s+/g, '');
    
    if (rawMime.includes('svg')) {
      try {
        const decoded = Buffer.from(cleanData, 'base64').toString('utf-8');
        return { data: cleanData, mimeType: 'image/svg+xml', isSvg: true, svgContent: decoded };
      } catch {
        // Fallback
      }
    }

    let mime = rawMime;
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'].includes(mime)) {
      mime = fallbackMime;
    }
    return { data: cleanData, mimeType: mime, isSvg: false };
  }

  // Handle direct SVG XML string
  if (trimmed.startsWith('<svg') || trimmed.includes('<svg')) {
    return {
      data: Buffer.from(trimmed).toString('base64'),
      mimeType: 'image/svg+xml',
      isSvg: true,
      svgContent: trimmed,
    };
  }

  // Handle bare base64 (strip any stray headers or whitespace)
  const cleaned = trimmed.replace(/^data:[^;]+;base64,/, '').replace(/\s+/g, '');
  return { data: cleaned, mimeType: fallbackMime, isSvg: false };
}

const SYSTEM_INSTRUCTION = `You are an elite, ultra-fast, high-precision OCR and business visiting card data extraction engine with native support for multi-lingual and regional scripts, specifically including Telugu (తెలుగు), Hindi, Tamil, Kannada, Malayalam, and English.
Your mission is to extract every piece of professional contact and business information with 100% accuracy, preserving original Telugu / regional script details when present on the card.

Extraction Rules:
1. "name": The full legal or professional name of the person (e.g., "Dr. Vikram Rao", "శ్రీనివాస రావు", "Sarah Jenkins"). If the name is written in Telugu or multi-lingual, transcribe it accurately.
2. "company_name": Full registered company, organization, clinic, law firm, or enterprise brand name (including Telugu translations or branding if present).
3. "designation": Exact job title, role, or position (e.g., "Director", "మేనేజింగ్ డైరెక్టర్", "Software Architect").
4. "mobile_numbers": Clean array of all phone numbers, mobile, WhatsApp, office landlines, or toll-free numbers. Strip non-numeric labels like "TEL:", "Mob:", "Ph:", "ఫోన్:" but keep country code prefix (e.g. "+91 98490 12345", "+1 (415) 555-0192").
5. "email_addresses": Clean array of all email addresses.
6. "website": The company or personal website URL (e.g., "https://apexdigital.io" or "www.apexdigital.io").
7. "address": Full physical office or mailing address including suite, street, city, state/province, postal code, and country (supports Telugu/regional addresses).
8. "linkedin": LinkedIn URL or handle if printed on the card.
9. "other_details": Any additional information (e.g., certifications, GSTIN, branch offices, taglines, services offered).

Formatting Rules:
- If both Side 1 (Front) and Side 2 (Back) of the card are provided, merge all unique details seamlessly without duplicating phone numbers or emails.
- If any field is not present on the card, return an empty string "" (or empty array [] for mobile_numbers and email_addresses).
- Never return the literal string "null" or "undefined". Output clean, accurate strings.`;

/**
 * Scan visiting card images using high-speed Gemini multimodal vision
 */
export async function scanVisitingCard(
  side1Base64: string,
  side1MimeType: string = 'image/jpeg',
  side2Base64?: string,
  side2MimeType?: string
): Promise<ExtractedCardData> {
  const startTime = Date.now();
  const ai = getGenAI();

  const side1 = parseImagePayload(side1Base64, side1MimeType);
  const parts: any[] = [];

  if (side1.isSvg && side1.svgContent) {
    parts.push({ text: `=== VISITING CARD SIDE 1 (FRONT) [SVG VECTOR & TEXT] ===\n${side1.svgContent}` });
  } else if (side1.data) {
    parts.push({
      inlineData: {
        mimeType: side1.mimeType,
        data: side1.data,
      },
    });
    parts.push({ text: 'CARD SIDE 1 (Front Image)' });
  } else {
    throw new Error('Valid image data for Side 1 of visiting card is required.');
  }

  if (side2Base64) {
    const side2 = parseImagePayload(side2Base64, side2MimeType || 'image/jpeg');
    if (side2.isSvg && side2.svgContent) {
      parts.push({ text: `=== VISITING CARD SIDE 2 (BACK) [SVG VECTOR & TEXT] ===\n${side2.svgContent}` });
    } else if (side2.data) {
      parts.push({
        inlineData: {
          mimeType: side2.mimeType,
          data: side2.data,
        },
      });
      parts.push({ text: 'CARD SIDE 2 (Back Image of the same card). Merge with front side.' });
    }
  }

  parts.push({
    text: 'Extract all contact and business card information accurately from this card into the required JSON format.',
  });

  const schemaConfig = {
    responseMimeType: 'application/json',
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING, description: 'Full contact name' },
        company_name: { type: Type.STRING, description: 'Company or business name' },
        designation: { type: Type.STRING, description: 'Job title or role' },
        mobile_numbers: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: 'Array of phone numbers',
        },
        email_addresses: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: 'Array of email addresses',
        },
        website: { type: Type.STRING, description: 'Website URL' },
        address: { type: Type.STRING, description: 'Full physical address' },
        linkedin: { type: Type.STRING, description: 'LinkedIn URL or handle' },
        other_details: { type: Type.STRING, description: 'Additional details or certifications' },
      },
      required: [
        'name',
        'company_name',
        'designation',
        'mobile_numbers',
        'email_addresses',
        'website',
        'address',
        'linkedin',
        'other_details',
      ],
    },
    temperature: 0.1,
  };

  // Primary fast engine: gemini-3.1-flash-lite (sub-2 second OCR latency, default minimal thinking)
  // Fallback engine: gemini-3.8-flash with ThinkingLevel.LOW
  const modelsToTry = [
    { model: 'gemini-3.1-flash-lite', config: { systemInstruction: SYSTEM_INSTRUCTION, ...schemaConfig } },
    {
      model: 'gemini-3.8-flash',
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        ...schemaConfig,
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      },
    },
  ];

  let lastError: any = null;

  for (const { model, config } of modelsToTry) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: { parts },
        config,
      });

      const text = response.text || '{}';
      const parsed = JSON.parse(text);

      const executionTime = Date.now() - startTime;

      // Sanitize fields
      const sanitizeStr = (val: any) => {
        if (typeof val !== 'string') return '';
        const trimmed = val.trim();
        return trimmed.toLowerCase() === 'null' || trimmed.toLowerCase() === 'undefined' ? '' : trimmed;
      };

      const sanitizeArr = (arr: any) => {
        if (!Array.isArray(arr)) return [];
        return arr
          .map((item) => sanitizeStr(item))
          .filter((item) => item.length > 0);
      };

      return {
        name: sanitizeStr(parsed.name),
        company_name: sanitizeStr(parsed.company_name),
        designation: sanitizeStr(parsed.designation),
        mobile_numbers: sanitizeArr(parsed.mobile_numbers),
        email_addresses: sanitizeArr(parsed.email_addresses),
        website: sanitizeStr(parsed.website),
        address: sanitizeStr(parsed.address),
        linkedin: sanitizeStr(parsed.linkedin),
        other_details: sanitizeStr(parsed.other_details),
        execution_time_ms: executionTime,
      };
    } catch (err: any) {
      console.warn(`Visiting card scan attempt with model ${model} failed:`, err?.message || err);
      lastError = err;
      // Continue to next model in loop
    }
  }

  console.error('All Gemini vision models failed for visiting card scan:', lastError);
  throw new Error(`Visiting card extraction failed: ${lastError?.message || 'AI service temporarily unavailable. Please try again.'}`);
}

/**
 * AI Receptionist Chat engine with knowledge base grounding & automated lead extraction
 */
export async function generateAgentChat(
  agent: {
    name: string;
    title: string;
    system_instructions: string;
    tone: string;
    welcome_message: string;
  },
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>,
  knowledgeDocs: Array<{ title: string; content: string }>,
  newUserMessage: string
): Promise<{
  reply: string;
  extractedLead?: {
    name?: string;
    email?: string;
    phone?: string;
    company?: string;
    intent?: string;
    budget?: number;
  };
}> {
  const ai = getGenAI();

  const knowledgeContext = knowledgeDocs.length > 0
    ? `\n=== COMPANY KNOWLEDGE BASE ===\n` +
      knowledgeDocs.map((d) => `Document [${d.title}]:\n${d.content}`).join('\n\n')
    : '\n(No specific company documents linked)';

  const systemInstruction = `
You are ${agent.name}, ${agent.title}.
Your personality tone is: ${agent.tone}.
Instructions:
${agent.system_instructions}

Knowledge Base:
${knowledgeContext}

CRITICAL RULES:
1. Greet visitors warmly and answer based on the knowledge base when available.
2. Inquire naturally about their name, company, email, or requirements when appropriate.
3. Keep responses conversational, concise, and helpful (2-4 sentences max per message unless a list is requested).
4. In addition to answering the user, evaluate if the user provided ANY lead contact info (Name, Email, Phone number, Company, or Budget/Need) anywhere in the conversation.
`;

  const prompt = `
Recent Conversation:
${conversationHistory.map((m) => `${m.role.toUpperCase()}: ${m.content}`).join('\n')}
USER: ${newUserMessage}

Analyze and respond in JSON:
{
  "reply": "Your assistant message to the user",
  "has_lead_info": boolean,
  "lead_data": {
    "name": "Extracted name or null",
    "email": "Extracted email or null",
    "phone": "Extracted phone or null",
    "company": "Extracted company or null",
    "intent": "Brief summary of what they want or null",
    "budget": number or null
  }
}
`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        temperature: 0.3,
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    const reply = parsed.reply || "Thank you for reaching out! How can I assist your business today?";
    const extractedLead = parsed.has_lead_info && parsed.lead_data ? parsed.lead_data : undefined;

    return { reply, extractedLead };
  } catch (error) {
    console.error('Gemini Agent Chat Error:', error);
    return {
      reply: `Thank you for contacting ${agent.name}. I would be delighted to assist you. Could you share your email or phone number so our team can follow up with tailored information?`,
    };
  }
}
