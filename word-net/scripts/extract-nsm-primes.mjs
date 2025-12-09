#!/usr/bin/env node

/**
 * Extract NSM (Natural Semantic Metalanguage) Primes from WordNet
 *
 * This script parses the Open English WordNet XML file and extracts
 * entries that correspond to the 65 semantic primes defined by
 * Anna Wierzbicka's NSM theory.
 *
 * These are pre-defined primes from linguistic research, NOT algorithmically
 * discovered. For algorithmic discovery of semantic primes, see discover-semantic-primes.mjs.
 *
 * Reference: Wierzbicka, A. (1996). Semantics: Primes and universals.
 *
 * Results are output in Links Notation (.lino) format.
 *
 * Usage: node extract-nsm-primes.mjs
 *
 * Requirements: Run download.mjs first to get the WordNet data.
 */

import { createReadStream, existsSync, writeFileSync } from 'fs';
import { createInterface } from 'readline';
import path from 'path';
import { fileURLToPath } from 'url';
import { Parser, Link } from 'links-notation';
import { getAllPrimes, SEMANTIC_PRIMES } from './semantic-primes.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const DATA_DIR = path.join(__dirname, '..', 'data');
const WORDNET_FILE = path.join(DATA_DIR, 'english-wordnet-2024.xml');
const OUTPUT_FILE = path.join(DATA_DIR, 'nsm-primes.lino');

// Verbose logging flag (set via environment variable)
const VERBOSE = process.env.VERBOSE === 'true';

function log(...args) {
  if (VERBOSE) {
    console.log('[DEBUG]', ...args);
  }
}

/**
 * Simple XML tag parser using streaming.
 * This is a lightweight parser to avoid heavy dependencies.
 */
class SimpleXMLParser {
  constructor() {
    this.lexicalEntries = [];
    this.synsets = new Map();
    this.currentEntry = null;
    this.currentSynset = null;
    this.inDefinition = false;
    this.definitionText = '';
  }

  /**
   * Parse the WordNet XML file line by line.
   * @param {string} filePath - Path to the XML file
   * @returns {Promise<{entries: Array, synsets: Map}>}
   */
  async parse(filePath) {
    const fileStream = createReadStream(filePath);
    const rl = createInterface({
      input: fileStream,
      crlfDelay: Infinity,
    });

    let lineCount = 0;
    let buffer = '';

    for await (const line of rl) {
      lineCount++;
      buffer += line;

      // Process complete tags in buffer
      this.processBuffer(buffer);
      buffer = '';

      if (lineCount % 100000 === 0) {
        console.log(`Processed ${lineCount} lines...`);
      }
    }

    console.log(`Total lines processed: ${lineCount}`);
    console.log(`Lexical entries found: ${this.lexicalEntries.length}`);
    console.log(`Synsets found: ${this.synsets.size}`);

    return {
      entries: this.lexicalEntries,
      synsets: this.synsets,
    };
  }

  /**
   * Process XML content in buffer.
   * @param {string} content - XML content to process
   */
  processBuffer(content) {
    // Match LexicalEntry tags
    const entryMatch = content.match(/<LexicalEntry\s+id="([^"]+)"/);
    if (entryMatch) {
      this.currentEntry = {
        id: entryMatch[1],
        lemmas: [],
        senses: [],
      };
    }

