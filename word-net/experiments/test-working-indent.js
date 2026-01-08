const { Parser } = require('links-notation');

const parser = new Parser();

// Test what DOES work with indentation
const tests = [
  {
    name: "Two level indent with refs only",
    content: `root:
  child1
  child2`
  },
  {
    name: "Two level with space-separated refs",
    content: `root:
  child1 val1
  child2 val2`
  },
  {
    name: "Immediate child with colon, then refs",
    content: `root:
  child1:
    grandchild1
    grandchild2`
  },
  {
    name: "Child without colon then deeper indent",
    content: `root:
  child1
    grandchild1
    grandchild2`
  },
  {
    name: "Immediate child as ref, then another child with colon",
    content: `root:
  child1 val1
  child2:
    grandchild1`
  },
  {
    name: "What if first line under root is a ref chain, then an id with colon",
    content: `root:
  prop1 value1
  nested:
    deep value`
  },
  {
    name: "Deep nesting without any colons after root",
    content: `root:
  level1
    level2
      level3
        level4`
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
