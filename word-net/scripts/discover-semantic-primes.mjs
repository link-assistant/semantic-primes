#!/usr/bin/env node

/**
 * Discover Semantic Primes Algorithmically from WordNet
 *
 * This script analyzes WordNet definitions to find semantic primes -
 * words that are primitive and cannot be defined using simpler terms.
 *
 * A semantic prime is identified by finding words that participate in
 * circular definition chains. When tracing through definitions, if the
 * chain eventually loops back (either to itself or through other words),
 * ALL words in that circular path are considered semantic primes.
 *
 * Algorithm: Uses Tarjan's algorithm to efficiently find Strongly Connected
 * Components (SCCs) in the word dependency graph. Words in the same SCC
 * are mutually reachable and form circular definition chains.
 *
 * Usage: node discover-semantic-primes.mjs [options]
 *
 * Options:
 *   --stop-words=<file>  Use stop words from file (one word per line)
 *   --use-default-stop-words  Use built-in stop words list
 *   (no flag)            No stop words (default) - analyze all words
 *
 * Requirements: Run download.mjs first to get the WordNet data.
 */

import { createReadStream, existsSync, writeFileSync, readFileSync } from 'fs';
import { createInterface } from 'readline';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const DATA_DIR = path.join(__dirname, '..', 'data');
const WORDNET_FILE = path.join(DATA_DIR, 'english-wordnet-2024.xml');
const OUTPUT_FILE = path.join(DATA_DIR, 'discovered-primes.lino');

// Verbose logging flag (set via environment variable)
const VERBOSE = process.env.VERBOSE === 'true';

// Minimum SCC size for a word to be considered a semantic prime
// Words in small SCCs (1 word = self-loop, 2 words = direct cycle) are most significant
const MIN_SCC_SIZE = 1;

function log(...args) {
  if (VERBOSE) {
    console.log('[DEBUG]', ...args);
  }
}

/**
 * Default English stop words that can optionally be excluded from analysis.
 * These are function words that typically don't carry semantic content.
 * By default, NO stop words are used - all words are analyzed.
 * Use --use-default-stop-words to enable these, or --stop-words=<file> for custom list.
 */
const DEFAULT_STOP_WORDS = [
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
];

/**
 * Parse command line arguments for stop words configuration.
 * Returns a Set of stop words to use (empty by default).
 */
function parseStopWordsConfig() {
  const args = process.argv.slice(2);

  // Check for --use-default-stop-words flag
  if (args.includes('--use-default-stop-words')) {
    console.log('Using default stop words list');
    return new Set(DEFAULT_STOP_WORDS);
  }

  // Check for --stop-words=<file> argument
  const stopWordsArg = args.find(arg => arg.startsWith('--stop-words='));
  if (stopWordsArg) {
    const filePath = stopWordsArg.replace('--stop-words=', '');
    const absolutePath = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);

    if (!existsSync(absolutePath)) {
      console.error(`Error: Stop words file not found: ${absolutePath}`);
      process.exit(1);
    }

    const content = readFileSync(absolutePath, 'utf-8');
    const words = content
      .split('\n')
      .map(line => line.trim().toLowerCase())
      .filter(line => line.length > 0 && !line.startsWith('#'));

    console.log(`Using ${words.length} stop words from: ${absolutePath}`);
    return new Set(words);
  }

  // Default: no stop words - analyze all words
  console.log('No stop words configured - analyzing all words (including a, of, the, etc.)');
  return new Set();
}

// Parse stop words configuration
const STOP_WORDS = parseStopWordsConfig();

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
 * Returns unique words that are not stop words.
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
 * Returns lemma to definitions mapping and word counts.
 */
