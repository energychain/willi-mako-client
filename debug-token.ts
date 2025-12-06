#!/usr/bin/env tsx
/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Debug script to test token authentication with the Willi-Mako API
 */
import { WilliMakoClient } from './src/index.js';

const testToken = '_p-BLSliLL-olJnCl-y1DWyYnFmJuOp1-Mj6ScjQ5Pc';

console.log('🔍 Testing token authentication...\n');
console.log('Token being tested:', testToken);
console.log('Token length:', testToken.length);
console.log('Token starts with underscore:', testToken.startsWith('_'));
console.log('');

// Create client with the test token
const client = new WilliMakoClient({
  token: testToken,
  baseUrl: 'https://stromhaltig.de/api/v2'
});

async function testEndpoints() {
  console.log('📡 Testing various endpoints with the token...\n');

  // Test 1: Try to create a session (requires auth)
  try {
    console.log('1️⃣  Testing /sessions (POST) - Create Session');
    const sessionResponse = await client.createSession({});
    console.log('✅ Session creation successful!');
    console.log('Session ID:', sessionResponse.data?.sessionId);
    console.log('');

    // Clean up - delete the test session
    if (sessionResponse.data?.sessionId) {
      await client.deleteSession(sessionResponse.data.sessionId);
      console.log('🧹 Test session cleaned up');
    }
  } catch (error: any) {
    console.log('❌ Session creation failed');
    console.log('Error type:', error.constructor.name);
    console.log('Status code:', error.status);
    console.log('Error message:', error.message);
    console.log('Error body:', JSON.stringify(error.body, null, 2));
    console.log('');
  }

  // Test 2: Try to get remote OpenAPI document (might be public)
  try {
    console.log('2️⃣  Testing /openapi.json (GET) - Fetch OpenAPI Schema');
    const schema = await client.getRemoteOpenApiDocument();
    console.log('✅ OpenAPI fetch successful!');
    console.log('API title:', (schema as any).info?.title);
    console.log('');
  } catch (error: any) {
    console.log('❌ OpenAPI fetch failed');
    console.log('Error type:', error.constructor.name);
    console.log('Status code:', error.status);
    console.log('Error message:', error.message);
    console.log('');
  }

  // Test 3: Try market partner search (public endpoint)
  try {
    console.log('3️⃣  Testing /market-partners/search (GET) - Public Endpoint');
    const searchResponse = await client.searchMarketPartners({
      q: 'Westnetz',
      limit: 1
    });
    console.log('✅ Market partner search successful!');
    console.log('Found partners:', searchResponse.data?.results?.length || 0);
    console.log('');
  } catch (error: any) {
    console.log('❌ Market partner search failed');
    console.log('Error type:', error.constructor.name);
    console.log('Status code:', error.status);
    console.log('Error message:', error.message);
    console.log('');
  }

  // Test 4: Raw fetch to see exact request/response
  console.log('4️⃣  Testing raw fetch with Authorization header');
  console.log('URL: https://stromhaltig.de/api/v2/sessions');
  console.log('Authorization: Bearer ' + testToken);
  console.log('');

  try {
    const response = await fetch('https://stromhaltig.de/api/v2/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${testToken}`,
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify({ preferences: { test: true } })
    });

    console.log('Response status:', response.status, response.statusText);
    console.log('Response headers:');
    response.headers.forEach((value, key) => {
      console.log(`  ${key}: ${value}`);
    });

    const text = await response.text();
    console.log('Response body:', text.substring(0, 500));

    if (response.ok) {
      console.log('✅ Raw fetch successful!');
    } else {
      console.log('❌ Raw fetch failed');
    }
  } catch (error: any) {
    console.log('❌ Raw fetch error:', error.message);
  }
}

testEndpoints().catch(console.error);
