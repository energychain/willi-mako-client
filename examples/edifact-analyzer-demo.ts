/**
 * EDIFACT Message Analyzer Example
 *
 * Demonstrates the new EDIFACT analyzer features in Willi-Mako Client v0.7.0
 */

import { WilliMakoClient } from '../src/index.js';

const client = new WilliMakoClient({
  token: process.env.WILLI_MAKO_TOKEN
});

// Sample MSCONS message (meter reading)
const msconsSample = `UNH+00000000001111+MSCONS:D:11A:UN:2.6e'
BGM+E01+1234567890+9'
DTM+137:202404221015:203'
NAD+MS+9900123456789::293'
NAD+MR+9900987654321::293'
UNT+6+00000000001111'`;

async function demonstrateEdifactAnalyzer() {
  console.log('🔍 EDIFACT Message Analyzer Demo\n');
  console.log('='.repeat(60));

  try {
    // 1. Analyze structure
    console.log('\n1️⃣  Analyzing EDIFACT structure...');
    const analysis = await client.analyzeEdifactMessage({
      message: msconsSample
    });

    console.log(`   Format: ${analysis.data.format}`);
    console.log(`   Summary: ${analysis.data.summary}`);
    console.log(`   Segments found: ${analysis.data.structuredData.segments.length}`);
    console.log(`   Plausibility checks: ${analysis.data.plausibilityChecks.length}`);

    // 2. Validate message
    console.log('\n2️⃣  Validating EDIFACT message...');
    const validation = await client.validateEdifactMessage({
      message: msconsSample
    });

    console.log(`   Valid: ${validation.data.isValid ? '✅ Yes' : '❌ No'}`);
    console.log(`   Message Type: ${validation.data.messageType || 'Unknown'}`);
    console.log(`   Segment Count: ${validation.data.segmentCount || 0}`);

    if (validation.data.errors.length > 0) {
      console.log('   Errors:', validation.data.errors);
    }

    if (validation.data.warnings.length > 0) {
      console.log('   Warnings:', validation.data.warnings);
    }

    // 3. Get explanation
    console.log('\n3️⃣  Generating human-readable explanation...');
    const explanation = await client.explainEdifactMessage({
      message: msconsSample
    });

    console.log('\n📖 Explanation:');
    console.log('   ' + explanation.data.explanation.split('\n').join('\n   '));

    // 4. Interactive chat
    console.log('\n4️⃣  Asking questions about the message...');
    const chatResponse = await client.chatAboutEdifactMessage({
      message: 'Welche Marktpartner sind in dieser Nachricht genannt?',
      currentEdifactMessage: msconsSample
    });

    console.log('\n💬 AI Answer:');
    console.log('   ' + chatResponse.data.response.split('\n').join('\n   '));

    // 5. Modify message
    console.log('\n5️⃣  Modifying message with natural language instruction...');
    const modified = await client.modifyEdifactMessage({
      instruction: 'Ändere die Nachrichtenreferenznummer auf 9999999999',
      currentMessage: msconsSample
    });

    console.log('\n✏️  Modified message:');
    console.log('   ' + modified.data.modifiedMessage.split('\n').join('\n   '));
    console.log(`   Valid after modification: ${modified.data.isValid ? '✅ Yes' : '❌ No'}`);

    // 6. Store results (requires session)
    console.log('\n6️⃣  Creating session and storing results as artifacts...');
    const session = await client.createSession({
      ttlMinutes: 60,
      preferences: {
        preferredTopics: ['mscons', 'edifact-analysis']
      }
    });
    const sessionId = session.data.sessionId;
    console.log(`   Session created: ${sessionId}`);

    // Store analysis result
    await client.createArtifact({
      sessionId,
      type: 'edifact-analysis',
      name: 'mscons-analysis-result.json',
      mimeType: 'application/json',
      encoding: 'utf8',
      content: JSON.stringify(analysis.data, null, 2),
      tags: ['mscons', 'analysis', 'demo'],
      description: 'EDIFACT analysis result from demo script'
    });

    // Store validation result
    await client.createArtifact({
      sessionId,
      type: 'validation-report',
      name: 'mscons-validation-result.json',
      mimeType: 'application/json',
      encoding: 'utf8',
      content: JSON.stringify(validation.data, null, 2),
      tags: ['mscons', 'validation', 'demo'],
      description: 'EDIFACT validation result from demo script'
    });

    console.log('   ✅ Artifacts stored successfully');

    console.log('\n' + '='.repeat(60));
    console.log('✨ Demo completed successfully!\n');
  } catch (error) {
    console.error('\n❌ Error during demo:', error);

    if (error instanceof Error) {
      console.error('   Message:', error.message);
    }

    process.exit(1);
  }
}

// Run the demo
demonstrateEdifactAnalyzer().catch(console.error);
