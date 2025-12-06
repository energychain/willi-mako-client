#!/usr/bin/env tsx
/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Test login to get a valid token
 */
import { WilliMakoClient } from './src/index.js';

const client = new WilliMakoClient({
  baseUrl: 'https://stromhaltig.de/api/v2'
});

async function testLogin() {
  console.log('🔐 Testing login to get a valid token...\n');

  // Check if login credentials are in environment
  const email = process.env.WILLI_MAKO_EMAIL;
  const password = process.env.WILLI_MAKO_PASSWORD;

  if (!email || !password) {
    console.log('❌ No login credentials found in environment variables');
    console.log('Please set WILLI_MAKO_EMAIL and WILLI_MAKO_PASSWORD');
    return;
  }

  try {
    console.log('Attempting login with email:', email);
    const response = await client.login({
      email,
      password
    });

    if (response.success && response.data?.accessToken) {
      console.log('✅ Login successful!');
      console.log('');
      console.log('Access Token:', response.data.accessToken);
      console.log('Token Length:', response.data.accessToken.length);
      console.log('Token starts with:', response.data.accessToken.substring(0, 10));
      console.log('Expires at:', response.data.expiresAt);
      console.log('');
      console.log('You can use this token in your environment:');
      console.log(`export WILLI_MAKO_TOKEN="${response.data.accessToken}"`);

      // Test the new token
      console.log('');
      console.log('Testing new token with a session creation...');
      client.setToken(response.data.accessToken);
      const sessionResponse = await client.createSession({});
      console.log('✅ Session creation with new token successful!');
      console.log('Session ID:', sessionResponse.data?.sessionId);

      // Clean up
      if (sessionResponse.data?.sessionId) {
        await client.deleteSession(sessionResponse.data.sessionId);
        console.log('🧹 Test session cleaned up');
      }
    } else {
      console.log('❌ Login failed');
      console.log('Response:', JSON.stringify(response, null, 2));
    }
  } catch (error: any) {
    console.log('❌ Login error');
    console.log('Error type:', error.constructor.name);
    console.log('Status code:', error.status);
    console.log('Error message:', error.message);
    console.log('Error body:', JSON.stringify(error.body, null, 2));
  }
}

testLogin().catch(console.error);
