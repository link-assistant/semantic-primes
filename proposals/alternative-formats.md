# Alternative Compact Formats for NSM Primes in Links Notation

This document proposes 10 different ways to organize the NSM primes data for better human readability while remaining valid Links Notation.

## Current Format Analysis

The current `nsm-primes.lino` uses individual triplets for each piece of data:

```lino
(i isa semantic_prime)
(i category substantives)
(me allolex_of i)
(i wordnet_synset oewn_14665575_n)
(oewn_14665575_n definition "a nonmetallic element...")
(oewn_14665575_n pos n)
(oewn_14665575_n ili "i113951")
```

**Issues**: Verbose, many repeated references, synset details disconnected from the prime.

---

## Proposal 1: Nested Grouping by Prime

Group all information about a prime using nested parentheses:

```lino
// === Substantives ===

(i
  (isa semantic_prime)
  (category substantives)
  (allolex me)
  (synsets
    (oewn_14665575_n (def "a nonmetallic element...") (pos n) (ili i113951))
    (oewn_13764713_n (def "the smallest whole number...") (pos n) (ili i109093))
    (oewn_06845083_n (def "the 9th letter of the Roman alphabet") (pos n) (ili i72394))))

(you
  (isa semantic_prime)
  (category substantives))

(someone
  (isa semantic_prime)
  (category substantives)
  (allolex person)
  (synsets
    (oewn_00007846_n (def "a human being...") (pos n) (ili i35562))))
```

**Pros**: All info about a prime is visually grouped together. Clear hierarchy.
**Cons**: Deep nesting may be harder to parse for some tools.

---

## Proposal 2: Indentation-Based Hierarchy

Use indentation instead of nested parentheses:

```lino
// === Substantives ===

i:
  isa semantic_prime
  category substantives
  allolex me
  synsets:
    oewn_14665575_n:
      definition "a nonmetallic element..."
      pos n
      ili i113951
    oewn_13764713_n:
      definition "the smallest whole number..."
      pos n
      ili i109093

you:
  isa semantic_prime
  category substantives

someone:
  isa semantic_prime
  category substantives
  allolex person
  synsets:
    oewn_00007846_n:
      definition "a human being..."
      pos n
      ili i35562
```

**Pros**: Very clean and human-readable. Similar to YAML. Minimal punctuation.
**Cons**: Whitespace-sensitive, may be less precise.

---

## Proposal 3: Inline Compact with Semicolons

Use inline format with implied structure and semicolons for separation:

```lino
// === Substantives ===

(i; semantic_prime; substantives; allolex:me
  oewn_14665575_n "a nonmetallic element..." n i113951
  oewn_13764713_n "the smallest whole number..." n i109093
  oewn_06845083_n "the 9th letter of the Roman alphabet" n i72394)

(you; semantic_prime; substantives)

(someone; semantic_prime; substantives; allolex:person
  oewn_00007846_n "a human being..." n i35562)

(people; semantic_prime; substantives
  oewn_07958392_n "(plural) any group of human beings..." n i79059
  oewn_08177175_n "the body of citizens of a state..." n i80034)
```

**Pros**: Very compact. Related info on same or nearby lines.
**Cons**: Less explicit structure, relies on position.

---

## Proposal 4: Table-Like Format with Headers

Group primes by category with tabular layout:

```lino
// CATEGORY: substantives
// COLUMNS: prime | allolex | synset | definition | pos | ili

i       | me     | oewn_14665575_n | "a nonmetallic element..." | n | i113951
i       | me     | oewn_13764713_n | "the smallest whole number..." | n | i109093
you     | -      | -               | -                           | - | -
someone | person | oewn_00007846_n | "a human being..."         | n | i35562
people  | -      | oewn_07958392_n | "(plural) any group..."     | n | i79059

// CATEGORY: relationalSubstantives

kind    | sort   | oewn_01374976_a | "having or showing tender..." | a | i7477
part    | -      | oewn_13831419_n | "something determined..."     | n | i109475
```

**Pros**: Excellent for scanning and comparison. Compact.
**Cons**: Less flexible, requires consistent columns.

---

## Proposal 5: Semantic Shorthand Notation

Define shorthand patterns for common structures:

```lino
// Prime definition shorthand: @prime[category]{allolex}
// Synset shorthand: #synset_id "definition" :pos :ili

@i[substantives]{me}
  #oewn_14665575_n "a nonmetallic element..." :n :i113951
  #oewn_13764713_n "the smallest whole number..." :n :i109093
  #oewn_06845083_n "the 9th letter of the Roman alphabet" :n :i72394

@you[substantives]

@someone[substantives]{person}
  #oewn_00007846_n "a human being..." :n :i35562

@people[substantives]
  #oewn_07958392_n "(plural) any group of human beings..." :n :i79059
  #oewn_08177175_n "the body of citizens of a state..." :n :i80034
```

**Pros**: Very compact, semantic meaning clear from symbols.
**Cons**: Requires learning new symbols.

---

## Proposal 6: Multi-line Triplet Chains

Keep triplets but chain related ones with continuation:

```lino
// === Substantives ===

(i isa semantic_prime) ->
  (category substantives) ->
  (allolex me) ->
  (wordnet_synset oewn_14665575_n) ->
    (definition "a nonmetallic element...") ->
    (pos n) ->
    (ili i113951)

(you isa semantic_prime) ->
  (category substantives)

(someone isa semantic_prime) ->
  (category substantives) ->
  (allolex person) ->
  (wordnet_synset oewn_00007846_n) ->
    (definition "a human being...") ->
    (pos n) ->
    (ili i35562)
```

