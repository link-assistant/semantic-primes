# Semantic Primes from WordNet

This directory contains scripts to extract and discover semantic primes from Open English WordNet.

## What are Semantic Primes?

A **semantic prime** is a word that is **primitive** - the most basic linguistic concept that cannot be defined using simpler terms without circular reference.

This project provides two approaches to semantic primes:

### 1. NSM Primes (Pre-defined)
The 65 semantic primes identified by Anna Wierzbicka's Natural Semantic Metalanguage (NSM) theory, based on decades of linguistic research.

### 2. Discovered Primes (Algorithmic)
Semantic primes discovered algorithmically by analyzing WordNet definition chains to find words that:
- **Self-reference**: Appear in their own definitions
- **Circular reference**: Form definition loops (A defines B, B defines A)
- **High reference count**: Used frequently in other definitions

This allows comparison between theoretically-derived primes (NSM) and algorithmically-discovered primes.

## Data Source

[Open English WordNet 2024](https://en-word.net/) (OEWN), released under CC BY 4.0 license.

## Prerequisites

- Node.js 18+
- npm

## Installation

```bash
cd word-net
npm install
```

## Usage

### Download WordNet Data

Downloads the Open English WordNet 2024 XML file:

```bash
npm run download
```

This creates `data/english-wordnet-2024.xml` (~150MB uncompressed).

### Extract NSM Primes

Extracts entries matching the 65 NSM semantic primes:

```bash
npm run extract-nsm
```

Creates:
- `data/nsm-primes.lino` - NSM primes in Links Notation format
- `data/nsm-primes.json` - NSM primes in JSON format

### Discover Semantic Primes Algorithmically

Analyzes definition chains to find primitive words:

```bash
npm run discover
```

Creates:
- `data/discovered-primes.lino` - Discovered primes in Links Notation format
- `data/discovered-primes.json` - Discovered primes in JSON format

### Run All Steps

```bash
npm run all
```

## Output Format

Output uses [Links Notation](https://github.com/link-foundation/links-notation) format (.lino).

### NSM Primes Example
```lino
(good isa semantic_prime)
(good category evaluators)
(good wordnet_synset oewn_01128305_a)
(oewn_01128305_a definition "having desirable or positive qualities")
```

### Discovered Primes Example
```lino
(time isa discovered_semantic_prime)
(time prime_score 151.2)
(time reference_count 1195)
(time has_self_reference true)
(time has_circular_reference true)
(time definition "the continuum of experience in which events pass...")
```

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
- Many NSM primes (TIME, BODY, MAKE, etc.) also rank highly in algorithmic discovery
- Some algorithmically-discovered primes suggest WordNet has well-defined composite definitions for certain concepts
- Words with both high reference counts AND circular references are strong candidates for semantic primitiveness

## References

- Wierzbicka, A. (1996). *Semantics: Primes and universals*. Oxford University Press.
- [Natural Semantic Metalanguage](https://en.wikipedia.org/wiki/Natural_semantic_metalanguage) (Wikipedia)
- [Open English WordNet](https://en-word.net/)
- [Links Notation](https://github.com/link-foundation/links-notation)

## License

Scripts: Unlicense. WordNet data: CC BY 4.0.
