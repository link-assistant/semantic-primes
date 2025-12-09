#!/usr/bin/env node

/**
 * Test script for NSM primes extraction
 *
 * This script verifies that NSM primes are correctly extracted from WordNet
 * and that the output file has the expected structure.
 *
 * Usage: node test-nsm-primes.mjs
 */

import { existsSync, readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, '..', 'data');
const NSM_PRIMES_FILE = path.join(DATA_DIR, 'nsm-primes.lino');

// NSM primes that should be found in WordNet (most have synsets)
const EXPECTED_NSM_PRIMES = [
  'good',
  'bad',
  'big',
  'small',
  'think',
  'know',
  'want',
  'feel',
  'see',
  'hear',
  'say',
  'true',
  'move',
  'live',
  'die',
  'body',
  'kind',
  'part',
];

// NSM primes that might not be in WordNet (function words)
const POSSIBLY_MISSING = ['you', 'this', 'i'];

function parseLinoForPrimes(content) {
  const primes = new Set();
  const lines = content.split('\n');

  for (const line of lines) {
    // Match lines like: (word isa semantic_prime)
    const match = line.match(/^\(([a-z_]+)\s+isa\s+semantic_prime\)/);
    if (match) {
      primes.add(match[1]);
    }
  }

  return primes;
}

function hasWordNetSynset(content, prime) {
  const primeId = prime.replace(/[^a-z]/g, '_');
  const pattern = new RegExp(`\\(${primeId}\\s+wordnet_synset\\s+\\w+\\)`);
  return pattern.test(content);
}

function countDefinitions(content) {
  const matches = content.match(/definition\s+"/g);
  return matches ? matches.length : 0;
}

async function main() {
  console.log('=== NSM Primes Extraction Test ===\n');

  if (!existsSync(NSM_PRIMES_FILE)) {
    console.error(`Error: NSM primes file not found: ${NSM_PRIMES_FILE}`);
    console.error('Please run "npm run extract-nsm" first.');
    process.exit(1);
  }

  const content = readFileSync(NSM_PRIMES_FILE, 'utf-8');
  const nsmPrimes = parseLinoForPrimes(content);
  const totalDefinitions = countDefinitions(content);

  console.log(`Total NSM primes in file: ${nsmPrimes.size}`);
  console.log(`Total definitions linked: ${totalDefinitions}\n`);

  // Test expected primes are present
  console.log('=== EXPECTED NSM PRIMES ===');
  let expectedPassed = true;
  for (const prime of EXPECTED_NSM_PRIMES) {
    const found = nsmPrimes.has(prime);
    const hasSynset = found && hasWordNetSynset(content, prime);
    if (found) {
      console.log(`  ✓ ${prime}: FOUND${hasSynset ? ' (with synset)' : ''}`);
    } else {
      console.log(`  ✗ ${prime}: NOT FOUND`);
      expectedPassed = false;
    }
  }

  // Check possibly missing primes
  console.log('\n=== POSSIBLY MISSING (Function Words) ===');
  for (const prime of POSSIBLY_MISSING) {
    const found = nsmPrimes.has(prime);
    if (found) {
      console.log(`  ✓ ${prime}: FOUND (unexpectedly)`);
    } else {
      console.log(`  ○ ${prime}: not found (expected - function word)`);
    }
  }

  // File structure checks
  console.log('\n=== FILE STRUCTURE ===');
  const hasHeader = content.includes('// NSM Semantic Primes');
  const hasCategories = content.includes('// === ');
  const hasAllolexes = content.includes('allolex_of');

  console.log(`  ${hasHeader ? '✓' : '✗'} Has header comment`);
  console.log(`  ${hasCategories ? '✓' : '✗'} Has category sections`);
  console.log(`  ${hasAllolexes ? '✓' : '✗'} Has allolex relationships`);

  // Summary
  console.log('\n=== SUMMARY ===');
  console.log(`Expected primes found: ${EXPECTED_NSM_PRIMES.filter(p => nsmPrimes.has(p)).length}/${EXPECTED_NSM_PRIMES.length}`);
  console.log(`Total NSM primes: ${nsmPrimes.size}`);
  console.log(`File well-formed: ${hasHeader && hasCategories}`);

  if (!expectedPassed) {
    console.log('\n❌ TESTS FAILED: Some expected NSM primes not found');
    process.exit(1);
  }

  if (!hasHeader || !hasCategories) {
    console.log('\n⚠️  WARNING: File structure issues detected');
  }

  console.log('\n✓ All NSM primes tests passed!');
  process.exit(0);
}

main().catch((error) => {
  console.error('Error:', error.message);
  process.exit(1);
});
