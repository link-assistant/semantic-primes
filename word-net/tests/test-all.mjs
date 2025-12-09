#!/usr/bin/env node

/**
 * Run all tests in sequence
 *
 * This script runs all test suites and reports overall results.
 *
 * Usage: node test-all.mjs
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const tests = [
  { name: 'Source Data', script: 'test-source-data.mjs' },
  { name: 'NSM Primes', script: 'test-nsm-primes.mjs' },
  { name: 'Discovery', script: 'test-discovery.mjs' },
];

function runTest(testName, scriptPath) {
  return new Promise((resolve) => {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Running: ${testName}`);
    console.log('='.repeat(60));

    const proc = spawn('node', [scriptPath], {
      cwd: __dirname,
      stdio: 'inherit',
    });

    proc.on('close', (code) => {
      resolve({ name: testName, passed: code === 0, code });
    });

    proc.on('error', (err) => {
      console.error(`Failed to run ${testName}: ${err.message}`);
      resolve({ name: testName, passed: false, code: 1 });
    });
  });
}

async function main() {
  console.log('='.repeat(60));
  console.log('       SEMANTIC PRIMES - FULL TEST SUITE');
  console.log('='.repeat(60));

  const results = [];

  for (const test of tests) {
    const scriptPath = path.join(__dirname, test.script);
    const result = await runTest(test.name, scriptPath);
    results.push(result);
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('                    SUMMARY');
  console.log('='.repeat(60));

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;

  for (const result of results) {
    const status = result.passed ? '✓ PASSED' : '✗ FAILED';
    console.log(`  ${status}: ${result.name}`);
  }

  console.log('');
  console.log(`Total: ${passed} passed, ${failed} failed out of ${results.length} tests`);
  console.log('='.repeat(60));

  if (failed > 0) {
    process.exit(1);
  }

  console.log('\n✓ All test suites passed!');
  process.exit(0);
}

main().catch((error) => {
  console.error('Error:', error.message);
  process.exit(1);
});
