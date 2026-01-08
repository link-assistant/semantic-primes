const { Parser } = require('links-notation');

const parser = new Parser();

// Test just the parentheses-based content without comments
const cleanContent = `(i isa semantic_prime)
(i category substantives)
(me allolex_of i)
(i wordnet_synset oewn_14665575_n)
(oewn_14665575_n definition "a nonmetallic element")
(oewn_14665575_n pos n)
(oewn_14665575_n ili "i113951")

(you isa semantic_prime)
(you category substantives)`;

console.log("Testing clean parentheses format:\n");
console.log(cleanContent);
console.log("\n");

try {
  const result = parser.parse(cleanContent);
  console.log("Parsed successfully!");
  console.log("Total entries:", result.length);
  console.log(JSON.stringify(result, null, 2));
} catch (e) {
  console.log("ERROR:", e.message);
}

// Now test with comment-like content
console.log("\n\n=== Testing with // lines ===\n");
const withComments = `// This is a comment line

(i isa semantic_prime)
(i category substantives)`;

console.log(withComments);
try {
  const result = parser.parse(withComments);
  console.log("\nParsed successfully!");
  console.log(JSON.stringify(result, null, 2));
} catch (e) {
  console.log("\nERROR:", e.message);
}

// Check what exactly the // produces
console.log("\n\n=== What does // produce? ===\n");
const justComment = `// This is a comment line`;
try {
  const result = parser.parse(justComment);
  console.log("Result for '// This is a comment line':");
  console.log(JSON.stringify(result, null, 2));
} catch (e) {
  console.log("ERROR:", e.message);
}

console.log("\n\n=== The issue might be comment with colon ===\n");
const commentWithColon = `// === Substantives ===`;
try {
  const result = parser.parse(commentWithColon);
  console.log("Result for '// === Substantives ===':");
  console.log(JSON.stringify(result, null, 2));
} catch (e) {
  console.log("ERROR:", e.message);
}
