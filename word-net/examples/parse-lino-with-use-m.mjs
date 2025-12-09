#!/usr/bin/env node

/**
 * Example: Parse Links Notation Files Using use-m
 *
 * This example demonstrates how to use the use-m package to dynamically
 * load the links-notation library without requiring package.json or npm install.
 *
 * The use-m approach allows you to:
 * - Load npm packages on-demand at runtime
 * - Avoid maintaining package.json and node_modules
 * - Work across different JavaScript environments (Node.js, browsers, Deno, Bun)
 *
 * Usage:
 *   node examples/parse-lino-with-use-m.mjs [input-file.lino]
 *
 * If no input file is provided, a sample will be parsed.
 *
 * Reference: https://github.com/link-foundation/use-m
 */

import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Sample Links Notation content for demonstration
const SAMPLE_LINO = `
// Sample semantic data
(entity_1 isa concept)
(entity_1 label "example")
(entity_2 relates_to entity_1)
`;

/**
 * Main function demonstrating use-m pattern
 */
async function main() {
  console.log('=== Links Notation Parser with use-m ===\n');

  try {
    // Step 1: Load the use-m helper using the recommended pattern
    // This fetch + eval pattern works universally across environments
    console.log('Loading use-m...');
    const { use } = eval(await (await fetch('https://unpkg.com/use-m/use.js')).text());
    console.log('✓ use-m loaded\n');

    // Step 2: Use use-m to dynamically import the links-notation package
    // No package.json or npm install required!
    console.log('Loading links-notation package...');
    const linoModule = await use('links-notation');
    const LinoParser = linoModule.Parser || linoModule.default?.Parser;

    if (!LinoParser) {
      throw new Error('Could not find Parser in links-notation module');
    }
    console.log('✓ links-notation loaded\n');

    // Step 3: Determine input source
    let inputContent = SAMPLE_LINO;
    let inputSource = 'sample data';

    const inputFile = process.argv[2];
    if (inputFile) {
      const absolutePath = path.isAbsolute(inputFile)
        ? inputFile
        : path.join(process.cwd(), inputFile);

      inputContent = readFileSync(absolutePath, 'utf-8');
      inputSource = inputFile;
      console.log(`Reading from: ${inputFile}\n`);
    } else {
      console.log('No input file provided, using sample data\n');
    }

    // Step 4: Parse the Links Notation content
    console.log('Parsing Links Notation...');
    const parser = new LinoParser();
    const parsed = parser.parse(inputContent);

    console.log('✓ Parsing complete\n');

    // Step 5: Display results
    console.log('=== Parsed Results ===');
    console.log(`Source: ${inputSource}`);
    console.log(`\nInput content:\n${inputContent.trim()}\n`);

    // Extract and display the parsed structure
    if (Array.isArray(parsed)) {
      console.log(`Parsed ${parsed.length} top-level statements:\n`);

      parsed.forEach((item, index) => {
        if (item.values) {
          console.log(`Statement ${index + 1}: (${item.values.join(' ')})`);
        } else if (item.id) {
          console.log(`Statement ${index + 1}: [ID: ${item.id}]`);
        } else {
          console.log(`Statement ${index + 1}:`, JSON.stringify(item));
        }
      });
    } else {
      console.log('Parsed structure:', JSON.stringify(parsed, null, 2));
    }

    console.log('\n=== Success! ===');
    console.log('\nThis demonstrates how use-m eliminates the need for:');
    console.log('  ✗ package.json');
    console.log('  ✗ npm install');
    console.log('  ✗ node_modules directory');
    console.log('\nJust run the script directly with Node.js!');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('\nStack trace:', error.stack);
    process.exit(1);
  }
}

main();
