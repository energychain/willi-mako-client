#!/usr/bin/env tsx
/**
 * Comprehensive token format analysis
 */

const testToken = '_p-BLSliLL-olJnCl-y1DWyYnFmJuOp1-Mj6ScjQ5Pc';

console.log('🔍 Token Format Analysis\n');
console.log('═══════════════════════════════════════════════════════════\n');

console.log('Token:', testToken);
console.log('Length:', testToken.length);
console.log('');

// JWT structure check
console.log('📝 JWT Structure Check:');
console.log('─────────────────────────────────────────────────────────');
const parts = testToken.split('.');
console.log('Parts (separated by "."):', parts.length);

if (parts.length === 3) {
  console.log('✅ Has 3 parts (typical JWT structure)');
  console.log('Part 1 (Header):', parts[0].substring(0, 50));
  console.log('Part 2 (Payload):', parts[1].substring(0, 50));
  console.log('Part 3 (Signature):', parts[2].substring(0, 50));

  // Try to decode JWT parts
  try {
    const header = JSON.parse(Buffer.from(parts[0], 'base64').toString());
    console.log('Decoded Header:', JSON.stringify(header, null, 2));
  } catch (e) {
    console.log('❌ Cannot decode header as JWT');
  }

  try {
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
    console.log('Decoded Payload:', JSON.stringify(payload, null, 2));
  } catch (e) {
    console.log('❌ Cannot decode payload as JWT');
  }
} else {
  console.log('❌ Does NOT have 3 parts (not a standard JWT)');
  console.log('This token format is: Custom/API Key format');
}
console.log('');

// Character analysis
console.log('🔤 Character Analysis:');
console.log('─────────────────────────────────────────────────────────');
console.log('Starts with underscore:', testToken.startsWith('_'));
console.log('Contains hyphens:', testToken.includes('-'));
console.log('Contains dots:', testToken.includes('.'));
console.log('Pattern:', testToken.match(/[_-]/g)?.join(' ') || 'none');
console.log('');

// Segment analysis (by hyphens)
const segments = testToken.split('-');
console.log('Segments (by hyphen):', segments.length);
segments.forEach((seg, idx) => {
  console.log(`  Segment ${idx + 1}: "${seg}" (${seg.length} chars)`);
});
console.log('');

// Base64url check
console.log('🔐 Encoding Check:');
console.log('─────────────────────────────────────────────────────────');
const base64UrlChars = /^[A-Za-z0-9_-]+$/;
console.log('Matches Base64url pattern:', base64UrlChars.test(testToken));
console.log('');

// Comparison with typical formats
console.log('📊 Token Format Comparison:');
console.log('─────────────────────────────────────────────────────────');
console.log('Standard JWT:      eyJhbGc...XXX.eyJzdWI...YYY.SflKx...ZZZ');
console.log('Your token:        ' + testToken);
console.log('');
console.log('Expected format:   JWT with 3 parts separated by dots');
console.log('Actual format:     Custom token with hyphens, starting with underscore');
console.log('');

console.log('💡 Conclusion:');
console.log('─────────────────────────────────────────────────────────');
console.log('The token "_p-BLSliLL-olJnCl-y1DWyYnFmJuOp1-Mj6ScjQ5Pc"');
console.log('is NOT a valid JWT token.');
console.log('');
console.log('The backend expects JWT tokens in the format:');
console.log('  header.payload.signature');
console.log('');
console.log('This appears to be:');
console.log('  • An API key or service token from a different system');
console.log('  • A token from an older/different authentication system');
console.log('  • A malformed or truncated JWT');
console.log('');
console.log('🔧 Solutions:');
console.log('─────────────────────────────────────────────────────────');
console.log('1. Use the login endpoint to get a valid JWT:');
console.log('   npx tsx test-login.ts');
console.log('');
console.log('2. Or use the CLI login command:');
console.log('   npm run cli -- auth login \\');
console.log('     --email YOUR_EMAIL \\');
console.log('     --password YOUR_PASSWORD \\');
console.log('     --export-env');
console.log('');
console.log('3. Check if you have valid credentials in environment:');
console.log('   export WILLI_MAKO_EMAIL="your-email"');
console.log('   export WILLI_MAKO_PASSWORD="your-password"');
console.log('   npx tsx test-login.ts');
console.log('');
