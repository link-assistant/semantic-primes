#!/usr/bin/env node

/**
 * Convert WordNet XML to Links Notation Format
 *
 * This script converts the Open English WordNet XML file to Links Notation (.lino)
 * format for easier analysis and sharing. The .lino format is more compact and
 * human-readable than XML.
 *
 * The output includes:
 * - Synsets with their definitions
 * - Lexical entries (lemmas) linked to synsets
 * - Part of speech information
 *
 * Usage: node convert-wordnet-to-lino.mjs
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
const OUTPUT_FILE = path.join(DATA_DIR, 'wordnet-source.lino');

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
 * Parse WordNet XML and convert to Links Notation.
 */
async function convertToLino(filePath, outputPath) {
  console.log('Parsing WordNet XML...');

  const fileStream = createReadStream(filePath);
  const rl = createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  // Collect data
  const synsets = [];  // {id, partOfSpeech, definitions, examples}
  const entries = [];  // {lemma, partOfSpeech, synsets}

  let currentEntry = null;
  let currentSynset = null;
  let inDefinition = false;
  let definitionText = '';
  let lineCount = 0;

  for await (const line of rl) {
    lineCount++;

    // Parse LexicalEntry
    const entryMatch = line.match(/<LexicalEntry\s+id="([^"]+)"/);
    if (entryMatch) {
      currentEntry = { id: entryMatch[1], lemmas: [], synsets: [] };
    }

    // Parse Lemma
    const lemmaMatch = line.match(/<Lemma\s+([^>]+)/);
    if (lemmaMatch && currentEntry) {
      const attrs = lemmaMatch[1];
      const formMatch = attrs.match(/writtenForm="([^"]+)"/);
      const posMatch = attrs.match(/partOfSpeech="([^"]+)"/);
      if (formMatch) {
        currentEntry.lemmas.push({
          form: decodeXmlEntities(formMatch[1]),
          pos: posMatch ? posMatch[1] : '',
        });
      }
    }

    // Parse Sense (link to synset)
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
      if (currentEntry.lemmas.length > 0) {
        entries.push(currentEntry);
      }
      currentEntry = null;
    }

    // Parse Synset
    const synsetMatch = line.match(/<Synset\s+([^>]+)>/);
    if (synsetMatch) {
      const attrs = synsetMatch[1];
      const idMatch = attrs.match(/id="([^"]+)"/);
      const posMatch = attrs.match(/partOfSpeech="([^"]+)"/);
      const iliMatch = attrs.match(/ili="([^"]*)"/);
      if (idMatch) {
        currentSynset = {
          id: idMatch[1],
          partOfSpeech: posMatch ? posMatch[1] : '',
          ili: iliMatch ? iliMatch[1] : '',
          definitions: [],
          examples: [],
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

    // Parse Example
    const exampleMatch = line.match(/<Example>([^<]*)<\/Example>/);
    if (exampleMatch && currentSynset) {
      currentSynset.examples.push(decodeXmlEntities(exampleMatch[1]));
    }

    // End of Synset
    if (line.includes('</Synset>') && currentSynset) {
      synsets.push(currentSynset);
      currentSynset = null;
    }

    if (lineCount % 200000 === 0) {
      console.log(`  Parsed ${lineCount} lines...`);
    }
  }

  console.log(`  Total lines: ${lineCount}`);
  console.log(`  Synsets: ${synsets.length}`);
  console.log(`  Lexical entries: ${entries.length}`);

  // Generate Links Notation output
  console.log('\nGenerating Links Notation output...');

  const lines = [];

  // Header
  lines.push('// Open English WordNet 2024 - Source Data');
  lines.push('// Converted from XML to Links Notation format');
  lines.push('// Source: https://en-word.net/ (CC BY 4.0)');
  lines.push(`// Generated: ${new Date().toISOString()}`);
  lines.push(`// Total synsets: ${synsets.length}`);
  lines.push(`// Total lexical entries: ${entries.length}`);
  lines.push('');

  // Synsets section
  lines.push('// === SYNSETS ===');
  lines.push('');

  for (const synset of synsets) {
    const synsetId = synset.id.replace(/[^a-z0-9]/gi, '_');

    lines.push(`(${synsetId} isa synset)`);
    lines.push(`(${synsetId} pos ${synset.partOfSpeech})`);

    if (synset.ili) {
      lines.push(`(${synsetId} ili "${synset.ili}")`);
    }

    for (const def of synset.definitions) {
      lines.push(`(${synsetId} definition "${escapeForLino(def)}")`);
    }

    for (const ex of synset.examples) {
      lines.push(`(${synsetId} example "${escapeForLino(ex)}")`);
    }

    lines.push('');
  }

  // Lexical entries section
  lines.push('// === LEXICAL ENTRIES ===');
  lines.push('');

  for (const entry of entries) {
    for (const lemma of entry.lemmas) {
      const lemmaId = lemma.form.toLowerCase().replace(/[^a-z0-9]/gi, '_');

      // Link lemma to synsets
      for (const synsetId of entry.synsets) {
        const synsetIdNorm = synsetId.replace(/[^a-z0-9]/gi, '_');
        lines.push(`(${lemmaId} sense ${synsetIdNorm})`);
      }

      // Add written form and POS if not already implied
      if (lemma.form !== lemmaId) {
        lines.push(`(${lemmaId} written_form "${escapeForLino(lemma.form)}")`);
      }
      if (lemma.pos) {
        lines.push(`(${lemmaId} pos ${lemma.pos})`);
      }
    }
  }

  // Write output
  const output = lines.join('\n');
  writeFileSync(outputPath, output);
  console.log(`\nOutput saved to: ${outputPath}`);
  console.log(`File size: ${(output.length / 1024 / 1024).toFixed(2)} MB`);
}

/**
 * Main function.
 */
async function main() {
  console.log('=== WordNet to Links Notation Converter ===\n');

  if (!existsSync(WORDNET_FILE)) {
    console.error(`Error: WordNet data file not found: ${WORDNET_FILE}`);
    console.error('Please run "npm run download" first to download the data.');
    process.exit(1);
  }

  await convertToLino(WORDNET_FILE, OUTPUT_FILE);
  console.log('\nConversion complete!');
}

main().catch((error) => {
  console.error('Error:', error.message);
  process.exit(1);
});
