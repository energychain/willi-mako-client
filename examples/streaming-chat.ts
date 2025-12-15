#!/usr/bin/env tsx
/**
 * @fileoverview Example: Streaming Chat with Progress Updates
 *
 * This example demonstrates the recommended approach for long-running chat operations.
 * The streaming endpoint avoids 504 Gateway Timeout errors and provides real-time
 * progress updates during AI processing.
 *
 * **Use Cases:**
 * - Complex reasoning tasks (> 90 seconds)
 * - Blog content transformation
 * - Large EDIFACT analysis
 * - Multi-source research queries
 *
 * @example
 * ```bash
 * # Set your token
 * export WILLI_MAKO_TOKEN="your-token-here"
 *
 * # Run the example
 * npx tsx examples/streaming-chat.ts
 * ```
 */

import { WilliMakoClient } from '../src/index.js';

/**
 * Example 1: Basic Streaming Chat with Progress Updates
 */
async function basicStreamingExample() {
  console.log('\n=== Example 1: Basic Streaming Chat ===\n');

  const client = new WilliMakoClient({
    token: process.env.WILLI_MAKO_TOKEN
  });

  // Create a session
  console.log('📝 Creating session...');
  const session = await client.createSession({
    preferences: {
      companiesOfInterest: ['Enerchy'],
      preferredTopics: ['EDIFACT', 'Marktkommunikation']
    }
  });

  console.log(`✅ Session created: ${session.data.sessionId}`);
  console.log(`   Legacy Chat ID: ${session.data.legacyChatId}\n`);

  if (!session.data.legacyChatId) {
    throw new Error('No legacyChatId available');
  }

  // Send message via streaming
  console.log('📨 Sending message via streaming endpoint...\n');

  const result = await client.chatStreaming(
    session.data.legacyChatId,
    {
      content: 'Erkläre den GPKE-Prozess zur Kundenbelieferung mit Elektrizität im Detail.',
      contextSettings: {
        preferredTopics: ['GPKE', 'Lieferantenwechsel']
      }
    },
    (event) => {
      // Progress callback - called for each status/progress event
      if (event.type === 'status' || event.type === 'progress') {
        const progress = event.progress || 0;
        const bars = Math.round(progress / 5);
        const progressBar = '█'.repeat(bars) + '░'.repeat(20 - bars);
        console.log(`⏳ [${progressBar}] ${progress}% - ${event.message}`);
      }
    }
  );

  console.log('\n✅ Response received!\n');
  console.log('📄 Assistant Response:');
  console.log('─'.repeat(80));
  console.log(result.data?.assistantMessage.content);
  console.log('─'.repeat(80));

  if (result.data?.assistantMessage.metadata) {
    console.log('\n📊 Metadata:');
    console.log(`   Processing Time: ${result.data.assistantMessage.metadata.processingTime}ms`);
    console.log(`   Model Used: ${result.data.assistantMessage.metadata.modelUsed}`);
    console.log(`   Sources Count: ${result.data.assistantMessage.metadata.sourcesCount}`);
  }

  // Clean up
  await client.deleteSession(session.data.sessionId);
  console.log('\n🧹 Session deleted');
}

/**
 * Example 2: Using the High-Level ask() Helper
 */
async function highLevelHelperExample() {
  console.log('\n=== Example 2: High-Level ask() Helper ===\n');

  const client = new WilliMakoClient({
    token: process.env.WILLI_MAKO_TOKEN
  });

  // The ask() method handles session creation automatically
  console.log('🤖 Asking question (with auto-session management)...\n');

  const response = await client.ask(
    'Was sind die wichtigsten Unterschiede zwischen UTILMD und MSCONS?',
    {
      companiesOfInterest: ['Enerchy'],
      preferredTopics: ['EDIFACT', 'edi@energy']
    },
    (status, progress) => {
      // Simple progress callback
      console.log(`⏳ ${progress}% - ${status}`);
    }
  );

  console.log('\n✅ Response received!\n');
  console.log('📄 Assistant Response:');
  console.log('─'.repeat(80));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  console.log((response as any).content);
  console.log('─'.repeat(80));
}

