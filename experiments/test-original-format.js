const { Parser } = require('links-notation');
const fs = require('fs');

const parser = new Parser();

// Test the original nsm-primes format
const original = fs.readFileSync('word-net/data/nsm-primes.lino', 'utf8');

console.log("Testing first 1500 chars of original nsm-primes.lino:\n");
console.log(original.slice(0, 1500));
console.log("\n... (truncated) ...\n");

try {
  const result = parser.parse(original);
  console.log("\nParsed successfully!");
  console.log("Total entries:", result.length);
  console.log("\nFirst 5 entries:");
  console.log(JSON.stringify(result.slice(0, 5), null, 2));
} catch (e) {
  console.log("ERROR:", e.message);
}