    // Match Lemma tags - handle both self-closing and multi-line variants
    // Format can be: <Lemma writtenForm="..." partOfSpeech="..."/> or
    //                <Lemma writtenForm="..." partOfSpeech="...">
    const lemmaMatch = content.match(/<Lemma\s+([^>]+)/);
    if (lemmaMatch && this.currentEntry) {
      const attrs = lemmaMatch[1];
      const formMatch = attrs.match(/writtenForm="([^"]+)"/);
      const posMatch = attrs.match(/partOfSpeech="([^"]+)"/);
      if (formMatch && posMatch) {
        this.currentEntry.lemmas.push({
          writtenForm: formMatch[1],
          partOfSpeech: posMatch[1],
        });
      }
    }

    // Match Sense tags (link entries to synsets)
    // Format can have other attributes between id and synset, e.g., subcat
    const senseMatch = content.match(/<Sense\s+([^>]+)/);
    if (senseMatch && this.currentEntry) {
      const attrs = senseMatch[1];
      const idMatch = attrs.match(/id="([^"]+)"/);
      const synsetMatch = attrs.match(/synset="([^"]+)"/);
      if (idMatch && synsetMatch) {
        this.currentEntry.senses.push({
          id: idMatch[1],
          synset: synsetMatch[1],
        });
      }
    }

    // End of LexicalEntry
    if (content.includes('</LexicalEntry>') && this.currentEntry) {
      if (this.currentEntry.lemmas.length > 0) {
        this.lexicalEntries.push(this.currentEntry);
      }
      this.currentEntry = null;
    }

    // Match Synset tags - format: <Synset id="..." ili="..." members="..." partOfSpeech="..." lexfile="...">
    // The order of attributes can vary, so we use a more flexible approach
    const synsetOpenMatch = content.match(/<Synset\s+([^>]+)>/);
    if (synsetOpenMatch) {
      const attrs = synsetOpenMatch[1];
      const idMatch = attrs.match(/id="([^"]+)"/);
      const iliMatch = attrs.match(/ili="([^"]*)"/);
      const posMatch = attrs.match(/partOfSpeech="([^"]+)"/);

      if (idMatch) {
        this.currentSynset = {
          id: idMatch[1],
          ili: iliMatch ? iliMatch[1] : '',
          partOfSpeech: posMatch ? posMatch[1] : '',
          definitions: [],
          examples: [],
        };
      }
    }

    // Match Definition tags
    if (content.includes('<Definition>')) {
      this.inDefinition = true;
      this.definitionText = '';
      // Extract inline definition
      const defMatch = content.match(/<Definition>([^<]*)<\/Definition>/);
      if (defMatch) {
        this.definitionText = defMatch[1];
        this.inDefinition = false;
        if (this.currentSynset) {
          this.currentSynset.definitions.push(this.definitionText);
        }
      }
    } else if (this.inDefinition) {
      // Multi-line definition
      const endMatch = content.match(/([^<]*)<\/Definition>/);
      if (endMatch) {
        this.definitionText += endMatch[1];
        this.inDefinition = false;
        if (this.currentSynset) {
          this.currentSynset.definitions.push(this.definitionText);
        }
      } else {
        this.definitionText += content;
      }
    }

    // Match Example tags
    const exampleMatch = content.match(/<Example>([^<]*)<\/Example>/);
    if (exampleMatch && this.currentSynset) {
      this.currentSynset.examples.push(exampleMatch[1]);
    }

    // End of Synset
    if (content.includes('</Synset>') && this.currentSynset) {
      this.synsets.set(this.currentSynset.id, this.currentSynset);
      this.currentSynset = null;
    }
  }
}

/**
 * Find WordNet entries matching semantic primes.
 * @param {Array} entries - Lexical entries from WordNet
 * @param {Map} synsets - Synsets map
 * @param {Array} primes - Semantic primes to search for
 * @returns {Array} Matched entries with prime info
 */
function findPrimeMatches(entries, synsets, primes) {
  const matches = [];

  for (const prime of primes) {
    const primeMatches = [];

    for (const searchTerm of prime.searchTerms) {
      const termLower = searchTerm.toLowerCase();

      for (const entry of entries) {
        for (const lemma of entry.lemmas) {
          if (lemma.writtenForm.toLowerCase() === termLower) {
            // Found a match, get synset info
            for (const sense of entry.senses) {
              const synset = synsets.get(sense.synset);
              if (synset) {
                primeMatches.push({
                  lemma: lemma.writtenForm,
                  partOfSpeech: lemma.partOfSpeech,
                  synsetId: synset.id,
                  ili: synset.ili,
                  definitions: synset.definitions,
                  examples: synset.examples,
                });
              }
            }
          }
        }
      }
    }

    // Remove duplicates based on synsetId
    const uniqueMatches = [];
    const seenSynsets = new Set();
    for (const match of primeMatches) {
      if (!seenSynsets.has(match.synsetId)) {
        seenSynsets.add(match.synsetId);
        uniqueMatches.push(match);
      }
    }

    matches.push({
      prime: prime.prime,
      category: prime.category,
      allolexes: prime.allolexes,
      searchTerms: prime.searchTerms,
      wordnetMatches: uniqueMatches,
    });
  }

  return matches;
}

