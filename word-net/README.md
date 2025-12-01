# Semantic Primes Extraction from WordNet

This directory contains scripts to download Open English WordNet data and extract semantic primes from it.

## What are Semantic Primes?

Semantic primes are the fundamental, universal building blocks of meaning identified by Anna Wierzbicka's Natural Semantic Metalanguage (NSM) theory. There are approximately 65 semantic primes that are believed to exist in all human languages.

Reference: Wierzbicka, A. (1996). *Semantics: Primes and universals*. Oxford, UK: Oxford University Press.

## Data Source

This project uses the [Open English WordNet 2024](https://en-word.net/) (OEWN), released under CC BY 4.0 license.

## Prerequisites

- Node.js 18+
- npm

## Installation

```bash
cd word-net
npm install
```

## Usage

### 1. Download WordNet Data

Downloads the Open English WordNet 2024 XML file:

```bash
npm run download
```

This creates `data/english-wordnet-2024.xml` (~150MB uncompressed).

### 2. Extract Semantic Primes

Parses WordNet and extracts entries matching semantic primes:

```bash
npm run extract
```

This creates:
- `data/semantic-primes.lino` - Results in Links Notation format
- `data/semantic-primes.json` - Results in JSON format for reference

### 3. Run Both Steps

```bash
npm run all
```

## Output Format

The output is in [Links Notation](https://github.com/link-foundation/links-notation) format (.lino), which represents data using references and links.

Example output:
```lino
(good isa semantic_prime)
(good category evaluators)
(good wordnet_synset oewn_01128305_a)
(oewn_01128305_a definition "having desirable or positive qualities")
(oewn_01128305_a pos a)
(oewn_01128305_a ili "i7584")
```

## Categories of Semantic Primes

The 65 semantic primes are organized into the following categories:

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

Note: Some primes (like "YOU", "THIS") are function words not included in WordNet, which focuses on content words (nouns, verbs, adjectives, adverbs).

## Dependencies

- [links-notation](https://www.npmjs.com/package/links-notation) - Links Notation parser for JavaScript

## License

The extraction scripts are released under the Unlicense. The WordNet data is released under CC BY 4.0.
