const { Parser } = require('links-notation');

const parser = new Parser();

const tests = [
  {
    name: "Colon inside quotes",
    content: `(test definition "this has: a colon")`
  },
  {
    name: "Comment line with colon",
    content: `// Reference: Wierzbicka, A. (1996). Semantics: Primes and universals.`
  },
  {
    name: "Both together",
    content: `// Reference: Wierzbicka, A. (1996). Semantics: Primes and universals.

(test definition "this has: a colon")`
  },
  {
    name: "Trailing colon in quotes",
    content: `(oewn_02076350_s definition "being the exact same one; not any other:")`
  }
];

for (const test of tests) {
  console.log(`\n=== ${test.name} ===`);
  console.log(test.content);
  try {
    const result = parser.parse(test.content);
    console.log("OK - Parsed successfully");
    console.log(JSON.stringify(result, null, 2));
  } catch (e) {
    console.log("ERROR:", e.message);
  }
}
