# Semantic Primes from WordNet

This directory contains scripts to extract and discover semantic primes from Open English WordNet.

## Project Structure

```
word-net/
├── scripts/              # Production scripts (used repeatedly)
│   ├── download.mjs           # Download WordNet XML data
│   ├── convert-wordnet-to-lino.mjs  # Convert XML to Links Notation
│   ├── extract-nsm-primes.mjs       # Extract NSM primes
│   ├── discover-semantic-primes.mjs # Discover primes algorithmically
│   └── semantic-primes.mjs          # NSM primes definitions module
├── examples/             # Example scripts demonstrating use-m pattern
│   └── parse-lino-with-use-m.mjs    # Example: parse .lino files with use-m
├── experiments/          # Development experiments (kept for code reuse)
│   ├── analyze-entity.mjs     # Analyze why specific words are primes
│   └── trace-circularity.mjs  # Trace definition chain circularity
├── tests/                # Test scripts
│   └── test-discovery.mjs     # Verify discovery works correctly
├── data/                 # Output data files (.lino only)
│   ├── discovered-primes.lino      # Algorithmically discovered primes
│   ├── nsm-primes.lino             # NSM primes with WordNet mappings
│   └── wordnet-source.lino         # Converted WordNet source data
└── README.md
```

## What are Semantic Primes?

A **semantic prime** is a word that is **primitive** - the most basic linguistic concept that cannot be defined using simpler terms without circular reference.

If we trace the definition chain of any word deep enough, we eventually hit words that can only be defined using each other (circular dependencies). These words form the foundation of all definitions and are semantic primes.

This project provides two approaches to semantic primes:

### 1. NSM Primes (Pre-defined)
The 65 semantic primes identified by Anna Wierzbicka's Natural Semantic Metalanguage (NSM) theory, based on decades of linguistic research.

### 2. Discovered Primes (Algorithmic)
Semantic primes discovered algorithmically by analyzing WordNet definition chains using Tarjan's algorithm to find Strongly Connected Components (SCCs). Words in the same SCC can all reach each other through definition chains, forming mutual circular dependencies.

Key findings:
- **19,084 words** discovered as semantic primes
- **15,527 words** form a single large interconnected SCC (including "entity", "thing", "time", "body", etc.)
- Words like "entity", "existence", "thing" are correctly identified as fundamental primes

This allows comparison between theoretically-derived primes (NSM) and algorithmically-discovered primes.

## Data Source

