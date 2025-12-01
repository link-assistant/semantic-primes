#!/usr/bin/env node

/**
 * Experiment: Trace circularity in definition chains
 *
 * The goal is to understand if a word like "entity" or any top-level word
 * eventually leads to circular definitions.
 *
 * Key insight: Semantic primes are words that cannot be defined without
 * circular reference. If we trace ANY word's definition chain far enough,
 * we should hit circular references - and ALL words in those cycles are semantic primes.
 */

import { createReadStream, existsSync, writeFileSync } from 'fs';
import { createInterface } from 'readline';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, '..', 'data');
const WORDNET_FILE = path.join(DATA_DIR, 'english-wordnet-2024.xml');

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

function decodeXmlEntities(str) {
  return str
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

function extractContentWords(definition) {
  const words = definition.toLowerCase()
    .replace(/[^a-zA-Z\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2)
    .filter(w => !STOP_WORDS.has(w));
  return [...new Set(words)];
}

async function parseWordNet(filePath) {
  console.log('Parsing WordNet XML...');

  const lemmaToDefinitions = new Map();
  const synsetToLemmas = new Map();
  const synsetDefinitions = new Map();

  const fileStream = createReadStream(filePath);
  const rl = createInterface({ input: fileStream, crlfDelay: Infinity });

  let currentEntry = null;
  let currentSynset = null;
  let inDefinition = false;
  let definitionText = '';

  for await (const line of rl) {
    const entryMatch = line.match(/<LexicalEntry\s+id="([^"]+)"/);
    if (entryMatch) currentEntry = { lemmas: [], synsets: [] };

    const lemmaMatch = line.match(/<Lemma\s+([^>]+)/);
    if (lemmaMatch && currentEntry) {
      const formMatch = lemmaMatch[1].match(/writtenForm="([^"]+)"/);
      if (formMatch) currentEntry.lemmas.push(decodeXmlEntities(formMatch[1]).toLowerCase());
    }

    const senseMatch = line.match(/<Sense\s+([^>]+)/);
    if (senseMatch && currentEntry) {
      const synsetMatch = senseMatch[1].match(/synset="([^"]+)"/);
      if (synsetMatch) currentEntry.synsets.push(synsetMatch[1]);
    }

    if (line.includes('</LexicalEntry>') && currentEntry) {
      for (const synsetId of currentEntry.synsets) {
        if (!synsetToLemmas.has(synsetId)) synsetToLemmas.set(synsetId, new Set());
        for (const lemma of currentEntry.lemmas) synsetToLemmas.get(synsetId).add(lemma);
      }
      currentEntry = null;
    }

    const synsetStartMatch = line.match(/<Synset\s+([^>]+)>/);
    if (synsetStartMatch) {
      const idMatch = synsetStartMatch[1].match(/id="([^"]+)"/);
      const posMatch = synsetStartMatch[1].match(/partOfSpeech="([^"]+)"/);
      if (idMatch) currentSynset = { id: idMatch[1], partOfSpeech: posMatch?.[1] || '', definitions: [] };
    }

    if (line.includes('<Definition')) {
      inDefinition = true;
      definitionText = '';
      const defMatch = line.match(/<Definition[^>]*>([^<]*)<\/Definition>/);
      if (defMatch) {
        definitionText = decodeXmlEntities(defMatch[1]);
        inDefinition = false;
        if (currentSynset) currentSynset.definitions.push(definitionText);
      } else {
        const startMatch = line.match(/<Definition[^>]*>([^<]*)/);
        if (startMatch) definitionText = decodeXmlEntities(startMatch[1]);
      }
    } else if (inDefinition) {
      const endMatch = line.match(/([^<]*)<\/Definition>/);
      if (endMatch) {
        definitionText += decodeXmlEntities(endMatch[1]);
        inDefinition = false;
        if (currentSynset) currentSynset.definitions.push(definitionText);
      } else {
        definitionText += decodeXmlEntities(line);
      }
    }

    if (line.includes('</Synset>') && currentSynset) {
      if (currentSynset.definitions.length > 0) {
        synsetDefinitions.set(currentSynset.id, {
          definitions: currentSynset.definitions,
          partOfSpeech: currentSynset.partOfSpeech,
        });
      }
      currentSynset = null;
    }
  }

  // Build lemma -> definitions
  for (const [synsetId, data] of synsetDefinitions) {
    const lemmas = synsetToLemmas.get(synsetId) || new Set();
    for (const definition of data.definitions) {
      for (const lemma of lemmas) {
        if (!lemmaToDefinitions.has(lemma)) lemmaToDefinitions.set(lemma, []);
        lemmaToDefinitions.get(lemma).push({ definition, partOfSpeech: data.partOfSpeech, synsetId });
      }
    }
  }

  console.log(`Parsed ${lemmaToDefinitions.size} unique lemmas`);
  return { lemmaToDefinitions };
}

