#!/usr/bin/env node

/**
 * Discover Semantic Primes Algorithmically from WordNet
 *
 * This script analyzes WordNet definitions to find semantic primes -
 * words that are primitive and cannot be defined using simpler terms.
 *
 * A semantic prime is identified by:
 * 1. Circular reference: A word's definition chain leads back to itself
 * 2. Self-reference: A word appears directly in its own definition
 * 3. High reference count: Words that are used frequently in definitions
 *
 * Usage: node discover-semantic-primes.mjs
 *
 * Requirements: Run download.mjs first to get the WordNet data.
 */

import { createReadStream, existsSync, writeFileSync } from 'fs';
import { createInterface } from 'readline';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const DATA_DIR = path.join(__dirname, 'data');
const WORDNET_FILE = path.join(DATA_DIR, 'english-wordnet-2024.xml');
const OUTPUT_FILE = path.join(DATA_DIR, 'discovered-primes.lino');
const OUTPUT_JSON = path.join(DATA_DIR, 'discovered-primes.json');

// Verbose logging flag (set via environment variable)
const VERBOSE = process.env.VERBOSE === 'true';

// Minimum occurrences in definitions to be considered
const MIN_REFERENCE_COUNT = 100;

// Maximum depth for circular reference detection
const MAX_TRACE_DEPTH = 5;

function log(...args) {
  if (VERBOSE) {
    console.log('[DEBUG]', ...args);
  }
}

/**
 * Common English stop words to exclude from analysis.
 */
const STOP_WORDS = new Set([
  'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
  'may', 'might', 'must', 'shall', 'can', 'need', 'dare', 'ought', 'used',
  'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'up', 'about',
  'into', 'over', 'after', 'and', 'but', 'or', 'if', 'as', 'that', 'which',
  'what', 'when', 'where', 'who', 'whom', 'this', 'these', 'those', 'such',
  'it', 'its', 'itself', 'they', 'their', 'them', 'we', 'our', 'us',
  'he', 'his', 'him', 'she', 'her', 'hers', 'you', 'your', 'yours',
  'i', 'me', 'my', 'mine', 'myself',
  'not', 'no', 'nor', 'so', 'than', 'too', 'very', 'just', 'only',
  'also', 'even', 'still', 'already', 'always', 'never', 'ever', 'often',
  'any', 'all', 'each', 'every', 'both', 'few', 'more', 'most', 'other',
  'some', 'one', 'two', 'first', 'new', 'now', 'way', 'well', 'then',
  'usually', 'especially', 'particularly', 'generally', 'typically',
  'sometimes', 'followed', 'something', 'someone', 'anything', 'anyone',
]);

/**
 * Decode XML entities.
 */
