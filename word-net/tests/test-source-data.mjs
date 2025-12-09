#!/usr/bin/env node

/**
 * Test script for WordNet source data conversion
 *
 * This script verifies that the WordNet source data is correctly converted
 * to Links Notation format with proper structure.
 *
 * Usage: node test-source-data.mjs
 */

import { existsSync, readFileSync, statSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, '..', 'data');
const SOURCE_FILE = path.join(DATA_DIR, 'wordnet-source.lino');

// Expected content characteristics
const MIN_FILE_SIZE_MB = 30;  // Should be ~38MB
const MIN_SYNSETS = 100000;   // WordNet has ~117k synsets
const MIN_ENTRIES = 100000;   // Should have many lexical entries

function countMatches(content, pattern) {
  const matches = content.match(pattern);
  return matches ? matches.length : 0;
}

function getSampleLines(content, pattern, count = 3) {
  const lines = content.split('\n');
  const samples = [];
  for (const line of lines) {
    if (pattern.test(line)) {
      samples.push(line.substring(0, 100) + (line.length > 100 ? '...' : ''));
      if (samples.length >= count) break;
    }
  }
  return samples;
}

async function main() {
  console.log('=== WordNet Source Data Test ===\n');

  if (!existsSync(SOURCE_FILE)) {
    console.error(`Error: Source file not found: ${SOURCE_FILE}`);
    console.error('Please run "npm run convert" first.');
    process.exit(1);
  }

  // Check file size
  const stats = statSync(SOURCE_FILE);
  const fileSizeMB = stats.size / (1024 * 1024);
  console.log(`File size: ${fileSizeMB.toFixed(2)} MB`);

  const content = readFileSync(SOURCE_FILE, 'utf-8');

  // Count key elements
  const synsetCount = countMatches(content, /\(\w+ isa synset\)/g);
  const definitionCount = countMatches(content, /\(\w+ definition "/g);
  const senseCount = countMatches(content, /\(\w+ sense \w+\)/g);
  const posCount = countMatches(content, /\(\w+ pos [a-z]+\)/g);

  console.log(`\nData counts:`);
  console.log(`  Synsets (isa synset): ${synsetCount}`);
  console.log(`  Definitions: ${definitionCount}`);
  console.log(`  Sense relations: ${senseCount}`);
  console.log(`  Part of speech tags: ${posCount}`);

  // Verify structure
  console.log('\n=== STRUCTURE VERIFICATION ===');

  const hasHeader = content.includes('// Open English WordNet');
  const hasSynsetSection = content.includes('// === SYNSETS ===');
  const hasEntriesSection = content.includes('// === LEXICAL ENTRIES ===');
  const hasILI = content.includes('ili "i');

  console.log(`  ${hasHeader ? '✓' : '✗'} Has header comment`);
  console.log(`  ${hasSynsetSection ? '✓' : '✗'} Has synsets section`);
  console.log(`  ${hasEntriesSection ? '✓' : '✗'} Has lexical entries section`);
  console.log(`  ${hasILI ? '✓' : '✗'} Has ILI (Inter-Lingual Index) references`);

  // Sample entries
  console.log('\n=== SAMPLE ENTRIES ===');
  console.log('\nSynset samples:');
  const synsetSamples = getSampleLines(content, /^\(\w+ isa synset\)/);
  synsetSamples.forEach(s => console.log(`  ${s}`));

  console.log('\nDefinition samples:');
  const defSamples = getSampleLines(content, /^\(\w+ definition "/);
  defSamples.forEach(s => console.log(`  ${s}`));

  console.log('\nSense samples:');
  const senseSamples = getSampleLines(content, /^\(\w+ sense \w+\)/);
  senseSamples.forEach(s => console.log(`  ${s}`));

  // Validation
  console.log('\n=== VALIDATION ===');

  const sizeOk = fileSizeMB >= MIN_FILE_SIZE_MB;
  const synsetOk = synsetCount >= MIN_SYNSETS;
  const entriesOk = senseCount >= MIN_ENTRIES;
  const structureOk = hasHeader && hasSynsetSection && hasEntriesSection;

  console.log(`  ${sizeOk ? '✓' : '✗'} File size >= ${MIN_FILE_SIZE_MB}MB (actual: ${fileSizeMB.toFixed(2)}MB)`);
  console.log(`  ${synsetOk ? '✓' : '✗'} Synsets >= ${MIN_SYNSETS} (actual: ${synsetCount})`);
  console.log(`  ${entriesOk ? '✓' : '✗'} Sense relations >= ${MIN_ENTRIES} (actual: ${senseCount})`);
  console.log(`  ${structureOk ? '✓' : '✗'} File structure is correct`);

  const allPassed = sizeOk && synsetOk && entriesOk && structureOk;

  if (!allPassed) {
    console.log('\n❌ TESTS FAILED: Source data validation issues');
    process.exit(1);
  }

  console.log('\n✓ All source data tests passed!');
  process.exit(0);
}

main().catch((error) => {
  console.error('Error:', error.message);
  process.exit(1);
});
