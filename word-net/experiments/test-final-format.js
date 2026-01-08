const { Parser } = require('links-notation');

const parser = new Parser();

// Design a format that works with the parser limitations
// Requirements:
// 1. Use : only for unique entity IDs (the semantic primes, synset IDs)
// 2. Use natural language for properties
// 3. Max 2 levels of indentation from an ID:
// 4. Decode abbreviations to plain English

const format = `i:
  is a semantic prime
  has category substantives
  has alternative form me
  has word meaning oewn_14665575_n
  has word meaning oewn_13764713_n

oewn_14665575_n:
  is defined as "a nonmetallic element belonging to the halogens"
  has part of speech noun
  has interlingual index i113951

oewn_13764713_n:
  is defined as "the smallest whole number or a numeral representing this number"
  has part of speech noun
  has interlingual index i109093

you:
  is a semantic prime
  has category substantives

someone:
  is a semantic prime
  has category substantives
  has alternative form person
  has word meaning oewn_00007846_n

oewn_00007846_n:
  is defined as "a human being"
  has part of speech noun
  has interlingual index i35562`;

console.log("Testing final format design:\n");
console.log(format);
console.log("\n");

try {
  const result = parser.parse(format);
  console.log("Parsed successfully!");
  console.log("Total entries:", result.length);
  console.log("\nParsed structure:");
  console.log(JSON.stringify(result, null, 2));
} catch (e) {
  console.log("ERROR:", e.message);
}
