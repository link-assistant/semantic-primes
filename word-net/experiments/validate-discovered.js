const { Parser } = require('links-notation');
const fs = require('fs');

const parser = new Parser();
const content = fs.readFileSync('../data/discovered-primes-new.lino', 'utf8');

console.log('File size:', content.length, 'bytes');
console.log('Line count:', content.split('\n').length);

try {
  const result = parser.parse(content);
  console.log('\n✓ Successfully parsed!');
  console.log('Total parsed entries:', result.length);

  // Count different types
  const withId = result.filter(r => r.id !== null);

  console.log('Entries with ID (unique entities):', withId.length);

  // Show first few
  console.log('\nFirst 5 entities:');
  for (const entry of withId.slice(0, 5)) {
    console.log(`  ${entry.id}: ${entry.values.length} children`);
  }
} catch (e) {
  console.log('\n✗ Parse error:', e.message);
}
