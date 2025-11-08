/**
 * @fileoverview Market Partner Search Example
 *
 * Demonstrates how to search for market partners using the new v0.7.1 API endpoint.
 * This example shows searching by company name, BDEW code, and city, with detailed
 * information extraction including contacts, software systems, and BDEW codes.
 *
 * @example
 * ```bash
 * # Run with ts-node
 * npx ts-node examples/market-partner-search.ts
 *
 * # Or compile and run
 * npm run build
 * node dist/examples/market-partner-search.js
 * ```
 */

import { WilliMakoClient } from '../src/index.js';

async function main() {
  // No authentication required - this is a public endpoint
  const client = new WilliMakoClient();

  console.log('='.repeat(80));
  console.log('Market Partner Search Examples (v0.7.1)');
  console.log('='.repeat(80));
  console.log();

  // Example 1: Search by company name
  console.log('1️⃣  Search by Company Name: "Stadtwerke München"');
  console.log('-'.repeat(80));

  const companyResults = await client.searchMarketPartners({
    q: 'Stadtwerke München',
    limit: 5
  });

  console.log(`Found ${companyResults.data.count} results for "${companyResults.data.query}"\n`);

  for (const partner of companyResults.data.results) {
    console.log(`📊 ${partner.companyName}`);
    console.log(`   Code: ${partner.code} (${partner.codeType})`);
    console.log(`   Source: ${partner.source}`);

    if (partner.validFrom || partner.validTo) {
      const validity = [];
      if (partner.validFrom) validity.push(`from ${partner.validFrom}`);
      if (partner.validTo) validity.push(`to ${partner.validTo}`);
      console.log(`   Valid: ${validity.join(' ')}`);
    }

    if (partner.bdewCodes && partner.bdewCodes.length > 0) {
      console.log(
        `   BDEW Codes: ${partner.bdewCodes.slice(0, 3).join(', ')}${partner.bdewCodes.length > 3 ? '...' : ''}`
      );
    }

    if (partner.contacts && partner.contacts.length > 0) {
      console.log(`   Contacts: ${partner.contacts.length} available`);
      const firstContact = partner.contacts[0];
      if (firstContact.City) {
        console.log(`   Location: ${firstContact.PostCode || ''} ${firstContact.City}`);
      }
      if (firstContact.CodeContactEmail) {
        console.log(`   Email: ${firstContact.CodeContactEmail}`);
      }
      if (firstContact.CodeContactPhone) {
        console.log(`   Phone: ${firstContact.CodeContactPhone}`);
      }
    }

    if (partner.allSoftwareSystems && partner.allSoftwareSystems.length > 0) {
      const systems = partner.allSoftwareSystems
        .map((s) => `${s.name} (${s.confidence})`)
        .join(', ');
      console.log(`   Software Systems: ${systems}`);
    }

    if (partner.contactSheetUrl) {
      console.log(`   📄 Contact Sheet: ${partner.contactSheetUrl}`);
    }

    console.log();
  }

  // Example 2: Search by BDEW code
  console.log('2️⃣  Search by BDEW Code: "9900123456789"');
  console.log('-'.repeat(80));

  const codeResults = await client.searchMarketPartners({
    q: '9900123456789',
    limit: 3
  });

  console.log(`Found ${codeResults.data.count} results\n`);

  for (const partner of codeResults.data.results) {
    console.log(`📊 ${partner.companyName}`);
    console.log(`   Code: ${partner.code} (${partner.codeType})`);

    if (partner.markdown) {
      // Display markdown information if available
      console.log(`\n${partner.markdown.substring(0, 200)}...`);
    }

    console.log();
  }

  // Example 3: Search by city
  console.log('3️⃣  Search by City: "Berlin"');
  console.log('-'.repeat(80));

  const cityResults = await client.searchMarketPartners({
    q: 'Berlin',
    limit: 10
  });

  console.log(`Found ${cityResults.data.count} results in Berlin\n`);

  // Group by code type
  const byType = cityResults.data.results.reduce(
    (acc, partner) => {
      acc[partner.codeType] = (acc[partner.codeType] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  console.log('Distribution by code type:');
  for (const [type, count] of Object.entries(byType)) {
    console.log(`   ${type}: ${count}`);
  }
  console.log();

  // Show first 3 results
  console.log('Top 3 results:');
  for (const partner of cityResults.data.results.slice(0, 3)) {
    console.log(`   - ${partner.companyName} (${partner.code})`);
  }
  console.log();

  // Example 4: Advanced filtering - extract software systems
  console.log('4️⃣  Software Systems Analysis');
  console.log('-'.repeat(80));

  const allSoftware = new Map<string, { count: number; confidence: string[] }>();

  for (const partner of companyResults.data.results) {
    if (partner.allSoftwareSystems) {
      for (const system of partner.allSoftwareSystems) {
        const existing = allSoftware.get(system.name) || { count: 0, confidence: [] };
        existing.count++;
        existing.confidence.push(system.confidence);
        allSoftware.set(system.name, existing);
      }
    }
  }

  if (allSoftware.size > 0) {
    console.log('Software systems detected across all results:\n');
    for (const [name, data] of allSoftware.entries()) {
      const avgConfidence =
        data.confidence.filter((c) => c === 'High').length > 0
          ? 'High'
          : data.confidence.filter((c) => c === 'Medium').length > 0
            ? 'Medium'
            : 'Low';
      console.log(`   ${name}: ${data.count} occurrence(s), Confidence: ${avgConfidence}`);
    }
  } else {
    console.log('No software system information available.');
  }

  console.log();
  console.log('='.repeat(80));
  console.log('✓ Market Partner Search Examples completed');
  console.log('='.repeat(80));
}

main().catch((error) => {
  console.error('❌ Error:', error.message);
  if (error.status) {
    console.error(`   HTTP Status: ${error.status}`);
  }
  if (error.body) {
    console.error('   Details:', JSON.stringify(error.body, null, 2));
  }
  process.exit(1);
});
