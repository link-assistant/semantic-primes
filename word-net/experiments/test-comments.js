const { Parser } = require('links-notation');

const parser = new Parser();

// Test different comment styles
const testCases = [
  {
    name: "hash comment",
    content: `# this is a comment
test:
  value one`
  },
  {
    name: "double slash comment",
    content: `// this is a comment
test:
  value one`
  },
  {
    name: "no comment",
    content: `test:
  value one`
  },
  {
    name: "simple nested indentation",
    content: `i:
  is a semantic prime
  has category substantives
  alternative lexical form me`
  },
  {
    name: "deeper nesting",
    content: `i:
  is a semantic prime
  has category substantives
  word meanings:
    oewn_14665575_n:
      is defined as "a nonmetallic element"
      part of speech noun
      interlingual index i113951`
  }
];

for (const test of testCases) {
  console.log(`\n=== Testing: ${test.name} ===`);
  console.log("Input:");
  console.log(test.content);
  console.log("\nResult:");
  try {
    const result = parser.parse(test.content);
    console.log(JSON.stringify(result, null, 2));
  } catch (e) {
    console.log("ERROR:", e.message);
  }
}
