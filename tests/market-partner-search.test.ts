import { describe, it, expect, beforeAll } from 'vitest';
import { WilliMakoClient } from '../src/index.js';

describe('Market Partners Search (v0.7.1)', () => {
  let client: WilliMakoClient;

  beforeAll(() => {
    // Public endpoint - no authentication required
    client = new WilliMakoClient({
      baseUrl: process.env.WILLI_MAKO_BASE_URL || 'https://stromhaltig.de/api/v2'
    });
  });

  describe('searchMarketPartners', () => {
    it('should search by company name', async () => {
      const response = await client.searchMarketPartners({
        q: 'Stadtwerke',
        limit: 5
      });

      expect(response.success).toBe(true);
      expect(response.data).toBeDefined();
      expect(response.data.query).toBe('Stadtwerke');
      expect(response.data.count).toBeGreaterThanOrEqual(0);
      expect(response.data.results).toBeInstanceOf(Array);
      expect(response.data.results.length).toBeLessThanOrEqual(5);
    });

    it('should search by BDEW code', async () => {
      const response = await client.searchMarketPartners({
        q: '9900123456789'
      });

      expect(response.success).toBe(true);
      expect(response.data).toBeDefined();
      expect(response.data.results).toBeInstanceOf(Array);
    });

    it('should search by city', async () => {
      const response = await client.searchMarketPartners({
        q: 'München',
        limit: 10
      });

      expect(response.success).toBe(true);
      expect(response.data.count).toBeGreaterThanOrEqual(0);
      expect(response.data.results.length).toBeLessThanOrEqual(10);
    });

    it('should respect limit parameter', async () => {
      const response = await client.searchMarketPartners({
        q: 'Berlin',
        limit: 3
      });

      expect(response.data.results.length).toBeLessThanOrEqual(3);
    });

    it('should return structured market partner data', async () => {
      const response = await client.searchMarketPartners({
        q: 'Stadtwerke München',
        limit: 1
      });

      if (response.data.results.length > 0) {
        const partner = response.data.results[0];

        // Required fields
        expect(partner.code).toBeDefined();
        expect(typeof partner.code).toBe('string');
        expect(partner.companyName).toBeDefined();
        expect(typeof partner.companyName).toBe('string');
        expect(partner.codeType).toBeDefined();
        expect(typeof partner.codeType).toBe('string');
        expect(partner.source).toBeDefined();
        expect(['bdew', 'eic'].includes(partner.source)).toBe(true);

        // Optional fields
        if (partner.validFrom) {
          expect(typeof partner.validFrom).toBe('string');
        }
        if (partner.validTo) {
          expect(typeof partner.validTo).toBe('string');
        }
        if (partner.bdewCodes) {
          expect(Array.isArray(partner.bdewCodes)).toBe(true);
        }
        if (partner.contacts) {
          expect(Array.isArray(partner.contacts)).toBe(true);
          if (partner.contacts.length > 0) {
            const contact = partner.contacts[0];
            if (contact.CompanyName) expect(typeof contact.CompanyName).toBe('string');
            if (contact.City) expect(typeof contact.City).toBe('string');
            if (contact.CodeContactEmail) expect(typeof contact.CodeContactEmail).toBe('string');
          }
        }
        if (partner.allSoftwareSystems) {
          expect(Array.isArray(partner.allSoftwareSystems)).toBe(true);
          if (partner.allSoftwareSystems.length > 0) {
            const system = partner.allSoftwareSystems[0];
            expect(typeof system.name).toBe('string');
            expect(['High', 'Medium', 'Low'].includes(system.confidence)).toBe(true);
            expect(typeof system.evidence_text).toBe('string');
          }
        }
        if (partner.contactSheetUrl) {
          expect(typeof partner.contactSheetUrl).toBe('string');
        }
        if (partner.markdown) {
          expect(typeof partner.markdown).toBe('string');
        }
      }
    });

    it('should handle empty search results', async () => {
      const response = await client.searchMarketPartners({
        q: 'ThisCompanyDefinitelyDoesNotExistInDatabase12345'
      });

      expect(response.success).toBe(true);
      expect(response.data.count).toBe(0);
      expect(response.data.results).toEqual([]);
    });

    it('should use default limit when not specified', async () => {
      const response = await client.searchMarketPartners({
        q: 'Stadtwerke'
      });

      expect(response.success).toBe(true);
      expect(response.data.results.length).toBeLessThanOrEqual(10); // Default limit
    });

    it('should handle special characters in search query', async () => {
      const response = await client.searchMarketPartners({
        q: 'München & Co.',
        limit: 5
      });

      expect(response.success).toBe(true);
      expect(response.data).toBeDefined();
    });

    it('should clamp limit values that exceed the maximum', async () => {
      const response = await client.searchMarketPartners({
        q: 'test',
        limit: 25 // Backend caps at 20
      });

      expect(response.success).toBe(true);
      expect(response.data.results.length).toBeLessThanOrEqual(20);
    });

    it('should return error for empty query', async () => {
      await expect(
        client.searchMarketPartners({
          q: ''
        })
      ).rejects.toThrow();
    });
  });

  describe('Market Partner data completeness', () => {
    it('should include contact information when available', async () => {
      const response = await client.searchMarketPartners({
        q: 'Stadtwerke München',
        limit: 5
      });

      const partnersWithContacts = response.data.results.filter(
        (p) => p.contacts && p.contacts.length > 0
      );

      if (partnersWithContacts.length > 0) {
        const partner = partnersWithContacts[0];
        const contact = partner.contacts![0];

        // At least one contact field should be present
        const hasContactData =
          contact.City ||
          contact.PostCode ||
          contact.Street ||
          contact.CodeContactEmail ||
          contact.CodeContactPhone;

        expect(hasContactData).toBeTruthy();
      }
    });

    it('should include software system information when detected', async () => {
      const response = await client.searchMarketPartners({
        q: 'Stadtwerke',
        limit: 20
      });

      const partnersWithSoftware = response.data.results.filter(
        (p) => p.allSoftwareSystems && p.allSoftwareSystems.length > 0
      );

      if (partnersWithSoftware.length > 0) {
        const partner = partnersWithSoftware[0];
        const system = partner.allSoftwareSystems![0];

        expect(system.name).toBeDefined();
        expect(system.confidence).toBeDefined();
        expect(['High', 'Medium', 'Low'].includes(system.confidence)).toBe(true);
      }
    });

    it('should include BDEW codes when available', async () => {
      const response = await client.searchMarketPartners({
        q: 'Stadtwerke München',
        limit: 10
      });

      const partnersWithBdewCodes = response.data.results.filter(
        (p) => p.bdewCodes && p.bdewCodes.length > 0
      );

      if (partnersWithBdewCodes.length > 0) {
        const partner = partnersWithBdewCodes[0];
        expect(partner.bdewCodes!.length).toBeGreaterThan(0);
        expect(typeof partner.bdewCodes![0]).toBe('string');
      }
    });
  });
});
