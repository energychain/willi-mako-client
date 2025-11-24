/**
 * @fileoverview Tests for Structured Data API functionality (v0.9.2)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WilliMakoClient } from '../src/index.js';
import type {
  StructuredDataQueryResponse,
  ResolveIntentResponse,
  GetProvidersResponse,
  GetProvidersHealthResponse
} from '../src/types.js';

describe('Structured Data API', () => {
  let client: WilliMakoClient;
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
    client = new WilliMakoClient({
      token: 'test-token',
      fetch: mockFetch as unknown as typeof fetch
    });
  });

  describe('structuredDataQuery', () => {
    it('should execute explicit capability query', async () => {
      const mockResponse: StructuredDataQueryResponse = {
        success: true,
        data: {
          results: [{ id: '123', name: 'Test Installation' }],
          count: 1
        },
        metadata: {
          providerId: 'powabase',
          capability: 'mastr-installations-query',
          executionTimeMs: 150,
          cacheHit: false,
          dataSource: 'mastr_db',
          retrievedAt: '2025-11-24T10:00:00Z'
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify(mockResponse)
      });

      const result = await client.structuredDataQuery({
        capability: 'mastr-installations-query',
        parameters: {
          type: 'solar',
          bundesland: 'Bayern',
          limit: 10
        }
      });

      expect(result.success).toBe(true);
      expect(result.metadata.providerId).toBe('powabase');
      expect(result.metadata.capability).toBe('mastr-installations-query');
      expect(result.data.count).toBe(1);

      // Verify fetch was called with correct parameters
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/structured-data/query'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.any(Headers),
          body: expect.stringContaining('mastr-installations-query')
        })
      );
    });

    it('should execute natural language query with intent resolution', async () => {
      const mockResponse: StructuredDataQueryResponse = {
        success: true,
        data: {
          results: [{ count: 42000 }],
          summary: '42,000 Solaranlagen in Bayern'
        },
        metadata: {
          providerId: 'powabase',
          capability: 'mastr-installations-query',
          executionTimeMs: 200,
          cacheHit: false,
          dataSource: 'mastr_db',
          retrievedAt: '2025-11-24T10:00:00Z',
          intentResolution: {
            originalQuery: 'Wie viele Solaranlagen gibt es in Bayern?',
            resolvedCapability: 'mastr-installations-query',
            confidence: 0.95,
            reasoning: 'Detected query about solar installations count in Bavaria region',
            extractedParameters: {
              type: 'solar',
              bundesland: 'Bayern',
              aggregation: 'count'
            }
          }
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify(mockResponse)
      });

      const result = await client.structuredDataQuery({
        query: 'Wie viele Solaranlagen gibt es in Bayern?'
      });

      expect(result.success).toBe(true);
      expect(result.metadata.intentResolution).toBeDefined();
      expect(result.metadata.intentResolution?.confidence).toBe(0.95);
      expect(result.metadata.intentResolution?.resolvedCapability).toBe(
        'mastr-installations-query'
      );
      expect(result.metadata.intentResolution?.extractedParameters).toHaveProperty('bundesland');
    });

    it('should support query options (timeout, bypassCache)', async () => {
      const mockResponse: StructuredDataQueryResponse = {
        success: true,
        data: {},
        metadata: {
          providerId: 'test',
          capability: 'test',
          executionTimeMs: 100,
          cacheHit: false,
          dataSource: 'test',
          retrievedAt: '2025-11-24T10:00:00Z'
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify(mockResponse)
      });

      await client.structuredDataQuery({
        query: 'test query',
        options: {
          timeout: 5000,
          bypassCache: true
        }
      });

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.options).toEqual({
        timeout: 5000,
        bypassCache: true
      });
    });
  });

  describe('resolveIntent', () => {
    it('should analyze natural language query without execution', async () => {
      const mockResponse: ResolveIntentResponse = {
        success: true,
        data: {
          originalQuery: 'Zeige mir die aktuellen Strompreise',
          detectedCapabilities: [
            {
              capability: 'energy-market-prices',
              confidence: 0.92,
              parameters: { market: 'spot', resolution: 'hourly' }
            },
            {
              capability: 'grid-production-data',
              confidence: 0.15,
              parameters: {}
            }
          ],
          suggestedCapability: 'energy-market-prices',
          suggestedParameters: { market: 'spot', resolution: 'hourly' },
          confidence: 0.92,
          reasoning: 'Query asks for current electricity prices, likely spot market prices',
          availableCapabilities: [
            {
              capability: 'energy-market-prices',
              providerId: 'energy-charts',
              examples: ['Wie hoch sind die Strompreise?', 'Zeige Börsenstrompreise'],
              keywords: ['Strompreis', 'Börse', 'Spotmarkt']
            }
          ]
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify(mockResponse)
      });

      const result = await client.resolveIntent({
        query: 'Zeige mir die aktuellen Strompreise'
      });

      expect(result.success).toBe(true);
      expect(result.data.suggestedCapability).toBe('energy-market-prices');
      expect(result.data.confidence).toBeGreaterThan(0.9);
      expect(result.data.detectedCapabilities).toHaveLength(2);
      expect(result.data.availableCapabilities[0]).toHaveProperty('examples');
    });
  });

  describe('getProviders', () => {
    it('should list all registered data providers', async () => {
      const mockResponse: GetProvidersResponse = {
        success: true,
        data: {
          providers: [
            {
              id: 'powabase',
              displayName: 'Powabase Data Provider',
              description: 'MaStR installations and market data',
              version: '1.0.0',
              capabilities: ['mastr-installations-query', 'market-partner-search'],
              healthy: true
            },
            {
              id: 'energy-charts',
              displayName: 'Energy Charts Provider',
              description: 'Energy market prices and forecasts',
              version: '1.2.0',
              capabilities: ['energy-market-prices', 'green-energy-forecast'],
              healthy: true
            }
          ],
          stats: {
            totalProviders: 2,
            capabilities: [
              'mastr-installations-query',
              'market-partner-search',
              'energy-market-prices',
              'green-energy-forecast'
            ]
          }
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify(mockResponse)
      });

      const result = await client.getProviders();

      expect(result.success).toBe(true);
      expect(result.data.providers).toHaveLength(2);
      expect(result.data.stats.totalProviders).toBe(2);
      expect(result.data.stats.capabilities).toHaveLength(4);
      expect(result.data.providers[0].healthy).toBe(true);
    });
  });

  describe('getProvidersHealth', () => {
    it('should return healthy status when all providers are operational', async () => {
      const mockResponse: GetProvidersHealthResponse = {
        success: true,
        data: {
          overall: 'healthy',
          providers: [
            {
              providerId: 'powabase',
              healthy: true,
              lastCheckAt: '2025-11-24T10:00:00Z'
            },
            {
              providerId: 'energy-charts',
              healthy: true,
              lastCheckAt: '2025-11-24T10:00:00Z'
            }
          ]
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify(mockResponse)
      });

      const result = await client.getProvidersHealth();

      expect(result.success).toBe(true);
      expect(result.data.overall).toBe('healthy');
      expect(result.data.providers).toHaveLength(2);
      expect(result.data.providers.every((p) => p.healthy)).toBe(true);
    });

    it('should return degraded status when a provider is unhealthy', async () => {
      const mockResponse: GetProvidersHealthResponse = {
        success: true,
        data: {
          overall: 'degraded',
          providers: [
            {
              providerId: 'powabase',
              healthy: true,
              lastCheckAt: '2025-11-24T10:00:00Z'
            },
            {
              providerId: 'energy-charts',
              healthy: false,
              lastCheckAt: '2025-11-24T10:00:00Z',
              errorMessage: 'Connection timeout to external API'
            }
          ]
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify(mockResponse)
      });

      const result = await client.getProvidersHealth();

      expect(result.success).toBe(true);
      expect(result.data.overall).toBe('degraded');
      const unhealthyProvider = result.data.providers.find((p) => !p.healthy);
      expect(unhealthyProvider).toBeDefined();
      expect(unhealthyProvider?.errorMessage).toContain('timeout');
    });
  });

  describe('Error Handling', () => {
    it('should handle 400 error for unclear intent', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        text: async () =>
          JSON.stringify({
            success: false,
            error: {
              code: 'INTENT_UNCLEAR',
              message: 'Could not determine user intent from query'
            }
          })
      });

      await expect(
        client.structuredDataQuery({
          query: 'xyz'
        })
      ).rejects.toThrow();
    });

    it('should handle 404 error when feature is disabled', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        text: async () =>
          JSON.stringify({
            success: false,
            error: {
              code: 'NO_PROVIDER',
              message: 'No provider available for this capability'
            }
          })
      });

      await expect(
        client.structuredDataQuery({
          capability: 'mastr-installations-query' as any,
          parameters: { invalid: true }
        })
      ).rejects.toThrow();
    });
  });
});
