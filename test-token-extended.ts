#!/usr/bin/env tsx
/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Extended token functionality test
 */
import { WilliMakoClient } from './src/index.js';

const testToken = '_p-BLSliLL-olJnCl-y1DWyYnFmJuOp1-Mj6ScjQ5Pc';

console.log('🧪 Extended Token Functionality Test\n');
console.log('═══════════════════════════════════════════════════════════\n');

const client = new WilliMakoClient({
  token: testToken,
  baseUrl: 'https://stromhaltig.de/api/v2'
});

async function runTests() {
  let sessionId: string | undefined;

  try {
    // Test 1: Create Session
    console.log('1️⃣  Creating a test session...');
    const sessionResponse = await client.createSession({
      preferences: {
        companiesOfInterest: ['test'],
        preferredTopics: ['debugging']
      }
    });
    sessionId = sessionResponse.data?.sessionId;
    console.log('✅ Session created:', sessionId);
    console.log('');

    // Test 2: Get Session
    if (sessionId) {
      console.log('2️⃣  Retrieving session metadata...');
      const getSession = await client.getSession(sessionId);
      console.log('✅ Session retrieved successfully');
      console.log('   User ID:', getSession.data?.userId);
      console.log('   Preferences:', JSON.stringify(getSession.data?.preferences));
      console.log('');
    }

    // Test 3: Semantic Search
    if (sessionId) {
      console.log('3️⃣  Testing semantic search...');
      const searchResponse = await client.semanticSearch({
        sessionId,
        query: 'Was ist UTILMD?',
        options: { limit: 3 }
      });
      console.log('✅ Semantic search successful');
      console.log('   Results found:', searchResponse.data?.results?.length || 0);
      if (searchResponse.data?.results?.[0]) {
        // First result snippet available
        console.log('   First result snippet available');
      }
      console.log('');
    }

    // Test 4: Chat
    if (sessionId) {
      console.log('4️⃣  Testing chat endpoint...');
      const chatResponse = await client.chat({
        sessionId,
        message: 'Was ist ein Lieferantenwechsel?'
      });
      console.log('✅ Chat successful');
      const responseText =
        (chatResponse.data as any)?.response || (chatResponse.data as any)?.message || '';
      if (responseText && typeof responseText === 'string') {
        console.log('   Response:', responseText.substring(0, 150) + '...');
      }
      console.log('');
    }

    // Test 5: Market Partner Search (public endpoint)
    console.log('5️⃣  Testing market partner search...');
    const partnersResponse = await client.searchMarketPartners({
      q: 'Stadtwerke München',
      limit: 2
    });
    console.log('✅ Market partner search successful');
    console.log('   Partners found:', partnersResponse.data?.results?.length || 0);
    if (partnersResponse.data?.results?.[0]) {
      const partner = partnersResponse.data.results[0] as any;
      console.log('   Example:', partner.company || partner.name || 'Partner found');
    }
    console.log('');

    console.log('═══════════════════════════════════════════════════════════');
    console.log('✨ All tests passed successfully!');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');
    console.log('Token Status: ✅ WORKING');
    console.log('Token Format: Custom format (_p-...)');
    console.log('Backend: https://stromhaltig.de/api/v2');
    console.log('');
    console.log('The backend now accepts this token format!');
  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
    console.error('Status:', error.status);
    console.error('Body:', JSON.stringify(error.body, null, 2));
  } finally {
    // Cleanup
    if (sessionId) {
      try {
        console.log('🧹 Cleaning up test session...');
        await client.deleteSession(sessionId);
        console.log('✅ Session deleted');
      } catch (e) {
        console.log('⚠️  Could not delete session:', e);
      }
    }
  }
}

runTests().catch(console.error);
