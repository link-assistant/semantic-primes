const { Parser } = require('links-notation');

const parser = new Parser();

const testCases = [
  {
    name: "underscore compound names",
    content: `i:
  is a semantic_prime
  has category substantives
  word_meanings:
    oewn_14665575_n:
      is defined as "a nonmetallic element"
      part_of_speech noun
      interlingual_index i113951`
  },
  {
    name: "hyphen compound names",
    content: `i:
  is a semantic-prime
  has category substantives
  word-meanings:
    oewn_14665575_n:
      is-defined-as "a nonmetallic element"`
  },
  {
    name: "nested without id colon",
    content: `i:
  is a semantic prime
  has category substantives
  word meanings
    oewn_14665575_n:
      is defined as "a nonmetallic element"`
  },
  {
    name: "all children without colons",
    content: `i:
  is a semantic prime
  has category substantives
  word meanings
    oewn_14665575_n
      is defined as "a nonmetallic element"
      part of speech noun
      interlingual index i113951`
  },
  {
    name: "user format proposal",
    content: `i:
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
      ili i109093`
  },
  {
    name: "flat structure proposal",
    content: `i:
  is a semantic prime
  has category substantives
  alternative lexical form me
  oewn_14665575_n
    is defined as "a nonmetallic element..."
    part of speech noun
    interlingual index i113951
  oewn_13764713_n
    is defined as "the smallest whole number..."
    part of speech noun
    interlingual index i109093`
  }
];

for (const test of testCases) {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`Testing: ${test.name}`);
  console.log("=".repeat(60));
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
