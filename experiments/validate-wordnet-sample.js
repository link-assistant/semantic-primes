const { Parser } = require('links-notation');
const fs = require('fs');

const parser = new Parser();
const content = fs.readFileSync('word-net/data/wordnet-source-new.lino', 'utf8');

// Take first 10000 lines to test format validity
const sample = content.split('\n').slice(0, 10000).join('\n');

console.log('Sample size:', (sample.length / 1024).toFixed(2), 'KB');
console.log('Sample lines:', sample.split('\n').length);

try {
  const result = parser.parse(sample);
  console.log('\n✓ Sample parsed successfully!');
  console.log('Parsed entries:', result.length);
} catch (e) {
  console.log('\n✗ Parse error:', e.message);
}
