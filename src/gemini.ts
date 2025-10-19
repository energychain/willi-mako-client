import { GoogleGenerativeAI } from '@google/generative-ai';
import type { ToolScriptAttachment } from './types.js';

export const GEMINI_MODEL = 'gemini-2.5-pro';

export interface GeminiEnhancementInput {
  query: string;
  additionalContext?: string;
  attachments?: ToolScriptAttachment[] | null;
}

export interface GeminiEnhancementResult {
  enhancedQuery?: string;
  additionalContext?: string;
  validationChecklist?: string[];
  rawText?: string;
}

let cachedClient: GoogleGenerativeAI | null = null;

function getGeminiClient(apiKey: string): GoogleGenerativeAI {
  if (!cachedClient) {
    cachedClient = new GoogleGenerativeAI(apiKey);
  }
  return cachedClient;
}

export function isGeminiAvailable(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

function normalizeJsonString(raw: string): string | null {
  if (!raw) {
    return null;
  }

  const trimmed = raw.trim();
  if (trimmed.startsWith('```')) {
    const fenceMatch = /```[a-zA-Z-]*\s*([\s\S]*?)```/m.exec(trimmed);
    if (fenceMatch && fenceMatch[1]) {
      return fenceMatch[1].trim();
    }
  }

  const jsonMatch = /\{[\s\S]*\}/m.exec(trimmed);
  if (jsonMatch) {
    return jsonMatch[0];
  }

  return null;
}

function formatAttachmentsSummary(attachments?: ToolScriptAttachment[] | null): string {
  if (!attachments || attachments.length === 0) {
    return 'Keine Anhänge übergeben.';
  }

  return attachments
    .slice(0, 6)
    .map((attachment, index) => {
      const parts = [
        `Attachment ${index + 1}: ${attachment.filename}`,
        attachment.mimeType ? `MIME: ${attachment.mimeType}` : null,
        attachment.description ? `Beschreibung: ${attachment.description}` : null,
        attachment.weight !== undefined ? `Gewichtung: ${attachment.weight}` : null
      ].filter(Boolean);
      return parts.join(' | ');
    })
    .join('\n');
}

export async function enhanceToolGenerationRequest(
  input: GeminiEnhancementInput
): Promise<GeminiEnhancementResult | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }

  const client = getGeminiClient(apiKey);
  const model = client.getGenerativeModel({
    model: GEMINI_MODEL,
    generationConfig: {
      temperature: 0.1,
      topP: 0.95,
      maxOutputTokens: 512
    }
  });

  const attachmentsSummary = formatAttachmentsSummary(input.attachments);
  const prompt =
    `You are an experienced engineer for German energy market communication tooling.\n` +
    `Your task is to restate and enrich the following automation requirement so that a deterministic Node.js script generator can implement it precisely.\n` +
    `Focus on clarifying inputs, outputs, edge cases, and validation criteria.\n` +
    `Return **strict JSON** with the fields:\n` +
    `- enhanced_query: string (improved natural language description).\n` +
    `- additional_context: string (optional extra hints).\n` +
    `- validation_checklist: string[] (bullet list of checks, keep <=6 items).\n` +
    `Use German phrasing when helpful. Do not include markdown fences in the JSON.\n\n` +
    `Nutzeranforderung:\n${input.query}\n\n` +
    `Bestehender Zusatzkontext:\n${input.additionalContext?.trim() || 'Kein zusätzlicher Kontext.'}\n\n` +
    `Anhängesummary:\n${attachmentsSummary}`;

  const response = await model.generateContent([prompt]);

  const rawText = response.response.text();
  const normalized = normalizeJsonString(rawText || '');

  if (!normalized) {
    return { rawText };
  }

  try {
    const parsed = JSON.parse(normalized) as {
      enhanced_query?: string;
      additional_context?: string;
      validation_checklist?: string[];
    };

    return {
      enhancedQuery: parsed.enhanced_query?.trim(),
      additionalContext: parsed.additional_context?.trim(),
      validationChecklist: Array.isArray(parsed.validation_checklist)
        ? parsed.validation_checklist
            .filter((item) => typeof item === 'string')
            .map((item) => item.trim())
            .filter(Boolean)
        : undefined,
      rawText
    };
  } catch (_error) {
    return { rawText };
  }
}