async function parseWordNet(filePath) {
  console.log('Parsing WordNet XML...');

  const lemmaToDefinitions = new Map();  // lemma -> [{definition, partOfSpeech, synsetId}]
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
 * Build a directed graph of word dependencies.
 * Each edge from A to B means word A is defined using word B.
 */
function buildDependencyGraph(lemmaToDefinitions) {
  console.log('\nBuilding dependency graph...');

  const graph = new Map();  // word -> Set of words it depends on

  for (const [lemma, defs] of lemmaToDefinitions) {
    const dependencies = new Set();

    for (const def of defs) {
      const contentWords = extractContentWords(def.definition);
      for (const word of contentWords) {
        if (lemmaToDefinitions.has(word)) {
          dependencies.add(word);
        }
      }
    }

    graph.set(lemma, dependencies);
  }

  console.log(`  Graph nodes: ${graph.size}`);
  let edgeCount = 0;
  for (const deps of graph.values()) {
    edgeCount += deps.size;
  }
  console.log(`  Graph edges: ${edgeCount}`);

  return graph;
}

/**
 * Find Strongly Connected Components using Tarjan's algorithm.
 * SCCs represent groups of words that form circular definition chains.
 */
function findSCCs(graph) {
  console.log('\nFinding strongly connected components (SCCs)...');

  const indices = new Map();
  const lowlinks = new Map();
  const onStack = new Set();
  const stack = [];
  const sccs = [];
  let index = 0;

  function strongConnect(v) {
    indices.set(v, index);
    lowlinks.set(v, index);
    index++;
    stack.push(v);
    onStack.add(v);

    const neighbors = graph.get(v) || new Set();
    for (const w of neighbors) {
      if (!indices.has(w)) {
        strongConnect(w);
        lowlinks.set(v, Math.min(lowlinks.get(v), lowlinks.get(w)));
      } else if (onStack.has(w)) {
        lowlinks.set(v, Math.min(lowlinks.get(v), indices.get(w)));
      }
    }

    // If v is a root node, pop the stack and generate an SCC
    if (lowlinks.get(v) === indices.get(v)) {
      const scc = [];
      let w;
      do {
        w = stack.pop();
        onStack.delete(w);
        scc.push(w);
      } while (w !== v);
      sccs.push(scc);
    }
  }

  let processed = 0;
  const total = graph.size;
  for (const v of graph.keys()) {
    if (!indices.has(v)) {
      strongConnect(v);
    }
    processed++;
    if (processed % 50000 === 0) {
      console.log(`  Processed ${processed}/${total} nodes (${(processed / total * 100).toFixed(1)}%)...`);
    }
  }

  console.log(`  Total SCCs found: ${sccs.length}`);

  // Analyze SCC sizes
  const sccSizes = new Map();
  for (const scc of sccs) {
    const size = scc.length;
    sccSizes.set(size, (sccSizes.get(size) || 0) + 1);
  }

  const nonTrivialSccs = sccs.filter(scc => scc.length >= MIN_SCC_SIZE);
  console.log(`  Non-trivial SCCs (size >= ${MIN_SCC_SIZE}): ${nonTrivialSccs.length}`);

  // Count words in cycles (SCCs with size > 1 or self-loops)
  let wordsInCycles = 0;
  for (const scc of sccs) {
    if (scc.length > 1) {
      wordsInCycles += scc.length;
    } else {
      // Check for self-loop
      const word = scc[0];
      const deps = graph.get(word) || new Set();
      if (deps.has(word)) {
        wordsInCycles++;
      }
    }
  }
  console.log(`  Words in circular definitions: ${wordsInCycles}`);

  return sccs;
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
 * Calculate prime score for a word based on multiple factors.
 */
function calculatePrimeScore(word, sccSize, hasSelfLoop, refCount, isSelfRef, isInCycle) {
  let score = 0;

  // Being in a cycle is the primary indicator
  if (isInCycle) {
    score += 50;
  }

  // SCC size (larger SCCs = more fundamental concepts interconnected)
  if (sccSize > 1) {
    score += Math.min(Math.log10(sccSize) * 15, 30);
  }

  // Self-loop (word appears in own definition)
  if (hasSelfLoop) {
    score += 30;
  }

  // Self-reference (checked separately from self-loop)
  if (isSelfRef) {
    score += 20;
  }

  // Reference count (words used more in definitions are more fundamental)
  if (refCount) {
    score += Math.log10(refCount) * 8;
  }

  // Short words are often more primitive
  if (word.length <= 4) {
    score += 10;
  } else if (word.length <= 6) {
    score += 5;
  }

  return score;
}

/**
 * Convert discovered primes to Links Notation format.
 */
function toLinksNotation(primes) {
  const lines = [];

  lines.push('// Semantic Primes discovered algorithmically from Open English WordNet 2024');
  lines.push('// Method: Tarjan\'s algorithm for Strongly Connected Components (SCCs)');
  lines.push('//');
  lines.push('// A semantic prime is a word that cannot be defined without eventually');
  lines.push('// referring back to itself (directly or through other words).');
  lines.push('//');
  lines.push('// Words in the same SCC form mutual circular definitions - they can all');
  lines.push('// reach each other through definition chains, making them all semantic primes.');
  lines.push('//');
  lines.push(`// Generated: ${new Date().toISOString()}`);
  lines.push(`// Total semantic primes discovered: ${primes.length}`);
  lines.push('');

  // Group by confidence score ranges
  const highConfidence = primes.filter(p => p.primeScore >= 80);
  const mediumConfidence = primes.filter(p => p.primeScore >= 50 && p.primeScore < 80);
  const lowerConfidence = primes.filter(p => p.primeScore >= 30 && p.primeScore < 50);
  const candidates = primes.filter(p => p.primeScore < 30);

  lines.push('// === HIGH CONFIDENCE PRIMES (score >= 80) ===');
  lines.push(`// Count: ${highConfidence.length}`);
  lines.push('');
  for (const p of highConfidence) {
    addPrimeToLino(lines, p);
  }

  lines.push('');
  lines.push('// === MEDIUM CONFIDENCE PRIMES (50 <= score < 80) ===');
  lines.push(`// Count: ${mediumConfidence.length}`);
  lines.push('');
  for (const p of mediumConfidence) {
    addPrimeToLino(lines, p);
  }

  lines.push('');
  lines.push('// === LOWER CONFIDENCE PRIMES (30 <= score < 50) ===');
  lines.push(`// Count: ${lowerConfidence.length}`);
  lines.push('');
  for (const p of lowerConfidence) {
    addPrimeToLino(lines, p);
  }

  if (candidates.length > 0) {
    lines.push('');
    lines.push('// === CANDIDATES (score < 30) ===');
    lines.push(`// Count: ${candidates.length}`);
    lines.push('');
    for (const p of candidates) {
      addPrimeToLino(lines, p);
    }
  }

  return lines.join('\n');
}

function addPrimeToLino(lines, prime) {
  const wordId = prime.word.replace(/[^a-z0-9]/gi, '_');

  lines.push(`(${wordId} isa discovered_semantic_prime)`);
  lines.push(`(${wordId} prime_score ${prime.primeScore.toFixed(1)})`);

  if (prime.isInCycle) {
    lines.push(`(${wordId} in_circular_definition true)`);
  }

  if (prime.sccSize > 1) {
    lines.push(`(${wordId} scc_size ${prime.sccSize})`);
  }

  if (prime.hasSelfLoop) {
    lines.push(`(${wordId} has_self_loop true)`);
  }

  if (prime.referenceCount) {
    lines.push(`(${wordId} reference_count ${prime.referenceCount})`);
  }

  if (prime.isSelfReference) {
    lines.push(`(${wordId} has_self_reference true)`);
  }

  if (prime.definition) {
    const defText = escapeForLino(prime.definition.substring(0, 200));
    lines.push(`(${wordId} definition "${defText}")`);
  }

  if (prime.partOfSpeech) {
    lines.push(`(${wordId} pos ${prime.partOfSpeech})`);
  }

  // Add sample SCC members if in a multi-word SCC
  if (prime.sccSample && prime.sccSample.length > 1) {
    const sample = prime.sccSample.slice(0, 5).join(', ');
    lines.push(`(${wordId} scc_sample "${escapeForLino(sample)}")`);
  }

  lines.push('');
}

/**
 * Main function.
 */
async function main() {
  console.log('=== Semantic Primes Discovery Script ===');
  console.log('Finding primitive words through SCC analysis of definition chains\n');

  if (!existsSync(WORDNET_FILE)) {
    console.error(`Error: WordNet data file not found: ${WORDNET_FILE}`);
    console.error('Please run "npm run download" first to download the data.');
    process.exit(1);
  }

  // Parse WordNet
  const { lemmaToDefinitions, definitionWordCounts, selfReferences } =
    await parseWordNet(WORDNET_FILE);

  // Build dependency graph
  const graph = buildDependencyGraph(lemmaToDefinitions);

  // Find SCCs
  const sccs = findSCCs(graph);

  // Build map of word -> SCC info
  console.log('\nBuilding prime candidates list...');
  const wordToSCC = new Map();
  for (const scc of sccs) {
    for (const word of scc) {
      wordToSCC.set(word, scc);
    }
  }

  // Build list of discovered primes
  const primes = [];

  for (const [word, scc] of wordToSCC) {
    // Check if this word is in a cycle
    const hasSelfLoop = (graph.get(word) || new Set()).has(word);
    const isInCycle = scc.length > 1 || hasSelfLoop;

    // Only include words that are in cycles (this is the definition of semantic prime)
    if (!isInCycle) continue;

    const defs = lemmaToDefinitions.get(word);
    const firstDef = defs && defs.length > 0 ? defs[0] : null;

    const prime = {
      word,
      primeScore: calculatePrimeScore(
        word,
        scc.length,
        hasSelfLoop,
        definitionWordCounts.get(word),
        selfReferences.has(word),
        isInCycle
      ),
      sccSize: scc.length,
      sccSample: scc.slice(0, 10),
      hasSelfLoop,
      isInCycle,
      referenceCount: definitionWordCounts.get(word) || 0,
      isSelfReference: selfReferences.has(word),
      definition: firstDef?.definition,
      partOfSpeech: firstDef?.partOfSpeech,
    };

    primes.push(prime);
  }

  // Sort by score
  primes.sort((a, b) => b.primeScore - a.primeScore);

  console.log(`  Total primes discovered: ${primes.length}`);

  // Check for key words that should be primes
  const keyWords = ['entity', 'thing', 'being', 'time', 'body', 'make', 'existence', 'person'];
  console.log('\n  Key word verification:');
  for (const kw of keyWords) {
    const found = primes.find(p => p.word === kw);
    if (found) {
      console.log(`    ${kw}: FOUND (score=${found.primeScore.toFixed(1)}, scc_size=${found.sccSize})`);
    } else {
      // Check if it's in graph but not in cycle
      if (graph.has(kw)) {
        const scc = wordToSCC.get(kw);
        const hasSelfLoop = (graph.get(kw) || new Set()).has(kw);
        console.log(`    ${kw}: NOT IN CYCLE (scc_size=${scc?.length || 0}, self_loop=${hasSelfLoop})`);
      } else {
        console.log(`    ${kw}: NOT IN GRAPH`);
      }
    }
  }

  // Print top results
  console.log('\nTop 30 semantic primes:');
  for (const p of primes.slice(0, 30)) {
    const flags = [];
    if (p.hasSelfLoop) flags.push('self-loop');
    if (p.isSelfReference) flags.push('self-ref');
    flags.push(`scc=${p.sccSize}`);
    console.log(`  ${p.word}: score=${p.primeScore.toFixed(1)}, refs=${p.referenceCount} ${flags.join(', ')}`);
  }

  // Generate output
  console.log('\nGenerating output...');
  const linoOutput = toLinksNotation(primes);
  writeFileSync(OUTPUT_FILE, linoOutput);
  console.log(`Links Notation output saved to: ${OUTPUT_FILE}`);

  console.log('\nDiscovery complete!');
}

main().catch((error) => {
  console.error('Error:', error.message);
  if (VERBOSE) {
    console.error(error.stack);
  }
  process.exit(1);
});
