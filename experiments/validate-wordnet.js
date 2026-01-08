const { Parser } = require('links-notation');
const fs = require('fs');

const parser = new Parser();
const content = fs.readFileSync('word-net/data/wordnet-source-new.lino', 'utf8');

console.log('File size:', (content.length / 1024 / 1024).toFixed(2), 'MB');
console.log('Line count:', content.split('\n').length);

console.log('\nParsing (this may take a while)...');
const startTime = Date.now();

try {
  const result = parser.parse(content);
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n✓ Successfully parsed in ${elapsed}s!`);
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

  // Try to find problematic line
  const lines = content.split('\n');
  for (let i = 0; i < Math.min(lines.length, 100); i++) {
    if (lines[i].includes(':') && !lines[i].match(/^\S+:$/) && !lines[i].includes('"')) {
      console.log(`Line ${i + 1} might have issue:`, lines[i].substring(0, 100));
    }
  }
}