**Pros**: Shows relationships explicitly. Each statement is complete.
**Cons**: Still somewhat verbose.

---

## Proposal 7: Category Blocks with Prime Lists

Organize by category first, list primes within:

```lino
(substantives contains
  (i (allolex me)
     (synsets oewn_14665575_n oewn_13764713_n oewn_06845083_n))
  (you)
  (someone (allolex person)
           (synsets oewn_00007846_n))
  (people (synsets oewn_07958392_n oewn_08177175_n))
  (something (allolex thing)
             (synsets oewn_13967020_n oewn_00034778_n))
  (body (synsets oewn_05223633_n oewn_07981699_n)))

(relationalSubstantives contains
  (kind (allolex sort) (synsets oewn_01374976_a oewn_05847533_n))
  (part (synsets oewn_13831419_n oewn_03898588_n)))

// Synset definitions (separate section for lookup)
(synset_definitions
  (oewn_14665575_n "a nonmetallic element..." n i113951)
  (oewn_13764713_n "the smallest whole number..." n i109093)
  ...)
```

**Pros**: Primes clearly organized by semantic category. Compact prime listings.
**Cons**: Synset details separated from primes.

---

## Proposal 8: Labeled Blocks with Inline Details

Use labeled blocks with inline details:

```lino
substantives:
  i: semantic_prime (allolex me)
    - oewn_14665575_n: "a nonmetallic element..." [n, i113951]
    - oewn_13764713_n: "the smallest whole number..." [n, i109093]

  you: semantic_prime

  someone: semantic_prime (allolex person)
    - oewn_00007846_n: "a human being..." [n, i35562]

  people: semantic_prime
    - oewn_07958392_n: "(plural) any group..." [n, i79059]
    - oewn_08177175_n: "the body of citizens..." [n, i80034]

relationalSubstantives:
  kind: semantic_prime (allolex sort)
    - oewn_01374976_a: "having or showing tender..." [a, i7477]

  part: semantic_prime
    - oewn_13831419_n: "something determined..." [n, i109475]
```

**Pros**: Combines indentation with inline details. Very readable.
**Cons**: Mixed notation styles.

---

## Proposal 9: Record-Style with Field Names

Use explicit field names in a record-like structure:

```lino
(prime i
  type semantic_prime
  category substantives
  allolex me
  synsets (
    (id oewn_14665575_n def "a nonmetallic element..." pos n ili i113951)
    (id oewn_13764713_n def "the smallest whole number..." pos n ili i109093)
    (id oewn_06845083_n def "the 9th letter of the Roman alphabet" pos n ili i72394)
  ))

(prime you
  type semantic_prime
  category substantives)

(prime someone
  type semantic_prime
  category substantives
  allolex person
  synsets (
    (id oewn_00007846_n def "a human being..." pos n ili i35562)
  ))
```

**Pros**: Self-documenting field names. Unambiguous.
**Cons**: More verbose than some alternatives.

---

## Proposal 10: Minimal Notation with Implicit Structure

Assume common structure, only note exceptions:

```lino
// All entries are semantic primes
// Format: prime [category] {allolex} synset:"definition"

// === Substantives ===
i [substantives] {me}
  oewn_14665575_n:"a nonmetallic element..."
  oewn_13764713_n:"the smallest whole number..."
  oewn_06845083_n:"the 9th letter of the Roman alphabet"

you [substantives]

someone [substantives] {person}
  oewn_00007846_n:"a human being..."

people [substantives]
  oewn_07958392_n:"(plural) any group of human beings..."
  oewn_08177175_n:"the body of citizens of a state..."

// === Relational Substantives ===
kind [relationalSubstantives] {sort}
  oewn_01374976_a:"having or showing tender..."

part [relationalSubstantives]
  oewn_13831419_n:"something determined in relation..."
```

**Pros**: Extremely compact. Focuses on essential data.
**Cons**: Requires understanding conventions. Less explicit.

---

## Comparison Summary

| Proposal | Compactness | Readability | Explicit Structure | Valid Lino |
|----------|-------------|-------------|-------------------|------------|
| 1. Nested Grouping | Medium | High | High | Yes |
| 2. Indentation-Based | High | Very High | Medium | Yes |
| 3. Inline Compact | Very High | Medium | Low | Partial* |
| 4. Table-Like | Very High | High | Medium | Partial* |
| 5. Semantic Shorthand | Very High | Medium | Medium | Partial* |
| 6. Triplet Chains | Low | Medium | High | Yes |
| 7. Category Blocks | High | High | High | Yes |
| 8. Labeled Blocks | High | Very High | Medium | Yes |
| 9. Record-Style | Medium | High | Very High | Yes |
| 10. Minimal Notation | Very High | High | Low | Yes |

\* May require extensions to standard Links Notation parsing

---

## Recommendation

For best balance of human readability and valid Links Notation:

- **Proposal 2 (Indentation-Based)** - If the parser supports indentation-based grouping
- **Proposal 1 (Nested Grouping)** - For standard nested parentheses structure
- **Proposal 7 (Category Blocks)** - For category-first organization
- **Proposal 9 (Record-Style)** - For maximum clarity and self-documentation

The choice depends on:
1. Whether compactness or readability is prioritized
2. Which parsers need to consume the data
3. Whether the data will be manually edited frequently
