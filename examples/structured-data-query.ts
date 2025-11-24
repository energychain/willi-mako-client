#!/usr/bin/env node

/**
 * @fileoverview Structured Data Query Examples
 *
 * This example demonstrates how to use the new Structured Data API (v0.9.2)
 * to query various data providers including MaStR installations, energy market prices,
 * grid production data, and more.
 *
 * The Structured Data API supports two query modes:
 * 1. Explicit capability with parameters
 * 2. Natural language query with automatic intent resolution
 *
 * Available capabilities:
 * - market-partner-search: Search for market partners (BDEW/EIC codes)
 * - mastr-installations-query: Query MaStR (Marktstammdatenregister) installations
 * - energy-market-prices: Get current energy market prices
 * - grid-production-data: Retrieve grid production data
 * - green-energy-forecast: Get forecasts for renewable energy production
 *
 * Usage:
 *   # Set your API token
 *   export WILLI_MAKO_TOKEN="your-token-here"
 *
 *   # Run the example
 *   npm run example:structured-data
 *   # or
 *   node --loader ts-node/esm examples/structured-data-query.ts
 */

import { WilliMakoClient } from '../src/index.js';

const TOKEN = process.env.WILLI_MAKO_TOKEN;

if (!TOKEN) {
  console.error('❌ Error: WILLI_MAKO_TOKEN environment variable is required');
  console.error('Please set it with: export WILLI_MAKO_TOKEN="your-token-here"');
  process.exit(1);
}

const client = new WilliMakoClient({
  token: TOKEN
});

