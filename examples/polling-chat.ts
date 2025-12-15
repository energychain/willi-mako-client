#!/usr/bin/env node
/**
 * Polling-Based Chat Example
 *
 * Demonstrates the three polling methods introduced in API v1.0.2:
 * 1. getChatStatus() - Check processing status
 * 2. getLatestResponse() - Get only latest message
 * 3. chatWithPolling() - Complete polling workflow
 *
 * Usage:
 *   WILLI_TOKEN=<your-token> tsx examples/polling-chat.ts
 */

import { WilliMakoClient } from '../src/index.js';

const token = process.env.WILLI_TOKEN;
if (!token) {
  console.error('❌ Missing WILLI_TOKEN environment variable');
  process.exit(1);
}

const client = new WilliMakoClient({ token });

async function demo() {
  console.log('🔧 Willi-Mako Polling Demo (v1.0.2+)\n');

  // Create session
  console.log('1️⃣ Creating session...');
  const session = await client.createSession();
  const sessionId = session.data.sessionId;
  console.log(`   ✅ Session: ${sessionId}\n`);

  // Example 1: High-level chatWithPolling() method
  console.log('2️⃣ Using chatWithPolling() with progress tracking:');
  try {
    const response = await client.chatWithPolling(
      sessionId,
      'Erkläre in zwei Sätzen, was GPKE ist.',
      (status, progress) => {
        // Progress callback
        const bar =
          '█'.repeat(Math.floor(progress / 5)) + '░'.repeat(20 - Math.floor(progress / 5));
        process.stdout.write(`\r   ${bar} ${progress}% - ${status}`);
      },
      2000, // Poll every 2 seconds
      300000 // Timeout after 5 minutes
    );
    console.log('\n   ✅ Response:');
    console.log(`   ${response.content}\n`);
  } catch (error: any) {
    console.error(`\n   ❌ Error: ${error.message}\n`);
  }

  // Example 2: Manual polling with getChatStatus()
  console.log('3️⃣ Manual polling with getChatStatus():');

  // Send message (may timeout)
  try {
    await client.chat({ sessionId, message: 'Was ist WiM?' });
  } catch (error: any) {
    if (error.status === 504) {
      console.log('   ⏱️  Initial request timed out (expected), polling...');
    } else {
      throw error;
    }
  }

  // Get chatId from session
  const updatedSession = await client.getSession(sessionId);
  const chatId = updatedSession.data.legacyChatId;
  if (!chatId) {
    console.error('   ❌ Session has no legacyChatId');
    return;
  }

  // Poll manually
  let attempts = 0;
  let statusResponse: any;
  do {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    statusResponse = await client.getChatStatus(chatId);
    attempts++;
    console.log(
      `   📊 Attempt ${attempts}: ${statusResponse.data.status} (${statusResponse.data.estimatedProgress || 0}%)`
    );
  } while (statusResponse.data.status === 'processing' && attempts < 60);

  if (statusResponse.data.status === 'completed') {
    console.log('   ✅ Response:');
    console.log(`   ${statusResponse.data.lastAssistantMessage?.content || 'No content'}\n`);
  } else {
    console.error(`   ❌ Final status: ${statusResponse.data.status}\n`);
  }

  // Example 3: Lightweight getLatestResponse()
  console.log('4️⃣ Using getLatestResponse() (lightweight):');
  const latestResponse = await client.getLatestResponse(chatId);
  if (latestResponse.data) {
    console.log('   ✅ Latest message:');
    console.log(`   ${latestResponse.data.content.substring(0, 100)}...\n`);
  } else {
    console.log(`   ℹ️  ${latestResponse.message}\n`);
  }

  // Cleanup
  console.log('5️⃣ Cleaning up...');
  await client.deleteSession(sessionId);
  console.log('   ✅ Session deleted\n');

  console.log('✨ Demo complete!');
}

demo().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
