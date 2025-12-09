/**
 * Semantic Primes Definition Module
 *
 * Based on the Natural Semantic Metalanguage (NSM) theory by Anna Wierzbicka
 * and Cliff Goddard. These 65 semantic primes are considered universal
 * concepts that exist in all languages.
 *
 * Reference: Wierzbicka, A. (1996). Semantics: Primes and universals.
 *            Oxford, UK: Oxford University Press.
 *
 * The tilde (~) indicates "allolex" variants - alternative lexical
 * expressions with equivalent meanings within a language.
 */

/**
 * Semantic primes organized by category as defined in NSM theory.
 * Each entry contains:
 *   - prime: the canonical form
 *   - allolexes: alternative lexical forms (if any)
 *   - searchTerms: terms to search for in WordNet
 */
export const SEMANTIC_PRIMES = {
  // === SUBSTANTIVES ===
  substantives: [
    { prime: 'I', allolexes: ['ME'], searchTerms: ['I', 'me', 'self'] },
    { prime: 'YOU', allolexes: [], searchTerms: ['you'] },
    { prime: 'SOMEONE', allolexes: ['PERSON'], searchTerms: ['someone', 'person', 'somebody'] },
    { prime: 'PEOPLE', allolexes: [], searchTerms: ['people', 'persons'] },
    { prime: 'SOMETHING', allolexes: ['THING'], searchTerms: ['something', 'thing'] },
    { prime: 'BODY', allolexes: [], searchTerms: ['body'] },
  ],

  // === RELATIONAL SUBSTANTIVES ===
  relationalSubstantives: [
    { prime: 'KIND', allolexes: ['SORT'], searchTerms: ['kind', 'sort', 'type'] },
    { prime: 'PART', allolexes: [], searchTerms: ['part'] },
  ],

  // === DETERMINERS ===
  determiners: [
    { prime: 'THIS', allolexes: [], searchTerms: ['this'] },
    { prime: 'THE SAME', allolexes: [], searchTerms: ['same', 'identical'] },
    { prime: 'OTHER', allolexes: ['ELSE'], searchTerms: ['other', 'else', 'another'] },
  ],

  // === QUANTIFIERS ===
  quantifiers: [
    { prime: 'ONE', allolexes: [], searchTerms: ['one'] },
    { prime: 'TWO', allolexes: [], searchTerms: ['two'] },
    { prime: 'SOME', allolexes: [], searchTerms: ['some'] },
    { prime: 'ALL', allolexes: [], searchTerms: ['all', 'every'] },
    { prime: 'MUCH', allolexes: ['MANY'], searchTerms: ['much', 'many'] },
    { prime: 'LITTLE', allolexes: ['FEW'], searchTerms: ['little', 'few'] },
  ],

  // === EVALUATORS ===
  evaluators: [
    { prime: 'GOOD', allolexes: [], searchTerms: ['good'] },
    { prime: 'BAD', allolexes: [], searchTerms: ['bad'] },
  ],

  // === DESCRIPTORS ===
  descriptors: [
    { prime: 'BIG', allolexes: ['LARGE'], searchTerms: ['big', 'large'] },
    { prime: 'SMALL', allolexes: [], searchTerms: ['small', 'little'] },
  ],

  // === MENTAL PREDICATES ===
  mentalPredicates: [
    { prime: 'THINK', allolexes: [], searchTerms: ['think'] },
    { prime: 'KNOW', allolexes: [], searchTerms: ['know'] },
    { prime: 'WANT', allolexes: [], searchTerms: ['want'] },
    { prime: 'FEEL', allolexes: [], searchTerms: ['feel'] },
    { prime: 'SEE', allolexes: [], searchTerms: ['see'] },
    { prime: 'HEAR', allolexes: [], searchTerms: ['hear'] },
  ],

  // === SPEECH ===
  speech: [
    { prime: 'SAY', allolexes: [], searchTerms: ['say'] },
    { prime: 'WORDS', allolexes: [], searchTerms: ['word', 'words'] },
    { prime: 'TRUE', allolexes: [], searchTerms: ['true', 'truth'] },
  ],

  // === ACTIONS, EVENTS, MOVEMENT ===
  actionsEventsMovement: [
    { prime: 'DO', allolexes: [], searchTerms: ['do'] },
    { prime: 'HAPPEN', allolexes: [], searchTerms: ['happen', 'occur'] },
    { prime: 'MOVE', allolexes: [], searchTerms: ['move'] },
  ],

  // === LOCATION, EXISTENCE, SPECIFICATION ===
  locationExistenceSpecification: [
    { prime: 'BE (SOMEWHERE)', allolexes: ['BE AT'], searchTerms: ['be', 'exist', 'located'] },
    { prime: 'THERE IS', allolexes: ['EXIST'], searchTerms: ['exist', 'existence'] },
    { prime: 'BE (SOMEONE/SOMETHING)', allolexes: [], searchTerms: ['be', 'being'] },
  ],

  // === POSSESSION ===
  possession: [
    { prime: 'MINE', allolexes: ['HAVE'], searchTerms: ['have', 'possess', 'own'] },
  ],

  // === LIFE AND DEATH ===
  lifeAndDeath: [
    { prime: 'LIVE', allolexes: [], searchTerms: ['live', 'alive', 'life'] },
    { prime: 'DIE', allolexes: [], searchTerms: ['die', 'death'] },
  ],

  // === TIME ===
  time: [
    { prime: 'WHEN', allolexes: ['TIME'], searchTerms: ['when', 'time'] },
    { prime: 'NOW', allolexes: [], searchTerms: ['now', 'present'] },
    { prime: 'BEFORE', allolexes: [], searchTerms: ['before'] },
    { prime: 'AFTER', allolexes: [], searchTerms: ['after'] },
    { prime: 'A LONG TIME', allolexes: [], searchTerms: ['long'] },
    { prime: 'A SHORT TIME', allolexes: [], searchTerms: ['short', 'brief'] },
    { prime: 'FOR SOME TIME', allolexes: [], searchTerms: ['while', 'duration'] },
    { prime: 'MOMENT', allolexes: ['INSTANT'], searchTerms: ['moment', 'instant'] },
  ],

  // === SPACE ===
  space: [
    { prime: 'WHERE', allolexes: ['PLACE'], searchTerms: ['where', 'place'] },
    { prime: 'HERE', allolexes: [], searchTerms: ['here'] },
    { prime: 'ABOVE', allolexes: [], searchTerms: ['above', 'over'] },
    { prime: 'BELOW', allolexes: [], searchTerms: ['below', 'under'] },
    { prime: 'FAR', allolexes: [], searchTerms: ['far', 'distant'] },
    { prime: 'NEAR', allolexes: ['CLOSE'], searchTerms: ['near', 'close'] },
    { prime: 'SIDE', allolexes: [], searchTerms: ['side'] },
    { prime: 'INSIDE', allolexes: [], searchTerms: ['inside', 'within'] },
    { prime: 'TOUCH', allolexes: ['CONTACT'], searchTerms: ['touch', 'contact'] },
  ],

  // === LOGICAL CONCEPTS ===
  logicalConcepts: [
    { prime: 'NOT', allolexes: [], searchTerms: ['not', 'negation'] },
    { prime: 'MAYBE', allolexes: ['PERHAPS'], searchTerms: ['maybe', 'perhaps', 'possible'] },
    { prime: 'CAN', allolexes: ['POSSIBLE'], searchTerms: ['can', 'able', 'possible'] },
    { prime: 'BECAUSE', allolexes: [], searchTerms: ['because', 'cause'] },
    { prime: 'IF', allolexes: [], searchTerms: ['if', 'condition'] },
  ],

  // === INTENSIFIER, AUGMENTOR ===
  intensifierAugmentor: [
    { prime: 'VERY', allolexes: [], searchTerms: ['very', 'extremely'] },
    { prime: 'MORE', allolexes: [], searchTerms: ['more'] },
  ],

  // === SIMILARITY ===
  similarity: [
    { prime: 'LIKE', allolexes: ['AS', 'WAY'], searchTerms: ['like', 'similar', 'way'] },
  ],
};

/**
 * Get a flat list of all semantic primes with their categories.
 * @returns {Array} Array of prime objects with category info
 */
export function getAllPrimes() {
  const result = [];
  for (const [category, primes] of Object.entries(SEMANTIC_PRIMES)) {
    for (const prime of primes) {
      result.push({
        ...prime,
        category,
      });
    }
  }
  return result;
}

/**
 * Get the total count of semantic primes.
 * @returns {number} Total count
 */
export function getPrimeCount() {
  return getAllPrimes().length;
}