/**
 * Example 3: Comparison - Streaming vs. Synchronous (for demonstration)
 */
async function comparisonExample() {
  console.log('\n=== Example 3: Synchronous vs. Streaming Comparison ===\n');

  const client = new WilliMakoClient({
    token: process.env.WILLI_MAKO_TOKEN
  });

  const session = await client.createSession();
  console.log(`✅ Session created: ${session.data.sessionId}\n`);

  // Simple question (synchronous is fine)
  console.log('1️⃣ Simple question via SYNCHRONOUS endpoint:');
  const startSync = Date.now();
  try {
    const syncResult = await client.chat({
      sessionId: session.data.sessionId,
      message: 'Was ist UTILMD?'
    });
    const durationSync = Date.now() - startSync;
    console.log(`   ✅ Success in ${durationSync}ms`);
    console.log(`   Response length: ${JSON.stringify(syncResult).length} bytes\n`);
  } catch (error) {
    console.error(`   ❌ Failed: ${error}\n`);
  }

  // Complex question (streaming recommended)
  console.log('2️⃣ Complex question via STREAMING endpoint:');
  const startStream = Date.now();
  try {
    if (!session.data.legacyChatId) {
      throw new Error('No legacyChatId available');
    }

    let lastProgress = 0;
    const streamResult = await client.chatStreaming(
      session.data.legacyChatId,
      {
        content:
          'Analysiere die rechtlichen Grundlagen des Lieferantenwechselprozesses nach GPKE und erkläre die Rolle der verschiedenen Marktteilnehmer.'
      },
      (event) => {
        if (event.type === 'progress' && event.progress && event.progress > lastProgress) {
          lastProgress = event.progress;
          console.log(`   ⏳ ${event.progress}% - ${event.message}`);
        }
      }
    );

    const durationStream = Date.now() - startStream;
    console.log(`   ✅ Success in ${durationStream}ms`);
    console.log(
      `   Response length: ${streamResult.data?.assistantMessage.content.length} chars\n`
    );
  } catch (error) {
    console.error(`   ❌ Failed: ${error}\n`);
  }

  // Clean up
  await client.deleteSession(session.data.sessionId);
  console.log('🧹 Session deleted');
}

/**
 * Example 4: Error Handling with Streaming
 */
async function errorHandlingExample() {
  console.log('\n=== Example 4: Error Handling ===\n');

  const client = new WilliMakoClient({
    token: process.env.WILLI_MAKO_TOKEN
  });

  const session = await client.createSession();
  console.log(`✅ Session created: ${session.data.sessionId}\n`);

  try {
    // Attempt to use invalid chat ID
    console.log('🧪 Testing error handling with invalid chat ID...\n');

    await client.chatStreaming('invalid-chat-id', { content: 'Test question' }, (event) => {
      console.log(`   Event: ${event.type} - ${event.message}`);
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.log('❌ Expected error caught:');
    console.log(`   Status: ${error.status}`);
    console.log(`   Message: ${error.message}`);
  }

  // Clean up
  await client.deleteSession(session.data.sessionId);
  console.log('\n🧹 Session deleted');
}

/**
 * Main execution
 */
async function main() {
  if (!process.env.WILLI_MAKO_TOKEN) {
    console.error('❌ Error: WILLI_MAKO_TOKEN environment variable is required');
    console.error('');
    console.error('Usage:');
    console.error('  export WILLI_MAKO_TOKEN="your-token-here"');
    console.error('  npx tsx examples/streaming-chat.ts');
    process.exit(1);
  }

  try {
    // Run examples
    await basicStreamingExample();
    await highLevelHelperExample();
    await comparisonExample();
    await errorHandlingExample();

    console.log('\n✅ All examples completed successfully!\n');
  } catch (error) {
    console.error('\n❌ Error running examples:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
