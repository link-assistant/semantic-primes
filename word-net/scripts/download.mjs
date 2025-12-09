#!/usr/bin/env node

/**
 * Download script for Open English WordNet data.
 *
 * Downloads the WordNet XML database from the official source.
 *
 * Source: Open English WordNet (https://en-word.net/)
 * License: CC BY 4.0
 */

import { createWriteStream, existsSync, mkdirSync } from 'fs';
import { createGunzip } from 'zlib';
import { pipeline } from 'stream/promises';
import https from 'https';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const WORDNET_URL = 'https://en-word.net/static/english-wordnet-2024.xml.gz';
const DATA_DIR = path.join(__dirname, '..', 'data');
const OUTPUT_FILE = path.join(DATA_DIR, 'english-wordnet-2024.xml');

/**
 * Download a file from URL with progress indication.
 * @param {string} url - URL to download from
 * @param {string} outputPath - Path to save the file
 * @returns {Promise<void>}
 */
function downloadFile(url, outputPath) {
  return new Promise((resolve, reject) => {
    console.log(`Downloading from: ${url}`);
    console.log(`Saving to: ${outputPath}`);

    const request = https.get(url, (response) => {
      // Handle redirects
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        console.log(`Following redirect to: ${response.headers.location}`);
        downloadFile(response.headers.location, outputPath)
          .then(resolve)
          .catch(reject);
        return;
      }

      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}: Failed to download file`));
        return;
      }

      const totalSize = parseInt(response.headers['content-length'], 10);
      let downloadedSize = 0;
      let lastLoggedPercent = 0;

      response.on('data', (chunk) => {
        downloadedSize += chunk.length;
        const percent = totalSize ? Math.floor((downloadedSize / totalSize) * 100) : 0;

        // Log progress every 10%
        if (percent >= lastLoggedPercent + 10) {
          console.log(`Progress: ${percent}% (${(downloadedSize / 1024 / 1024).toFixed(2)} MB)`);
          lastLoggedPercent = percent - (percent % 10);
        }
      });

      // Create gunzip stream for decompression
      const gunzip = createGunzip();
      const fileStream = createWriteStream(outputPath);

      gunzip.on('error', (err) => {
        reject(new Error(`Decompression error: ${err.message}`));
      });

      fileStream.on('error', (err) => {
        reject(new Error(`File write error: ${err.message}`));
      });

      fileStream.on('finish', () => {
        console.log('Download and decompression complete!');
        resolve();
      });

      // Pipe: response -> gunzip -> file
      response.pipe(gunzip).pipe(fileStream);
    });

    request.on('error', (err) => {
      reject(new Error(`Network error: ${err.message}`));
    });
  });
}

/**
 * Main function to download WordNet data.
 */
async function main() {
  console.log('=== WordNet Data Download Script ===\n');

  // Create data directory if it doesn't exist
  if (!existsSync(DATA_DIR)) {
    console.log(`Creating data directory: ${DATA_DIR}`);
    mkdirSync(DATA_DIR, { recursive: true });
  }

  // Check if file already exists
  if (existsSync(OUTPUT_FILE)) {
    console.log(`File already exists: ${OUTPUT_FILE}`);
    console.log('To re-download, delete the existing file first.');
    return;
  }

  try {
    await downloadFile(WORDNET_URL, OUTPUT_FILE);
    console.log('\nWordNet data downloaded successfully!');
    console.log(`Location: ${OUTPUT_FILE}`);
  } catch (error) {
    console.error(`\nError downloading WordNet data: ${error.message}`);
    process.exit(1);
  }
}

main();
