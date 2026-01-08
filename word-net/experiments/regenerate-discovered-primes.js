const fs = require('fs');

// Read the original file
const content = fs.readFileSync('../data/discovered-primes.lino', 'utf8');

const lines = content.split('\n');

// Data structures
const primes = new Map(); // prime -> {score, inCircular, sccSize, hasSelfLoop, refCount, hasSelfRef, definition, pos, sccSample}

// Parse each line
for (const line of lines) {
  const trimmed = line.trim();

  // Skip empty lines and comments
  if (!trimmed || trimmed.startsWith('//')) continue;

  // Match triplet pattern
  const tripletMatch = trimmed.match(/^\((\S+)\s+(\S+)\s+(.+)\)$/);
  if (!tripletMatch) continue;

  const [, subject, predicate, rawObject] = tripletMatch;

  // Remove quotes if present
  let object = rawObject;
  if (rawObject.startsWith('"') && rawObject.endsWith('"')) {
    object = rawObject.slice(1, -1);
  }

  // Initialize prime if needed
  if (!primes.has(subject)) {
    primes.set(subject, {
      score: null,
      inCircular: null,
      sccSize: null,
      hasSelfLoop: null,
      refCount: null,
      hasSelfRef: null,
      definition: null,
      pos: null,
      sccSample: null
    });
  }

  const prime = primes.get(subject);

  // Process based on predicate
  switch (predicate) {
    case 'isa':
      // Already handled
      break;
    case 'prime_score':
      prime.score = parseFloat(object);
      break;
    case 'in_circular_definition':
      prime.inCircular = object === 'true';
      break;
    case 'scc_size':
      prime.sccSize = parseInt(object);
      break;
    case 'has_self_loop':
      prime.hasSelfLoop = object === 'true';
      break;
    case 'reference_count':
      prime.refCount = parseInt(object);
      break;
    case 'has_self_reference':
      prime.hasSelfRef = object === 'true';
      break;
    case 'definition':
      prime.definition = object;
      break;
    case 'pos':
      prime.pos = object;
      break;
    case 'scc_sample':
      prime.sccSample = object;
      break;
  }
}

// Map short pos to full words
const posMap = {
  'n': 'noun',
  'v': 'verb',
  'a': 'adjective',
  's': 'adjective satellite',
  'r': 'adverb'
};

// Group by confidence level
const highConfidence = [];
const mediumConfidence = [];
const lowConfidence = [];

for (const [name, data] of primes) {
  if (data.score >= 80) {
    highConfidence.push([name, data]);
  } else if (data.score >= 50) {
    mediumConfidence.push([name, data]);
  } else {
    lowConfidence.push([name, data]);
  }
}

// Sort by score descending
highConfidence.sort((a, b) => b[1].score - a[1].score);
mediumConfidence.sort((a, b) => b[1].score - a[1].score);
lowConfidence.sort((a, b) => b[1].score - a[1].score);

// Generate output
let output = '';

// Helper function to generate entries
function generatePrimeEntries(primeList) {
  let result = '';
  for (const [name, data] of primeList) {
    result += `\n${name}:\n`;
    result += `  is a discovered semantic prime\n`;

    if (data.score !== null) {
      result += `  has prime score ${data.score}\n`;
    }
    if (data.inCircular !== null) {
      result += `  ${data.inCircular ? 'is' : 'is not'} in circular definition\n`;
    }
    if (data.sccSize !== null) {
      result += `  has strongly connected component size ${data.sccSize}\n`;
    }
    if (data.hasSelfLoop !== null) {
      result += `  ${data.hasSelfLoop ? 'has' : 'does not have'} self loop\n`;
    }
    if (data.refCount !== null) {
      result += `  has reference count ${data.refCount}\n`;
    }
    if (data.hasSelfRef !== null) {
      result += `  ${data.hasSelfRef ? 'has' : 'does not have'} self reference\n`;
    }
    if (data.definition) {
      result += `  is defined as "${data.definition}"\n`;
    }
    if (data.pos) {
      const fullPos = posMap[data.pos] || data.pos;
      result += `  has part of speech ${fullPos}\n`;
    }
    if (data.sccSample) {
      result += `  has sample related words "${data.sccSample}"\n`;
    }
  }
  return result;
}

// Add high confidence section
output += `high_confidence_primes:\n`;
output += `  is a category of discovered primes\n`;
output += `  requires minimum score 80\n`;
output += `  contains ${highConfidence.length} primes\n`;
output += generatePrimeEntries(highConfidence);

// Add medium confidence section
output += `\nmedium_confidence_primes:\n`;
output += `  is a category of discovered primes\n`;
output += `  requires minimum score 50\n`;
output += `  contains ${mediumConfidence.length} primes\n`;
output += generatePrimeEntries(mediumConfidence);

// Add low confidence section
output += `\nlow_confidence_primes:\n`;
output += `  is a category of discovered primes\n`;
output += `  requires score below 50\n`;
output += `  contains ${lowConfidence.length} primes\n`;
output += generatePrimeEntries(lowConfidence);

// Write output
fs.writeFileSync('../data/discovered-primes-new.lino', output.trim() + '\n');

console.log('Generated discovered-primes-new.lino');
console.log('Total primes:', primes.size);
console.log('High confidence:', highConfidence.length);
console.log('Medium confidence:', mediumConfidence.length);
console.log('Low confidence:', lowConfidence.length);

// Show sample
console.log('\nFirst 50 lines of output:');
console.log(output.split('\n').slice(0, 50).join('\n'));
