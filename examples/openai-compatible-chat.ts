#!/usr/bin/env node
/**
 * @file OpenAI-Compatible Chat Completions Demo
 *
 * Demonstrates the new OpenAI-compatible `/chat/completions` endpoint (API v1.1.0+).
 * This endpoint provides a drop-in replacement for OpenAI's chat API with automatic
 * RAG enhancement using Willi-Mako's energy sector knowledge base.
 *
 * @example
 * ```bash
 * export WILLI_MAKO_TOKEN="your-token-here"
 * npm run example:openai-chat
 * ```
 */

import { WilliMakoClient } from '../dist/index.js';
import type { ChatCompletionRequest } from '../dist/index.js';

async function main() {
  const client = new WilliMakoClient({
    token: process.env.WILLI_MAKO_TOKEN
  });

  console.log('🚀 OpenAI-Compatible Chat Completions Demo (API v1.1.0)\n');
  console.log('='.repeat(80));

  // ============================================================================
  // Example 1: Simple Question
  // ============================================================================
  console.log('\n📝 Example 1: Simple Question');
  console.log('-'.repeat(80));

  const simpleRequest: ChatCompletionRequest = {
    messages: [{ role: 'user', content: 'Was ist der Unterschied zwischen UTILMD und MSCONS?' }]
  };

  try {
    const response = await client.createChatCompletion(simpleRequest);

    console.log('\n✅ Response received:');
    console.log(`   Model: ${response.model}`);
    console.log(`   Finish reason: ${response.choices[0].finish_reason}`);
    console.log(`\n📄 Content:\n${response.choices[0].message.content}\n`);

    console.log('📊 RAG Metadata:');
    console.log(
      `   Collections searched: ${response.x_rag_metadata.searched_collections.join(', ')}`
    );
    console.log(`   Documents retrieved: ${response.x_rag_metadata.retrieved_documents}`);
    console.log(`   Retrieval duration: ${response.x_rag_metadata.retrieval_duration_ms}ms`);
    console.log(`   Search strategy: ${response.x_rag_metadata.search_strategy}`);

    console.log('\n📈 Token Usage:');
    console.log(`   Prompt tokens: ${response.usage.prompt_tokens}`);
    console.log(`   Completion tokens: ${response.usage.completion_tokens}`);
    console.log(`   Total tokens: ${response.usage.total_tokens}`);
  } catch (error) {
    console.error('❌ Error:', error);
  }

  // ============================================================================
  // Example 2: With System Instructions
  // ============================================================================
  console.log('\n\n📝 Example 2: With System Instructions');
  console.log('-'.repeat(80));

  const systemInstructionsRequest: ChatCompletionRequest = {
    messages: [
      {
        role: 'system',
        content:
          'Du bist ein Senior-Berater für Netzbetreiber. Antworte präzise und verweise auf gesetzliche Grundlagen.'
      },
      { role: 'user', content: 'Welche Fristen gelten für den Lieferantenwechsel?' }
    ],
    temperature: 0.5,
    max_tokens: 1500
  };

  try {
    const response = await client.createChatCompletion(systemInstructionsRequest);

    console.log('\n✅ Response received:');
    console.log(`\n📄 Content:\n${response.choices[0].message.content}\n`);

    console.log('📊 RAG Metadata:');
    console.log(`   Documents retrieved: ${response.x_rag_metadata.retrieved_documents}`);
    console.log(`   Top sources: ${response.x_rag_metadata.top_source_ids.join(', ')}`);
  } catch (error) {
    console.error('❌ Error:', error);
  }

  // ============================================================================
  // Example 3: Restrict to Specific Collections
  // ============================================================================
  console.log('\n\n📝 Example 3: Restrict to Specific Collections (willi-netz only)');
  console.log('-'.repeat(80));

  const restrictedCollectionsRequest: ChatCompletionRequest = {
    messages: [{ role: 'user', content: 'Was sind die TAB-Anforderungen für PV-Anlagen?' }],
    context_settings: {
      targetCollections: ['willi-netz']
    }
  };

  try {
    const response = await client.createChatCompletion(restrictedCollectionsRequest);

    console.log('\n✅ Response received:');
    console.log(`\n📄 Content:\n${response.choices[0].message.content}\n`);

    console.log('📊 RAG Metadata:');
    console.log(
      `   Collections searched: ${response.x_rag_metadata.searched_collections.join(', ')}`
    );
    console.log(`   Documents retrieved: ${response.x_rag_metadata.retrieved_documents}`);
  } catch (error) {
    console.error('❌ Error:', error);
  }

  // ============================================================================
  // Example 4: Conversation History
  // ============================================================================
  console.log('\n\n📝 Example 4: Conversation History');
  console.log('-'.repeat(80));

  const conversationRequest: ChatCompletionRequest = {
    messages: [
      { role: 'system', content: 'Du bist ein Experte für Marktkommunikation.' },
      { role: 'user', content: 'Erkläre mir den GPKE-Prozess.' },
      {
        role: 'assistant',
        content:
          'Der GPKE-Prozess (Geschäftsprozesse zur Kundenbelieferung mit Elektrizität) regelt den Lieferantenwechsel...'
      },
      { role: 'user', content: 'Welche Fristen gibt es dabei?' }
    ],
    temperature: 0.7
  };

  try {
    const response = await client.createChatCompletion(conversationRequest);

    console.log('\n✅ Response received:');
    console.log(`\n📄 Content:\n${response.choices[0].message.content}\n`);

    console.log('📊 Token Usage:');
    console.log(`   Total tokens: ${response.usage.total_tokens}`);
  } catch (error) {
    console.error('❌ Error:', error);
  }

  // ============================================================================
  // Summary
  // ============================================================================
  console.log('\n\n' + '='.repeat(80));
  console.log('✅ OpenAI-Compatible Chat Completions Demo Complete!');
  console.log('='.repeat(80));
  console.log('\n💡 Key Features:');
  console.log('   • Drop-in replacement for OpenAI API');
  console.log('   • Automatic RAG enhancement (always active)');
  console.log('   • Stateless operation (no session required)');
  console.log('   • System instructions support');
  console.log('   • Collection targeting');
  console.log('   • RAG metadata transparency\n');
}

main().catch((error) => {
  console.error('\n❌ Fatal Error:', error);
  process.exit(1);
});