/**
 * Convert matched primes to Links Notation format.
 * @param {Array} matches - Matched semantic primes
 * @returns {string} Links Notation string
 */
function toLinksNotation(matches) {
  const lines = [];

  // Header comment
  lines.push('// NSM Semantic Primes extracted from Open English WordNet 2024');
  lines.push('// Based on Natural Semantic Metalanguage (NSM) theory by Anna Wierzbicka');
  lines.push('// These are pre-defined primes from linguistic research');
  lines.push('// Reference: Wierzbicka, A. (1996). Semantics: Primes and universals.');
  lines.push('');

  // Group by category
  const byCategory = {};
  for (const match of matches) {
    if (!byCategory[match.category]) {
      byCategory[match.category] = [];
    }
    byCategory[match.category].push(match);
  }

  // Output each category
  for (const [category, primes] of Object.entries(byCategory)) {
    lines.push(`// === ${formatCategoryName(category)} ===`);
    lines.push('');

    for (const prime of primes) {
      // Main prime entry
      const primeId = prime.prime.toLowerCase().replace(/[^a-z]/g, '_');

      // Prime definition with category
      lines.push(`(${primeId} isa semantic_prime)`);
      lines.push(`(${primeId} category ${category})`);

      // Allolexes if any
      if (prime.allolexes.length > 0) {
        for (const allolex of prime.allolexes) {
          const allolexId = allolex.toLowerCase().replace(/[^a-z]/g, '_');
          lines.push(`(${allolexId} allolex_of ${primeId})`);
        }
      }

      // WordNet synset links
      for (const wn of prime.wordnetMatches) {
        const synsetId = wn.synsetId.replace(/[^a-z0-9]/gi, '_');
        lines.push(`(${primeId} wordnet_synset ${synsetId})`);

        // Add definition as separate link
        if (wn.definitions.length > 0) {
          const defText = escapeForLino(wn.definitions[0]);
          lines.push(`(${synsetId} definition "${defText}")`);
        }

        // Add part of speech
        lines.push(`(${synsetId} pos ${wn.partOfSpeech})`);

        // Add ILI (Inter-Lingual Index) if available
        if (wn.ili) {
          lines.push(`(${synsetId} ili "${wn.ili}")`);
        }
      }

      lines.push('');
    }
  }

  return lines.join('\n');
}

/**
 * Format category name for display.
 * @param {string} category - Category key
 * @returns {string} Formatted name
 */
function formatCategoryName(category) {
  return category
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim();
}

/**
 * Escape special characters for Links Notation strings.
 * @param {string} str - String to escape
 * @returns {string} Escaped string
 */
function escapeForLino(str) {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r');
}

/**
 * Main function.
 */
async function main() {
  console.log('=== Semantic Primes Extraction Script ===\n');

  // Check if WordNet data exists
  if (!existsSync(WORDNET_FILE)) {
    console.error(`Error: WordNet data file not found: ${WORDNET_FILE}`);
    console.error('Please run "npm run download" first to download the data.');
    process.exit(1);
  }

  // Get all semantic primes
  const primes = getAllPrimes();
  console.log(`Searching for ${primes.length} semantic primes...\n`);

  // Parse WordNet XML
  console.log('Parsing WordNet XML file...');
  const parser = new SimpleXMLParser();
  const { entries, synsets } = await parser.parse(WORDNET_FILE);

  // Find matches
  console.log('\nSearching for semantic prime matches...');
  const matches = findPrimeMatches(entries, synsets, primes);

  // Statistics
  let totalMatches = 0;
  let primesWithMatches = 0;
  for (const match of matches) {
    if (match.wordnetMatches.length > 0) {
      primesWithMatches++;
      totalMatches += match.wordnetMatches.length;
    }
  }

  console.log(`\nResults:`);
  console.log(`- Primes with WordNet matches: ${primesWithMatches}/${primes.length}`);
  console.log(`- Total synset matches: ${totalMatches}`);

  // Convert to Links Notation
  console.log('\nGenerating Links Notation output...');
  const linoOutput = toLinksNotation(matches);

  // Save output file
  writeFileSync(OUTPUT_FILE, linoOutput);
  console.log(`Links Notation output saved to: ${OUTPUT_FILE}`);

  console.log('\nExtraction complete!');
}

main().catch((error) => {
  console.error('Error:', error.message);
  process.exit(1);
});