function decodeXmlEntities(str) {
  return str
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

/**
 * Extract content words from a definition.
 */
function extractContentWords(definition) {
  const words = definition.toLowerCase()
    .replace(/[^a-zA-Z\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2)
    .filter(w => !STOP_WORDS.has(w));
  return [...new Set(words)];
}

/**
 * Parse WordNet XML in a single pass - memory efficient approach.
 */
async function parseWordNet(filePath) {
  console.log('Parsing WordNet XML...');

  const lemmaToDefinitions = new Map();  // lemma -> [definitions]
  const definitionWordCounts = new Map(); // word -> count in definitions
  const selfReferences = new Set();       // lemmas that appear in own definitions

  const fileStream = createReadStream(filePath);
  const rl = createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  let currentEntry = null;
  let currentSynset = null;
  let inDefinition = false;
  let definitionText = '';

  // Temporary storage for synset -> lemmas mapping
  const synsetToLemmas = new Map();
  const synsetDefinitions = new Map();

  let lineCount = 0;

  for await (const line of rl) {
    lineCount++;

    // Parse LexicalEntry
    const entryMatch = line.match(/<LexicalEntry\s+id="([^"]+)"/);
    if (entryMatch) {
      currentEntry = { lemmas: [], synsets: [] };
    }

    // Parse Lemma
    const lemmaMatch = line.match(/<Lemma\s+([^>]+)/);
    if (lemmaMatch && currentEntry) {
      const attrs = lemmaMatch[1];
      const formMatch = attrs.match(/writtenForm="([^"]+)"/);
      if (formMatch) {
        currentEntry.lemmas.push(decodeXmlEntities(formMatch[1]).toLowerCase());
      }
    }

    // Parse Sense
    const senseMatch = line.match(/<Sense\s+([^>]+)/);
    if (senseMatch && currentEntry) {
      const attrs = senseMatch[1];
      const synsetMatch = attrs.match(/synset="([^"]+)"/);
      if (synsetMatch) {
        currentEntry.synsets.push(synsetMatch[1]);
      }
    }

    // End of LexicalEntry
    if (line.includes('</LexicalEntry>') && currentEntry) {
      for (const synsetId of currentEntry.synsets) {
        if (!synsetToLemmas.has(synsetId)) {
          synsetToLemmas.set(synsetId, new Set());
        }
        for (const lemma of currentEntry.lemmas) {
          synsetToLemmas.get(synsetId).add(lemma);
        }
      }
      currentEntry = null;
    }

    // Parse Synset
    const synsetMatch = line.match(/<Synset\s+([^>]+)>/);
    if (synsetMatch) {
      const attrs = synsetMatch[1];
      const idMatch = attrs.match(/id="([^"]+)"/);
      const posMatch = attrs.match(/partOfSpeech="([^"]+)"/);
      if (idMatch) {
        currentSynset = {
          id: idMatch[1],
          partOfSpeech: posMatch ? posMatch[1] : '',
          definitions: [],
        };
      }
    }

    // Parse Definition
    if (line.includes('<Definition')) {
      inDefinition = true;
      definitionText = '';
      const defMatch = line.match(/<Definition[^>]*>([^<]*)<\/Definition>/);
      if (defMatch) {
        definitionText = decodeXmlEntities(defMatch[1]);
        inDefinition = false;
        if (currentSynset) {
          currentSynset.definitions.push(definitionText);
        }
      } else {
        const startMatch = line.match(/<Definition[^>]*>([^<]*)/);
        if (startMatch) {
          definitionText = decodeXmlEntities(startMatch[1]);
        }
      }
    } else if (inDefinition) {
      const endMatch = line.match(/([^<]*)<\/Definition>/);
      if (endMatch) {
        definitionText += decodeXmlEntities(endMatch[1]);
        inDefinition = false;
        if (currentSynset) {
          currentSynset.definitions.push(definitionText);
        }
      } else {
        definitionText += decodeXmlEntities(line);
      }
    }

    // End of Synset
    if (line.includes('</Synset>') && currentSynset) {
      if (currentSynset.definitions.length > 0) {
        synsetDefinitions.set(currentSynset.id, {
          definitions: currentSynset.definitions,
          partOfSpeech: currentSynset.partOfSpeech,
        });
      }
      currentSynset = null;
    }

    if (lineCount % 200000 === 0) {
      console.log(`  Parsed ${lineCount} lines...`);
    }
  }

  console.log(`  Total lines: ${lineCount}`);
  console.log(`  Synsets with definitions: ${synsetDefinitions.size}`);

  // Phase 2: Build lemma -> definitions mapping and count word usage
  console.log('\nBuilding word reference counts...');

  for (const [synsetId, data] of synsetDefinitions) {
    const lemmas = synsetToLemmas.get(synsetId) || new Set();

    for (const definition of data.definitions) {
      const contentWords = extractContentWords(definition);

      // Store definitions by lemma
      for (const lemma of lemmas) {
        if (!lemmaToDefinitions.has(lemma)) {
          lemmaToDefinitions.set(lemma, []);
        }
        lemmaToDefinitions.get(lemma).push({
          definition,
          partOfSpeech: data.partOfSpeech,
          synsetId,
        });

        // Check for self-reference
        if (contentWords.includes(lemma)) {
          selfReferences.add(lemma);
        }
      }

      // Count word occurrences in definitions
      for (const word of contentWords) {
        definitionWordCounts.set(word, (definitionWordCounts.get(word) || 0) + 1);
      }
    }
  }

  console.log(`  Unique lemmas: ${lemmaToDefinitions.size}`);
  console.log(`  Self-references found: ${selfReferences.size}`);

  // Free up memory
  synsetToLemmas.clear();

  return {
    lemmaToDefinitions,
    definitionWordCounts,
    selfReferences,
    synsetDefinitions,
  };
}

/**
 * Find circular references for high-frequency words.
 */
