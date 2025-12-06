#!/usr/bin/env tsx
/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Quick token validation script
 * Usage: npx tsx validate-token.ts [token]
 */
import { WilliMakoClient } from './src/index.js';

const args = process.argv.slice(2);
const tokenToTest =
  args[0] || process.env.WILLI_MAKO_TOKEN || '_p-BLSliLL-olJnCl-y1DWyYnFmJuOp1-Mj6ScjQ5Pc';

console.log('🔐 Token Validation Quick Check\n');
console.log('Token:', tokenToTest);
console.log('Length:', tokenToTest.length);
console.log('Format:', tokenToTest.includes('.') ? 'JWT-like' : 'Custom format');
console.log('');

const client = new WilliMakoClient({
  token: tokenToTest,
  baseUrl: 'https://stromhaltig.de/api/v2'
});

async function validate() {
  console.log('Testing token against backend...\n');

  try {
    // Quick test: Create and delete a session
    const sessionResponse = await client.createSession({});
    const sessionId = sessionResponse.data?.sessionId;

    if (sessionId) {
      console.log('✅ Token is VALID and WORKING!');
      console.log('');
      console.log('Session ID:', sessionId);
      console.log('User ID:', sessionResponse.data?.userId);
      console.log('');

      // Cleanup
      await client.deleteSession(sessionId);
      console.log('✅ Test session cleaned up');
      console.log('');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('✨ Token validation successful!');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('');
      console.log('You can use this token in your application:');
      console.log('');
      console.log('  export WILLI_MAKO_TOKEN="' + tokenToTest + '"');
      console.log('');
      process.exit(0);
    } else {
      console.log('❌ Unexpected response structure');
      process.exit(1);
    }
  } catch (error: any) {
    console.log('❌ Token is INVALID or EXPIRED\n');
    console.log('Error:', error.message);
    console.log('Status:', error.status);
    console.log('');

    if (error.status === 403) {
      console.log('💡 Suggestions:');
      console.log('   1. Check if the token has expired');
      console.log('   2. Verify the token is correct');
      console.log('   3. Get a new token via login:');
      console.log('      npm run cli -- auth login --email YOUR_EMAIL --password YOUR_PASSWORD');
      console.log('');
    }

    process.exit(1);
  }
}

validate().catch(console.error);
