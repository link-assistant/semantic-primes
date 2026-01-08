const { Parser } = require('links-notation');
const fs = require('fs');
const path = require('path');

const parser = new Parser();
const dataDir = path.join(__dirname, '..', 'data');
const content = fs.readFileSync(path.join(dataDir, 'nsm-primes.lino'), 'utf8');

console.log('File size:', content.length, 'bytes');
console.log('Line count:', content.split('\n').length);

try {
  const result = parser.parse(content);
  console.log('\n✓ Successfully parsed!');
  console.log('Total parsed entries:', result.length);

  // Count different types
  const withId = result.filter(r => r.id !== null);
  const withoutId = result.filter(r => r.id === null);

  console.log('Entries with ID (unique entities):', withId.length);
  console.log('Entries without ID (statements):', withoutId.length);

  // Show first few entities
  console.log('\nFirst 5 entities with IDs:');
  for (const entry of withId.slice(0, 5)) {
    console.log(`  ${entry.id}: ${entry.values.length} children`);
  }

  // Show a specific prime's structure
  const iPrime = withId.find(r => r.id === 'i');
  if (iPrime) {
    console.log('\nStructure of "i" prime:');
    console.log(JSON.stringify(iPrime, null, 2));
  }
} catch (e) {
  console.log('\n✗ Parse error:', e.message);

  // Find the error location
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(':') && !lines[i].match(/^\S+:$/)) {
      console.log(`Line ${i + 1} might have issue:`, lines[i]);
    }
  }
}