function findCircularReferences(lemmaToDefinitions, candidates) {
  console.log('\nSearching for circular references...');

  const circularRefs = new Map();
  let processed = 0;

  for (const candidate of candidates) {
    const word = candidate.word;
    const definitions = lemmaToDefinitions.get(word) || [];

    for (const { definition } of definitions) {
      const contentWords = extractContentWords(definition);

      // Check each word in the definition
      for (const defWord of contentWords) {
        if (defWord === word) continue; // Skip self-reference (already tracked)

        // Check if defWord's definitions refer back to word
        const defWordDefs = lemmaToDefinitions.get(defWord) || [];
        for (const { definition: subDef } of defWordDefs) {
          const subWords = extractContentWords(subDef);
          if (subWords.includes(word)) {
            if (!circularRefs.has(word)) {
              circularRefs.set(word, []);
            }
            circularRefs.get(word).push({
              intermediateWord: defWord,
              depth: 2,
            });
            break;
          }

          // Check one more level deep (depth 3)
          for (const subWord of subWords) {
            if (subWord === word || subWord === defWord) continue;
            const subSubDefs = lemmaToDefinitions.get(subWord) || [];
            for (const { definition: subSubDef } of subSubDefs) {
              if (extractContentWords(subSubDef).includes(word)) {
                if (!circularRefs.has(word)) {
                  circularRefs.set(word, []);
                }
                circularRefs.get(word).push({
                  path: [defWord, subWord],
                  depth: 3,
                });
                break;
              }
            }
          }
        }
      }
    }

    processed++;
    if (processed % 100 === 0) {
      console.log(`  Processed ${processed}/${candidates.length} candidates...`);
    }
  }

  console.log(`  Words with circular references: ${circularRefs.size}`);
  return circularRefs;
}

/**
 * Escape special characters for Links Notation strings.
 */
function escapeForLino(str) {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r');
}

/**
 * Calculate prime score for a word.
 */
function calculatePrimeScore(word, refCount, isSelfRef, circularRefs) {
  let score = 0;

  // Reference count (log scale)
  score += Math.log10(refCount) * 15;

  // Self-reference
  if (isSelfRef) {
    score += 40;
  }

  // Circular references
  if (circularRefs) {
    score += 20;
    // Shorter circular paths are more significant
    const shortestDepth = Math.min(...circularRefs.map(r => r.depth));
    score += (5 - shortestDepth) * 10;
  }

  // Short words are often more primitive
  if (word.length <= 4) {
    score += 15;
  } else if (word.length <= 6) {
    score += 5;
  }

  return score;
}

/**
 * Convert candidates to Links Notation format.
 */
function toLinksNotation(candidates) {
  const lines = [];

  lines.push('// Semantic Primes discovered algorithmically from Open English WordNet 2024');
  lines.push('// Method: Definition chain analysis - finding circular and self-references');
  lines.push('// A semantic prime is a word that cannot be defined without eventually');
  lines.push('// referring back to itself (directly or through other words)');
  lines.push(`// Generated: ${new Date().toISOString()}`);
  lines.push('');
  lines.push(`// Total prime candidates: ${candidates.length}`);
  lines.push('');

  // Group by confidence
  const highConfidence = candidates.filter(c => c.primeScore >= 70);
  const mediumConfidence = candidates.filter(c => c.primeScore >= 50 && c.primeScore < 70);
  const lowerConfidence = candidates.filter(c => c.primeScore >= 30 && c.primeScore < 50);

  lines.push('// === HIGH CONFIDENCE PRIMES (score >= 70) ===');
  lines.push(`// Count: ${highConfidence.length}`);
  lines.push('');
  for (const c of highConfidence) {
    addCandidateToLino(lines, c);
  }

  lines.push('');
  lines.push('// === MEDIUM CONFIDENCE PRIMES (50 <= score < 70) ===');
  lines.push(`// Count: ${mediumConfidence.length}`);
  lines.push('');
  for (const c of mediumConfidence) {
    addCandidateToLino(lines, c);
  }

  lines.push('');
  lines.push('// === CANDIDATES (30 <= score < 50) ===');
  lines.push(`// Count: ${lowerConfidence.length}`);
  lines.push('');
  for (const c of lowerConfidence) {
    addCandidateToLino(lines, c);
  }

  return lines.join('\n');
}