async function exampleExplicitCapabilityQuery() {
  console.log('\n📊 Example 1: Explicit Capability Query');
  console.log('=========================================\n');

  try {
    // Query MaStR installations for solar systems in Bavaria
    const response = await client.structuredDataQuery({
      capability: 'mastr-installations-query',
      parameters: {
        type: 'solar',
        bundesland: 'Bayern',
        limit: 10
      }
    });

    console.log('✅ Query successful!');
    console.log(`Provider: ${response.metadata.providerId}`);
    console.log(`Capability: ${response.metadata.capability}`);
    console.log(`Data Source: ${response.metadata.dataSource}`);
    console.log(`Execution Time: ${response.metadata.executionTimeMs}ms`);
    console.log(`Cache Hit: ${response.metadata.cacheHit ? 'Yes' : 'No'}`);
    console.log(`\nData Preview:`);
    console.log(JSON.stringify(response.data, null, 2).slice(0, 500) + '...');
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

async function exampleNaturalLanguageQuery() {
  console.log('\n🧠 Example 2: Natural Language Query with Intent Resolution');
  console.log('============================================================\n');

  try {
    // Use natural language to query data
    const response = await client.structuredDataQuery({
      query: 'Wie viele Solaranlagen gibt es in Bayern?'
    });

    console.log('✅ Query successful!');
    console.log(`Provider: ${response.metadata.providerId}`);
    console.log(`Capability: ${response.metadata.capability}`);

    if (response.metadata.intentResolution) {
      console.log('\n🔍 Intent Resolution:');
      console.log(`  Original Query: "${response.metadata.intentResolution.originalQuery}"`);
      console.log(
        `  Resolved Capability: ${response.metadata.intentResolution.resolvedCapability}`
      );
      console.log(
        `  Confidence: ${(response.metadata.intentResolution.confidence * 100).toFixed(1)}%`
      );
      console.log(`  Reasoning: ${response.metadata.intentResolution.reasoning}`);
      console.log(
        `  Extracted Parameters: ${JSON.stringify(response.metadata.intentResolution.extractedParameters)}`
      );
    }

    console.log(`\nExecution Time: ${response.metadata.executionTimeMs}ms`);
    console.log(`Cache Hit: ${response.metadata.cacheHit ? 'Yes' : 'No'}`);
    console.log(`\nData Preview:`);
    console.log(JSON.stringify(response.data, null, 2).slice(0, 500) + '...');
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

async function exampleIntentResolution() {
  console.log('\n🔎 Example 3: Intent Resolution (Dry-Run)');
  console.log('===========================================\n');

  try {
    // Test intent detection without executing the query
    const response = await client.resolveIntent({
      query: 'Zeige mir die aktuellen Strompreise an der Börse'
    });

    console.log('✅ Intent analysis successful!');
    console.log(`\nOriginal Query: "${response.data.originalQuery}"`);
    console.log(`\nSuggested Capability: ${response.data.suggestedCapability}`);
    console.log(`Confidence: ${(response.data.confidence * 100).toFixed(1)}%`);
    console.log(`Reasoning: ${response.data.reasoning}`);
    console.log(`\nSuggested Parameters:`);
    console.log(JSON.stringify(response.data.suggestedParameters, null, 2));

    console.log(`\nAll Detected Capabilities (${response.data.detectedCapabilities.length}):`);
    for (const cap of response.data.detectedCapabilities) {
      console.log(`  • ${cap.capability} (confidence: ${(cap.confidence * 100).toFixed(1)}%)`);
      console.log(`    Parameters: ${JSON.stringify(cap.parameters)}`);
    }

    console.log(`\nAvailable Capabilities (${response.data.availableCapabilities.length}):`);
    for (const cap of response.data.availableCapabilities) {
      console.log(`  • ${cap.capability} (provider: ${cap.providerId})`);
      if (cap.examples && cap.examples.length > 0) {
        console.log(`    Example queries:`);
        for (const example of cap.examples.slice(0, 2)) {
          console.log(`      - "${example}"`);
        }
      }
    }
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

async function exampleListProviders() {
  console.log('\n🏢 Example 4: List Data Providers');
  console.log('==================================\n');

  try {
    const response = await client.getProviders();

    console.log(`✅ Found ${response.data.stats.totalProviders} registered provider(s)`);
    console.log(`\nTotal Capabilities: ${response.data.stats.capabilities.length}`);
    console.log(`Capabilities: ${response.data.stats.capabilities.join(', ')}`);

    console.log(`\nProviders:\n`);
    for (const provider of response.data.providers) {
      const statusIcon = provider.healthy ? '✅' : '❌';
      console.log(`${statusIcon} ${provider.displayName} (${provider.id}) - v${provider.version}`);
      console.log(`   Description: ${provider.description}`);
      console.log(`   Capabilities: ${provider.capabilities.join(', ')}`);
      console.log(`   Status: ${provider.healthy ? 'healthy' : 'degraded'}`);
      console.log('');
    }
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

async function exampleCheckHealth() {
  console.log('\n⚕️  Example 5: Check Provider Health');
  console.log('====================================\n');

  try {
    const response = await client.getProvidersHealth();

    const overallIcon = response.data.overall === 'healthy' ? '✅' : '⚠️';
    console.log(`${overallIcon} Overall System Health: ${response.data.overall}\n`);

    for (const provider of response.data.providers) {
      const statusIcon = provider.healthy ? '✅' : '❌';
      console.log(`${statusIcon} ${provider.providerId}`);
      console.log(`   Last Check: ${provider.lastCheckAt}`);
      if (provider.errorMessage) {
        console.log(`   ❌ Error: ${provider.errorMessage}`);
      }
      console.log('');
    }
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

async function exampleMarketPartnerIntegration() {
  console.log('\n🔗 Example 6: Market Partner Search via Structured Data');
  console.log('========================================================\n');

  try {
    // Use the structured data API to search for market partners
    const response = await client.structuredDataQuery({
      capability: 'market-partner-search',
      parameters: {
        q: 'Stadtwerke München',
        limit: 5
      }
    });

    console.log('✅ Query successful!');
    console.log(`Found ${response.data.count || 'N/A'} market partner(s)`);
    console.log(`\nData Preview:`);
    console.log(JSON.stringify(response.data, null, 2).slice(0, 800) + '...');
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

async function main() {
  console.log('🚀 Willi-Mako Structured Data API Examples (v0.9.2)');
  console.log('====================================================');

  // Run all examples sequentially
  await exampleExplicitCapabilityQuery();
  await exampleNaturalLanguageQuery();
  await exampleIntentResolution();
  await exampleListProviders();
  await exampleCheckHealth();
  await exampleMarketPartnerIntegration();

  console.log('\n✨ All examples completed!');
  console.log('\nTry these examples with the CLI:');
  console.log(
    '  willi-mako data query --query "Wie viele Windkraftanlagen gibt es in Deutschland?"'
  );
  console.log('  willi-mako data resolve-intent --query "Zeige mir die Strompreise"');
  console.log('  willi-mako data providers');
  console.log('  willi-mako data health');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
