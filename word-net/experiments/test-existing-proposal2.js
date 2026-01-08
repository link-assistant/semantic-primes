const { Parser } = require('links-notation');
const fs = require('fs');

const parser = new Parser();

// Test the existing proposal-2 file
const proposal2 = fs.readFileSync('proposals/examples/proposal-2-indentation-based.lino', 'utf8');

console.log("Testing existing proposal-2-indentation-based.lino:\n");
console.log(proposal2.slice(0, 1000));
console.log("\n... (truncated) ...\n");

try {
  const result = parser.parse(proposal2);
  console.log("\nParsed result (first 3 entries):");
  console.log(JSON.stringify(result.slice(0, 3), null, 2));
  console.log("\nTotal entries:", result.length);

  // Check if synsets are captured
  const iEntry = result.find(r => r.id === 'i');
  if (iEntry) {
    console.log("\n'i' entry structure:");
    console.log(JSON.stringify(iEntry, null, 2));
  }
} catch (e) {
  console.log("ERROR:", e.message);
}