function addCandidateToLino(lines, candidate) {
  const wordId = candidate.word.replace(/[^a-z0-9]/gi, '_');

  lines.push(`(${wordId} isa discovered_semantic_prime)`);
  lines.push(`(${wordId} prime_score ${candidate.primeScore.toFixed(1)})`);
  lines.push(`(${wordId} reference_count ${candidate.referenceCount})`);

  if (candidate.isSelfReference) {
    lines.push(`(${wordId} has_self_reference true)`);
  }

  if (candidate.hasCircularReference) {
    lines.push(`(${wordId} has_circular_reference true)`);
    lines.push(`(${wordId} circular_ref_count ${candidate.circularRefCount})`);
  }

  if (candidate.definition) {
    const defText = escapeForLino(candidate.definition.substring(0, 200));
    lines.push(`(${wordId} definition "${defText}")`);
  }

  if (candidate.partOfSpeech) {
    lines.push(`(${wordId} pos ${candidate.partOfSpeech})`);
  }

  lines.push('');
}

/**
 * Main function.
 */
async function main() {
  console.log('=== Semantic Primes Discovery Script ===');
  console.log('Finding primitive words through definition chain analysis\n');

  if (!existsSync(WORDNET_FILE)) {
    console.error(`Error: WordNet data file not found: ${WORDNET_FILE}`);
    console.error('Please run "npm run download" first to download the data.');
    process.exit(1);
  }

  // Parse WordNet
  const { lemmaToDefinitions, definitionWordCounts, selfReferences } =
    await parseWordNet(WORDNET_FILE);

  // Get candidate words (high reference count)
  console.log('\nIdentifying prime candidates...');
  const sortedWords = [...definitionWordCounts.entries()]
    .filter(([word, count]) => count >= MIN_REFERENCE_COUNT)
    .filter(([word]) => lemmaToDefinitions.has(word))  // Must have own definition
    .sort((a, b) => b[1] - a[1]);

  console.log(`  Words with ${MIN_REFERENCE_COUNT}+ references: ${sortedWords.length}`);

  // Build initial candidates
  const candidates = sortedWords.map(([word, count]) => ({
    word,
    referenceCount: count,
    isSelfReference: selfReferences.has(word),
    hasCircularReference: false,
    circularRefCount: 0,
    definition: null,
    partOfSpeech: null,
  }));

  // Add definitions
  for (const c of candidates) {
    const defs = lemmaToDefinitions.get(c.word);
    if (defs && defs.length > 0) {
      c.definition = defs[0].definition;
      c.partOfSpeech = defs[0].partOfSpeech;
    }
  }

  // Find circular references
  const circularRefs = findCircularReferences(lemmaToDefinitions, candidates);

  // Update candidates with circular reference info
  for (const c of candidates) {
    const refs = circularRefs.get(c.word);
    if (refs && refs.length > 0) {
      c.hasCircularReference = true;
      c.circularRefCount = refs.length;
    }
  }

  // Calculate scores
  for (const c of candidates) {
    c.primeScore = calculatePrimeScore(
      c.word,
      c.referenceCount,
      c.isSelfReference,
      circularRefs.get(c.word)
    );
  }

  // Sort by score
  candidates.sort((a, b) => b.primeScore - a.primeScore);

  // Print top results
  console.log('\nTop 30 semantic prime candidates:');
  for (const c of candidates.slice(0, 30)) {
    const flags = [];
    if (c.isSelfReference) flags.push('self-ref');
    if (c.hasCircularReference) flags.push(`circular(${c.circularRefCount})`);
    console.log(`  ${c.word}: score=${c.primeScore.toFixed(1)}, refs=${c.referenceCount} ${flags.join(', ')}`);
  }

  // Generate output
  console.log('\nGenerating output...');
  const linoOutput = toLinksNotation(candidates);
  writeFileSync(OUTPUT_FILE, linoOutput);
  console.log(`Links Notation output saved to: ${OUTPUT_FILE}`);

  // Save JSON (without full definitions for smaller size)
  const jsonOutput = candidates.map(c => ({
    word: c.word,
    primeScore: c.primeScore,
    referenceCount: c.referenceCount,
    isSelfReference: c.isSelfReference,
    hasCircularReference: c.hasCircularReference,
    circularRefCount: c.circularRefCount,
    partOfSpeech: c.partOfSpeech,
  }));
  writeFileSync(OUTPUT_JSON, JSON.stringify(jsonOutput, null, 2));
  console.log(`JSON output saved to: ${OUTPUT_JSON}`);

  console.log('\nDiscovery complete!');
}

main().catch((error) => {
  console.error('Error:', error.message);
  if (VERBOSE) {
    console.error(error.stack);
  }
  process.exit(1);
});
