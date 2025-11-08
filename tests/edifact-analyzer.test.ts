/**
 * Tests for EDIFACT Message Analyzer (v0.7.0)
 */

import { describe, it, expect, vi } from 'vitest';
import { WilliMakoClient } from '../src/index.js';
import type {
  AnalyzeEdifactMessageResponse,
  ValidateEdifactMessageResponse,
  ExplainEdifactMessageResponse,
  ModifyEdifactMessageResponse,
  EdifactChatResponse
} from '../src/types.js';

describe('EDIFACT Message Analyzer', () => {
  const mockFetch = vi.fn();
  const client = new WilliMakoClient({
    baseUrl: 'https://example.com/api/v2',
    token: 'test-token',
    fetch: mockFetch as unknown as typeof fetch
  });

  const sampleMessage = 'UNH+1+MSCONS:D:11A:UN:2.6e\\nBGM+E01+1234567890+9\\nUNT+3+1';

  describe('analyzeEdifactMessage', () => {
    it('should analyze EDIFACT message structure', async () => {
      const mockResponse: AnalyzeEdifactMessageResponse = {
        success: true,
        data: {
          summary: 'MSCONS meter reading message',
          plausibilityChecks: ['Header present', 'Trailer matches'],
          structuredData: {
            segments: [
              {
                tag: 'UNH',
                elements: ['1', 'MSCONS:D:11A:UN:2.6e'],
                original: 'UNH+1+MSCONS:D:11A:UN:2.6e',
                description: 'Message header'
              }
            ]
          },
          format: 'EDIFACT'
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify(mockResponse)
      });

      const result = await client.analyzeEdifactMessage({ message: sampleMessage });

      expect(result.data.format).toBe('EDIFACT');
      expect(result.data.structuredData.segments).toHaveLength(1);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://example.com/api/v2/message-analyzer/analyze',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ message: sampleMessage })
        })
      );
    });
  });

  describe('validateEdifactMessage', () => {
    it('should validate EDIFACT message', async () => {
      const mockResponse: ValidateEdifactMessageResponse = {
        success: true,
        data: {
          isValid: true,
          errors: [],
          warnings: [],
          messageType: 'MSCONS',
          segmentCount: 3
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify(mockResponse)
      });

      const result = await client.validateEdifactMessage({ message: sampleMessage });

      expect(result.data.isValid).toBe(true);
      expect(result.data.messageType).toBe('MSCONS');
      expect(result.data.segmentCount).toBe(3);
    });

    it('should return validation errors for invalid message', async () => {
      const mockResponse: ValidateEdifactMessageResponse = {
        success: true,
        data: {
          isValid: false,
          errors: ['Missing mandatory segment BGM'],
          warnings: ['Unusual segment order'],
          messageType: 'MSCONS',
          segmentCount: 2
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify(mockResponse)
      });

      const result = await client.validateEdifactMessage({ message: 'UNH+1+MSCONS' });

      expect(result.data.isValid).toBe(false);
      expect(result.data.errors).toHaveLength(1);
      expect(result.data.warnings).toHaveLength(1);
    });
  });

  describe('explainEdifactMessage', () => {
    it('should generate explanation for EDIFACT message', async () => {
      const mockResponse: ExplainEdifactMessageResponse = {
        success: true,
        data: {
          explanation: 'This is a MSCONS message containing meter reading data...',
          success: true
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify(mockResponse)
      });

      const result = await client.explainEdifactMessage({ message: sampleMessage });

      expect(result.data.explanation).toContain('MSCONS');
      expect(result.data.success).toBe(true);
    });
  });

  describe('modifyEdifactMessage', () => {
    it('should modify EDIFACT message based on instruction', async () => {
      const mockResponse: ModifyEdifactMessageResponse = {
        success: true,
        data: {
          modifiedMessage: 'UNH+1+MSCONS:D:11A:UN:2.6e\\nBGM+E01+9999999999+9\\nUNT+3+1',
          isValid: true,
          timestamp: new Date().toISOString()
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify(mockResponse)
      });

      const result = await client.modifyEdifactMessage({
        instruction: 'Ändere die Referenznummer auf 9999999999',
        currentMessage: sampleMessage
      });

      expect(result.data.modifiedMessage).toContain('9999999999');
      expect(result.data.isValid).toBe(true);
    });
  });

  describe('chatAboutEdifactMessage', () => {
    it('should enable chat about EDIFACT message', async () => {
      const mockResponse: EdifactChatResponse = {
        success: true,
        data: {
          response: 'Die Nachrichtenreferenznummer ist 1234567890.',
          timestamp: new Date().toISOString()
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify(mockResponse)
      });

      const result = await client.chatAboutEdifactMessage({
        message: 'Welche Referenznummer hat diese Nachricht?',
        currentEdifactMessage: sampleMessage
      });

      expect(result.data.response).toContain('1234567890');
    });

    it('should support chat history for context', async () => {
      const mockResponse: EdifactChatResponse = {
        success: true,
        data: {
          response: 'Es ist eine MSCONS Nachricht.',
          timestamp: new Date().toISOString()
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify(mockResponse)
      });

      const result = await client.chatAboutEdifactMessage({
        message: 'Welcher Nachrichtentyp ist das?',
        currentEdifactMessage: sampleMessage,
        chatHistory: [
          { role: 'user', content: 'Welche Referenznummer hat diese Nachricht?' },
          { role: 'assistant', content: 'Die Referenznummer ist 1234567890.' }
        ]
      });

      expect(result.data.response).toContain('MSCONS');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://example.com/api/v2/message-analyzer/chat',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('chatHistory')
        })
      );
    });
  });
});
