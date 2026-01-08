const fs = require('fs');

// Read the original file
const content = fs.readFileSync('../data/nsm-primes.lino', 'utf8');

// Parse the original format which is triplets in parentheses
// Format: (subject predicate object)
const lines = content.split('\n');

// Data structures
const primes = new Map(); // prime -> {category, allolexes, synsets}
const synsets = new Map(); // synset_id -> {definition, pos, ili}

// Parse each line
for (const line of lines) {
  const trimmed = line.trim();

  // Skip empty lines and comments
  if (!trimmed || trimmed.startsWith('//')) continue;

  // Match triplet pattern: (subject predicate object) or (subject predicate "object with spaces")
  const tripletMatch = trimmed.match(/^\((\S+)\s+(\S+)\s+(.+)\)$/);
  if (!tripletMatch) continue;

  const [, subject, predicate, rawObject] = tripletMatch;

  // Remove quotes if present
  let object = rawObject;
  if (rawObject.startsWith('"') && rawObject.endsWith('"')) {
    object = rawObject.slice(1, -1);
  }

  // Process based on predicate
  if (predicate === 'isa' && object === 'semantic_prime') {
    if (!primes.has(subject)) {
      primes.set(subject, { category: null, allolexes: [], synsets: [] });
    }
  } else if (predicate === 'category') {
    const prime = primes.get(subject);
    if (prime) {
      prime.category = object;
    }
  } else if (predicate === 'allolex_of') {
    const prime = primes.get(object);
    if (prime) {
      prime.allolexes.push(subject);
    }
  } else if (predicate === 'wordnet_synset') {
    const prime = primes.get(subject);
    if (prime) {
      prime.synsets.push(object);
      if (!synsets.has(object)) {
        synsets.set(object, { definition: null, pos: null, ili: null });
      }
    }
  } else if (predicate === 'definition') {
    const synset = synsets.get(subject);
    if (synset) {
      synset.definition = object;
    }
  } else if (predicate === 'pos') {
    const synset = synsets.get(subject);
    if (synset) {
      synset.pos = object;
    }
  } else if (predicate === 'ili') {
    const synset = synsets.get(subject);
    if (synset) {
      synset.ili = object;
    }
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

// Map categories to readable format
const categoryMap = {
  'substantives': 'substantives',
  'relationalSubstantives': 'relational substantives',
  'determiners': 'determiners',
  'quantifiers': 'quantifiers',
  'evaluators': 'evaluators',
  'descriptors': 'descriptors',
  'mentalPredicates': 'mental predicates',
  'speech': 'speech',
  'actionsEventsMovement': 'actions events movement',
  'locationExistenceSpecification': 'location existence specification',
  'possession': 'possession',
  'lifeAndDeath': 'life and death',
  'time': 'time',
  'space': 'space',
  'logicalConcepts': 'logical concepts',
  'intensifierAugmentor': 'intensifier augmentor',
  'similarity': 'similarity'
};

// Group primes by category for organization
const primesByCategory = new Map();
for (const [name, data] of primes) {
  const cat = data.category || 'uncategorized';
  if (!primesByCategory.has(cat)) {
    primesByCategory.set(cat, []);
  }
  primesByCategory.get(cat).push([name, data]);
}

// Generate output
let output = '';

// Process each category
const categoryOrder = [
  'substantives',
  'relationalSubstantives',
  'determiners',
  'quantifiers',
  'evaluators',
  'descriptors',
  'mentalPredicates',
  'speech',
  'actionsEventsMovement',
  'locationExistenceSpecification',
  'possession',
  'lifeAndDeath',
  'time',
  'space',
  'logicalConcepts',
  'intensifierAugmentor',
  'similarity'
];

for (const category of categoryOrder) {
  const categoryPrimes = primesByCategory.get(category);
  if (!categoryPrimes) continue;

  const readableCategory = categoryMap[category] || category;

  // Add category section header as a link (no colons in free text to avoid parse errors)
  output += `\n${readableCategory}:\n`;

  for (const [primeName, data] of categoryPrimes) {
    // Add prime as separate linked entity
    output += `\n${primeName}:\n`;
    output += `  is a semantic prime\n`;
    output += `  has category ${readableCategory}\n`;

    // Add alternative forms (allolexes)
    for (const allolex of data.allolexes) {
      output += `  has alternative form ${allolex}\n`;
    }

    // Add references to word meanings (synsets)
    for (const synsetId of data.synsets) {
      output += `  has word meaning ${synsetId}\n`;
    }
  }
}

// Now add all synset definitions
output += '\n';

for (const [synsetId, data] of synsets) {
  output += `\n${synsetId}:\n`;
  if (data.definition) {
    // Escape any problematic characters in definition
    const escapedDef = data.definition.replace(/"/g, '""');
    output += `  is defined as "${escapedDef}"\n`;
  }
  if (data.pos) {
    const fullPos = posMap[data.pos] || data.pos;
    output += `  has part of speech ${fullPos}\n`;
  }
  if (data.ili) {
    output += `  has interlingual index ${data.ili}\n`;
  }
}

// Write output
fs.writeFileSync('../data/nsm-primes-new.lino', output.trim() + '\n');

console.log('Generated nsm-primes-new.lino');
console.log('Total primes:', primes.size);
console.log('Total synsets:', synsets.size);

// Show sample
console.log('\nFirst 80 lines of output:');
console.log(output.split('\n').slice(0, 80).join('\n'));
