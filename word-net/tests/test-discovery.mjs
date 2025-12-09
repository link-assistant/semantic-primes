#!/usr/bin/env node

/**
 * Test script for semantic primes discovery
 *
 * This script verifies that key expected words are found as semantic primes
 * and reports any issues with the discovery algorithm.
 *
 * Usage: node test-discovery.mjs
 */

import { existsSync, readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, '..', 'data');
const DISCOVERED_PRIMES_FILE = path.join(DATA_DIR, 'discovered-primes.lino');

// Key words that MUST be discovered as semantic primes
// These are fundamental concepts that should be part of circular definition chains
const MUST_FIND = [
  'entity',
  'thing',
  'time',
  'body',
  'make',
  'existence',
  'person',
  'form',
  'work',
  'move',
];

// Words that are expected to be primes if they have circular definitions
const EXPECTED_PRIMES = [
  'small',
  'large',
  'side',
  'head',
  'name',
  'use',
  'end',
  'line',
  'back',
  'air',
];

function parseLinoForWords(content) {
  const words = new Set();
  const lines = content.split('\n');

  for (const line of lines) {
    // Match lines like: (word isa discovered_semantic_prime)
    const match = line.match(/^\(([a-z0-9_]+)\s+isa\s+discovered_semantic_prime\)/);
    if (match) {
      words.add(match[1]);
    }
  }

  return words;
}

function getWordScore(content, word) {
  const wordId = word.replace(/[^a-z0-9]/gi, '_');
  const pattern = new RegExp(`\\(${wordId}\\s+prime_score\\s+([0-9.]+)\\)`);
  const match = content.match(pattern);
  return match ? parseFloat(match[1]) : null;
}

async function main() {
  console.log('=== Semantic Primes Discovery Test ===\n');

  if (!existsSync(DISCOVERED_PRIMES_FILE)) {
    console.error(`Error: Discovered primes file not found: ${DISCOVERED_PRIMES_FILE}`);
    console.error('Please run "npm run discover" first.');
    process.exit(1);
  }

  const content = readFileSync(DISCOVERED_PRIMES_FILE, 'utf-8');
  const discoveredWords = parseLinoForWords(content);

  console.log(`Total discovered primes: ${discoveredWords.size}\n`);

  // Test MUST_FIND words
  console.log('=== MUST FIND (Critical) ===');
  let mustFindPassed = true;
  for (const word of MUST_FIND) {
    const found = discoveredWords.has(word);
    const score = found ? getWordScore(content, word) : null;
    if (found) {
      console.log(`  ✓ ${word}: FOUND (score=${score?.toFixed(1) || 'N/A'})`);
    } else {
      console.log(`  ✗ ${word}: NOT FOUND - CRITICAL ERROR`);
      mustFindPassed = false;
    }
  }

  // Test EXPECTED_PRIMES words
  console.log('\n=== EXPECTED PRIMES ===');
  let expectedFound = 0;
  for (const word of EXPECTED_PRIMES) {
    const found = discoveredWords.has(word);
    const score = found ? getWordScore(content, word) : null;
    if (found) {
      console.log(`  ✓ ${word}: FOUND (score=${score?.toFixed(1) || 'N/A'})`);
      expectedFound++;
    } else {
      console.log(`  ○ ${word}: not found`);
    }
  }

  // Summary
  console.log('\n=== SUMMARY ===');
  console.log(`MUST FIND: ${MUST_FIND.filter(w => discoveredWords.has(w)).length}/${MUST_FIND.length}`);
  console.log(`EXPECTED: ${expectedFound}/${EXPECTED_PRIMES.length}`);
  console.log(`Total primes: ${discoveredWords.size}`);

  if (!mustFindPassed) {
    console.log('\n❌ TESTS FAILED: Critical words not found');
    process.exit(1);
  }

  console.log('\n✓ All critical tests passed!');
  process.exit(0);
}

main().catch((error) => {
  console.error('Error:', error.message);
  process.exit(1);
});
