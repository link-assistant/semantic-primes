#!/usr/bin/env node

/**
 * Experiment: Analyze why "entity" is not discovered as a semantic prime
 *
 * This script traces the definition chain for "entity" and other top-level words
 * to understand the structure of WordNet definitions.
 */

import { createReadStream, existsSync } from 'fs';
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
  const definitionWordCounts = new Map();

  const fileStream = createReadStream(filePath);
  const rl = createInterface({ input: fileStream, crlfDelay: Infinity });

  let currentEntry = null;
  let currentSynset = null;
  let inDefinition = false;
  let definitionText = '';
  let lineCount = 0;

  for await (const line of rl) {
    lineCount++;

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

  // Build lemma -> definitions and count word usage
  for (const [synsetId, data] of synsetDefinitions) {
    const lemmas = synsetToLemmas.get(synsetId) || new Set();
    for (const definition of data.definitions) {
      const contentWords = extractContentWords(definition);
      for (const lemma of lemmas) {
        if (!lemmaToDefinitions.has(lemma)) lemmaToDefinitions.set(lemma, []);
        lemmaToDefinitions.get(lemma).push({ definition, partOfSpeech: data.partOfSpeech, synsetId });
      }
      for (const word of contentWords) {
        definitionWordCounts.set(word, (definitionWordCounts.get(word) || 0) + 1);
      }
    }
  }

  return { lemmaToDefinitions, definitionWordCounts, synsetDefinitions };
}

async function main() {
  if (!existsSync(WORDNET_FILE)) {
    console.error('WordNet file not found. Run npm run download first.');
    process.exit(1);
  }

  const { lemmaToDefinitions, definitionWordCounts } = await parseWordNet(WORDNET_FILE);

  // Check "entity"
  console.log('\n=== Analysis of "entity" ===');
  const entityDefs = lemmaToDefinitions.get('entity');
  if (entityDefs) {
    console.log(`Found ${entityDefs.length} definition(s) for "entity":`);
    for (const def of entityDefs) {
      console.log(`  Definition: ${def.definition}`);
      console.log(`  Content words: ${extractContentWords(def.definition).join(', ')}`);
    }
  } else {
    console.log('"entity" not found in lemma definitions');
  }

  const entityRefCount = definitionWordCounts.get('entity');
  console.log(`\nReference count for "entity" in definitions: ${entityRefCount || 0}`);
  console.log(`Minimum threshold in current algorithm: 100`);
  console.log(`Is "entity" above threshold? ${(entityRefCount || 0) >= 100 ? 'YES' : 'NO'}`);

  // Trace definition chain for entity
  console.log('\n=== Definition chain trace for "entity" ===');
  const targetWords = ['entity'];
  const visited = new Set();
  const queue = [...targetWords];
  let depth = 0;
  const maxDepth = 3;

  while (queue.length > 0 && depth < maxDepth) {
    const word = queue.shift();
    if (visited.has(word)) continue;
    visited.add(word);

    const defs = lemmaToDefinitions.get(word);
    if (defs) {
      console.log(`\n[Depth ${depth}] "${word}":`);
      for (const def of defs.slice(0, 1)) {
        console.log(`  Definition: "${def.definition}"`);
        const contentWords = extractContentWords(def.definition);
        console.log(`  Content words: ${contentWords.join(', ')}`);
        for (const w of contentWords) {
          if (!visited.has(w)) queue.push(w);
        }
      }
    }
    depth++;
  }

  // Check some key words from entity definition
  console.log('\n=== Reference counts for words in "entity" definition ===');
  const entityContentWords = ['perceived', 'known', 'inferred', 'distinct', 'existence', 'living', 'nonliving'];
  for (const word of entityContentWords) {
    const count = definitionWordCounts.get(word) || 0;
    const hasDef = lemmaToDefinitions.has(word);
    console.log(`  ${word}: ${count} references, has definition: ${hasDef}`);
  }

  // Show statistics
  console.log('\n=== Statistics ===');
  console.log(`Total unique lemmas: ${lemmaToDefinitions.size}`);
  console.log(`Total unique words in definitions: ${definitionWordCounts.size}`);

  const wordsAbove100 = [...definitionWordCounts.entries()].filter(([w, c]) => c >= 100).length;
  console.log(`Words with 100+ references: ${wordsAbove100}`);

  const wordsWithDefsAbove100 = [...definitionWordCounts.entries()]
    .filter(([w, c]) => c >= 100 && lemmaToDefinitions.has(w)).length;
  console.log(`Words with 100+ refs AND own definition: ${wordsWithDefsAbove100}`);
}

main().catch(console.error);
