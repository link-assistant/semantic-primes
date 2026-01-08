const { Parser } = require('links-notation');

const parser = new Parser();

// Test different approaches for deep nesting
const tests = [
  {
    name: "With synsets colon at level 1 (problematic)",
    content: `i:
  synsets:
    oewn_14665575_n:
      definition "test"`
  },
  {
    name: "Synsets as just a reference, nested ids with colon",
    content: `i:
  synsets
    oewn_14665575_n:
      definition "test"
      pos n`
  },
  {
    name: "No colon for inner levels",
    content: `i:
  synsets
    oewn_14665575_n
      definition "test"
      pos n`
  },
  {
    name: "Completely flat under i",
    content: `i:
  is a semantic prime
  synset oewn_14665575_n
    definition "test"
    pos n`
  },
  {
    name: "Synset entries with has word meaning pattern",
    content: `i:
  is a semantic prime
  has word meaning oewn_14665575_n
    definition "test"
    pos n`
  },
  {
    name: "Using parentheses for nesting",
    content: `i:
  is a semantic prime
  synsets (oewn_14665575_n (definition "test") (pos n))`
  }
];

for (const test of tests) {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`${test.name}`);
  console.log("=".repeat(60));
  console.log(test.content);
  console.log("\nParsed:");
  try {
    const result = parser.parse(test.content);
    console.log(JSON.stringify(result, null, 2));
  } catch (e) {
    console.log("ERROR:", e.message);
  }
}