/**
 * Trace a word through its definition chain to find circular references.
 * Returns all words encountered in circular paths.
 */
function traceCircularity(startWord, lemmaToDefinitions, maxDepth = 10) {
  const result = {
    word: startWord,
    hasCycle: false,
    cycles: [],
    allWordsInChain: new Set(),
    wordsInCycles: new Set(),
  };

  // DFS to find cycles
  const visited = new Map(); // word -> depth at which it was visited
  const path = []; // current path

  function dfs(word, depth) {
    if (depth > maxDepth) return;
    if (!lemmaToDefinitions.has(word)) return;

    // Check if we've found a cycle
    if (visited.has(word)) {
      result.hasCycle = true;
      const cycleStartIdx = path.findIndex(w => w === word);
      if (cycleStartIdx !== -1) {
        const cycle = path.slice(cycleStartIdx).concat(word);
        result.cycles.push(cycle);
        for (const w of cycle) {
          result.wordsInCycles.add(w);
        }
      }
      return;
    }

    visited.set(word, depth);
    path.push(word);
    result.allWordsInChain.add(word);

    // Get all content words from definitions of this word
    const defs = lemmaToDefinitions.get(word) || [];
    for (const def of defs) {
      const contentWords = extractContentWords(def.definition);
      for (const nextWord of contentWords) {
        if (lemmaToDefinitions.has(nextWord)) {
          dfs(nextWord, depth + 1);
        }
      }
    }

    path.pop();
  }

  dfs(startWord, 0);
  return result;
}

async function main() {
  if (!existsSync(WORDNET_FILE)) {
    console.error('WordNet file not found. Run npm run download first.');
    process.exit(1);
  }

  const { lemmaToDefinitions } = await parseWordNet(WORDNET_FILE);

  // Test with "entity" and some other key words
  const testWords = ['entity', 'thing', 'object', 'being', 'existence', 'make', 'body', 'time'];

  console.log('\n=== Tracing circularity for test words (max depth 10) ===\n');

  for (const word of testWords) {
    if (!lemmaToDefinitions.has(word)) {
      console.log(`"${word}": No definition found`);
      continue;
    }

    const defs = lemmaToDefinitions.get(word);
    console.log(`"${word}": "${defs[0]?.definition?.substring(0, 80)}..."`);

    const result = traceCircularity(word, lemmaToDefinitions, 10);

    console.log(`  Has cycle: ${result.hasCycle}`);
    console.log(`  Words in chain: ${result.allWordsInChain.size}`);
    if (result.hasCycle) {
      console.log(`  Words in cycles: ${result.wordsInCycles.size}`);
      console.log(`  Number of cycles found: ${result.cycles.length}`);
      if (result.cycles.length > 0 && result.cycles[0].length <= 10) {
        console.log(`  First cycle: ${result.cycles[0].join(' -> ')}`);
      }
    }
    console.log('');
  }

  // Now let's trace entity more deeply
  console.log('\n=== Deep trace for "entity" (max depth 15) ===\n');
  const entityResult = traceCircularity('entity', lemmaToDefinitions, 15);
  console.log(`Has cycle: ${entityResult.hasCycle}`);
  console.log(`Total words explored: ${entityResult.allWordsInChain.size}`);
  console.log(`Words in cycles: ${entityResult.wordsInCycles.size}`);
  if (entityResult.wordsInCycles.size > 0) {
    console.log(`Sample words in cycles: ${[...entityResult.wordsInCycles].slice(0, 20).join(', ')}`);
  }

  // Save results
  const output = {
    entity: {
      hasCycle: entityResult.hasCycle,
      wordsInChain: [...entityResult.allWordsInChain],
      wordsInCycles: [...entityResult.wordsInCycles],
      sampleCycles: entityResult.cycles.slice(0, 5),
    },
  };

  writeFileSync(
    path.join(__dirname, 'entity-circularity.json'),
    JSON.stringify(output, null, 2)
  );
  console.log('\nResults saved to experiments/entity-circularity.json');
}

main().catch(console.error);
