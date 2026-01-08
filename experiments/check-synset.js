const { Parser } = require('links-notation');
const fs = require('fs');

const parser = new Parser();
const content = fs.readFileSync('word-net/data/nsm-primes-new.lino', 'utf8');

const result = parser.parse(content);

// Find a synset entry
const synset = result.find(r => r.id && r.id.startsWith('oewn_'));
console.log('Sample synset:');
console.log(JSON.stringify(synset, null, 2));

// Check for any synset with a definition containing colon
const lines = content.split('\n');
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('is defined as') && lines[i].includes(':')) {
    console.log(`\nLine ${i + 1} has colon in definition:`);
    console.log(lines[i]);
  }
}