[Open English WordNet 2024](https://en-word.net/) (OEWN), released under CC BY 4.0 license.

## Prerequisites

- Node.js 18+

## No Package Manager Required

This project **does not use package.json or npm**. All main scripts use only Node.js built-in modules.

For optional functionality like parsing .lino files, we provide examples using [use-m](https://github.com/link-foundation/use-m) to dynamically load packages at runtime without any installation step.

## Usage

### Download WordNet Data

Downloads the Open English WordNet 2024 XML file:

```bash
node scripts/download.mjs
```

This creates `data/english-wordnet-2024.xml` (~100MB uncompressed). The XML file is gitignored.

### Convert to Links Notation

Converts the WordNet XML to Links Notation format (source data):

```bash
node scripts/convert-wordnet-to-lino.mjs
```

Creates `data/wordnet-source.lino` (~38MB) - full WordNet in Links Notation format.

### Extract NSM Primes

Extracts entries matching the 65 NSM semantic primes:

```bash
node scripts/extract-nsm-primes.mjs
```

Creates `data/nsm-primes.lino` - NSM primes in Links Notation format.

### Discover Semantic Primes Algorithmically

Analyzes definition chains to find primitive words:

```bash
node scripts/discover-semantic-primes.mjs
```

Creates `data/discovered-primes.lino` - Algorithmically discovered primes.

### Run Tests

Verifies that key words (entity, thing, time, etc.) are discovered:

```bash
node tests/test-all.mjs
```

### Run All Steps

```bash
node scripts/download.mjs && \
node scripts/convert-wordnet-to-lino.mjs && \
node scripts/extract-nsm-primes.mjs && \
node scripts/discover-semantic-primes.mjs && \
node tests/test-all.mjs
```

## Example: Using use-m to Parse Links Notation

The `examples/` directory demonstrates how to use [use-m](https://github.com/link-foundation/use-m) to dynamically load npm packages without package.json:

```bash
node examples/parse-lino-with-use-m.mjs [input-file.lino]
```

This example shows how to:
- Load the `links-notation` package at runtime using use-m
- Parse .lino files back into structured data
- Work without any `npm install` or `package.json`

**How it works:**

The use-m pattern allows dynamic loading of npm packages:

```javascript
// Load use-m (works in Node.js, browsers, Deno, Bun)
const { use } = eval(await (await fetch('https://unpkg.com/use-m/use.js')).text());

// Dynamically import any npm package - no installation needed!
const linoModule = await use('links-notation');
const LinoParser = linoModule.Parser;

// Use the package normally
const parser = new LinoParser();
const result = parser.parse(linksNotationContent);
```

This approach eliminates the need for:
- ✗ package.json
- ✗ npm install
- ✗ node_modules directory

Perfect for self-contained scripts and cross-platform code!

## Output Format

All output uses [Links Notation](https://github.com/link-foundation/links-notation) format (.lino).
Only .lino files are stored in the data folder - no JSON.

### NSM Primes Example
```lino
(good isa semantic_prime)
(good category evaluators)
(good wordnet_synset oewn_01128305_a)
(oewn_01128305_a definition "having desirable or positive qualities")
```

### Discovered Primes Example
```lino
(entity isa discovered_semantic_prime)
(entity prime_score 99.1)
(entity in_circular_definition true)
(entity scc_size 15527)
(entity reference_count 58)
(entity definition "that which is perceived or known or inferred to have its own distinct existence")
(entity pos n)
(entity scc_sample "entity, thing, time, body, form, work, make, ...")
```

## Algorithm

The discovery algorithm uses **Tarjan's algorithm** to find Strongly Connected Components (SCCs) in the word dependency graph:

1. **Build Graph**: Each word points to words used in its definition
2. **Find SCCs**: Words in the same SCC can reach each other through definition chains
3. **Identify Primes**: Words in SCCs of size > 1, or words with self-loops, are semantic primes

This is based on the literal definition of semantic primes: words that cannot be defined without circular reference.

## NSM Prime Categories

The 65 NSM primes are organized into:

1. **Substantives**: I, YOU, SOMEONE, PEOPLE, SOMETHING/THING, BODY
2. **Relational Substantives**: KIND, PART
3. **Determiners**: THIS, THE SAME, OTHER/ELSE
4. **Quantifiers**: ONE, TWO, SOME, ALL, MUCH/MANY, LITTLE/FEW
5. **Evaluators**: GOOD, BAD
6. **Descriptors**: BIG, SMALL
7. **Mental Predicates**: THINK, KNOW, WANT, FEEL, SEE, HEAR
8. **Speech**: SAY, WORDS, TRUE
9. **Actions/Events/Movement**: DO, HAPPEN, MOVE
10. **Location/Existence**: BE (SOMEWHERE), THERE IS, BE (SOMEONE/SOMETHING)
11. **Possession**: (IS) MINE
12. **Life and Death**: LIVE, DIE
13. **Time**: WHEN/TIME, NOW, BEFORE, AFTER, A LONG TIME, A SHORT TIME, FOR SOME TIME, MOMENT
14. **Space**: WHERE/PLACE, HERE, ABOVE, BELOW, FAR, NEAR, SIDE, INSIDE, TOUCH
15. **Logical Concepts**: NOT, MAYBE, CAN, BECAUSE, IF
16. **Intensifier/Augmentor**: VERY, MORE
17. **Similarity**: LIKE/AS/WAY

## Comparing NSM and Discovered Primes

Interesting findings from algorithmic discovery:
- Many NSM primes (TIME, BODY, THING, etc.) are in the large discovered SCC
- The algorithm validates NSM theory: theoretical primes are also algorithmically primitive
- Some NSM primes may have well-defined non-circular definitions in WordNet

## References

- Wierzbicka, A. (1996). *Semantics: Primes and universals*. Oxford University Press.
- [Natural Semantic Metalanguage](https://en.wikipedia.org/wiki/Natural_semantic_metalanguage) (Wikipedia)
- [Open English WordNet](https://en-word.net/)
- [Links Notation](https://github.com/link-foundation/links-notation)
- [Tarjan's Algorithm](https://en.wikipedia.org/wiki/Tarjan%27s_strongly_connected_components_algorithm) for finding SCCs

## License

Scripts: Unlicense. WordNet data: CC BY 4.0.
