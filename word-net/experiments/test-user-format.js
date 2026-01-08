const { Parser } = require('links-notation');

const parser = new Parser();

// Test the EXACT format the user proposed
const userFormat = `i:
  is a semantic prime
  has category substantives
  allolex me
  synsets
    oewn_14665575_n:
      definition "a nonmetallic element..."
      pos n
      ili i113951
    oewn_13764713_n:
      is defined as "the smallest whole number..."
      pos n
      ili i109093
you:
  is a semantic_prime
  has category substantives`;

console.log("User format input:");
console.log(userFormat);
console.log("\nResult:");
try {
  const result = parser.parse(userFormat);
  console.log(JSON.stringify(result, null, 2));
} catch (e) {
  console.log("ERROR:", e.message);
}

// Now let me test what the parser DOES support for deep nesting
console.log("\n\n=== Testing variations of nesting ===\n");

const tests = [
  {
    name: "Synset ID with colon + children at deeper indent",
    content: `synsets
  oewn_14665575_n:
    definition "a nonmetallic element"`
  },
  {
    name: "Root with colon + child with colon + deeper children",
    content: `i:
  synsets
    oewn_14665575_n:
      definition "a test"`
  },
  {
    name: "Without synsets wrapper",
    content: `i:
  oewn_14665575_n:
    definition "a nonmetallic element"
    part of speech noun`
  },
  {
    name: "Synset under i without colon on synsets",
    content: `i:
  word meaning oewn_14665575_n:
    definition "a nonmetallic element"
    part of speech noun`
  },
  {
    name: "Link-style for synset",
    content: `i:
  word meaning oewn_14665575_n
    definition "a nonmetallic element"
    part of speech noun`
  }
];

for (const test of tests) {
  console.log(`\n--- ${test.name} ---`);
  console.log(test.content);
  console.log("\nResult:");
  try {
    const result = parser.parse(test.content);
    console.log(JSON.stringify(result, null, 2));
  } catch (e) {
    console.log("ERROR:", e.message);
  }
}
