const fs = require('fs');
const readline = require('readline');

async function regenerate() {
  const inputPath = '../data/wordnet-source.lino';
  const outputPath = '../data/wordnet-source-new.lino';

  // Create read stream
  const input = fs.createReadStream(inputPath, 'utf8');
  const output = fs.createWriteStream(outputPath, 'utf8');

  const rl = readline.createInterface({ input });

  // Map short pos to full words
  const posMap = {
    'n': 'noun',
    'v': 'verb',
    'a': 'adjective',
    's': 'adjective satellite',
    'r': 'adverb'
  };

  // Collect data for each entity
  const entities = new Map();
  let currentSection = null;
  let lineCount = 0;
  let skipComments = true;

  for await (const line of rl) {
    lineCount++;

    if (lineCount % 100000 === 0) {
      console.log(`Processed ${lineCount} lines...`);
    }

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

    // Initialize entity if needed
    if (!entities.has(subject)) {
      entities.set(subject, {
        type: null,
        pos: null,
        ili: null,
        definition: null,
        examples: [],
        lemma: null,
        sense: null,
        synset: null
      });
    }

    const entity = entities.get(subject);

    // Process based on predicate
    switch (predicate) {
      case 'isa':
        entity.type = object;
        break;
      case 'pos':
        entity.pos = object;
        break;
      case 'ili':
        entity.ili = object;
        break;
      case 'definition':
        entity.definition = object;
        break;
      case 'example':
        entity.examples.push(object);
        break;
      case 'lemma':
        entity.lemma = object;
        break;
      case 'sense':
        entity.sense = object;
        break;
      case 'synset':
        entity.synset = object;
        break;
    }
  }

  console.log(`\nParsed ${entities.size} entities from ${lineCount} lines`);
  console.log('Writing output file...');

  // Group entities by type
  const synsets = [];
  const lexicalEntries = [];

  for (const [id, data] of entities) {
    if (data.type === 'synset') {
      synsets.push([id, data]);
    } else if (data.type === 'lexical_entry') {
      lexicalEntries.push([id, data]);
    }
  }

  console.log(`Synsets: ${synsets.length}`);
  console.log(`Lexical entries: ${lexicalEntries.length}`);

  // Write header section
  output.write('synset_collection:\n');
  output.write('  is a collection of word senses from Open English WordNet 2024\n');
  output.write(`  contains ${synsets.length} synsets\n`);
  output.write(`  contains ${lexicalEntries.length} lexical entries\n\n`);

  // Write synsets
  for (const [id, data] of synsets) {
    output.write(`\n${id}:\n`);
    output.write('  is a synset\n');

    if (data.pos) {
      const fullPos = posMap[data.pos] || data.pos;
      output.write(`  has part of speech ${fullPos}\n`);
    }
    if (data.ili) {
      output.write(`  has interlingual index ${data.ili}\n`);
    }
    if (data.definition) {
      output.write(`  is defined as "${data.definition}"\n`);
    }
    for (const example of data.examples) {
      output.write(`  has example "${example}"\n`);
    }
  }

  // Write lexical entries
  output.write('\n');
  for (const [id, data] of lexicalEntries) {
    output.write(`\n${id}:\n`);
    output.write('  is a lexical entry\n');

    if (data.lemma) {
      output.write(`  has lemma ${data.lemma}\n`);
    }
    if (data.pos) {
      const fullPos = posMap[data.pos] || data.pos;
      output.write(`  has part of speech ${fullPos}\n`);
    }
    if (data.sense) {
      output.write(`  has sense ${data.sense}\n`);
    }
    if (data.synset) {
      output.write(`  belongs to synset ${data.synset}\n`);
    }
  }

  output.end();

  console.log('Done! Output written to', outputPath);
}

regenerate().catch(console.error);
