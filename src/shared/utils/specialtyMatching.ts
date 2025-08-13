/**
 * Shared specialty matching utilities for the Survey Aggregator application
 * These functions handle specialty name normalization and fuzzy matching
 */

/**
 * Normalizes a specialty name for comparison
 * 
 * @param specialty - Raw specialty name to normalize
 * @returns Normalized specialty name
 * 
 * @example
 * ```typescript
 * normalizeSpecialty('Cardiology & Heart Surgery'); // Returns "cardiology heart surgery"
 * ```
 */
export const normalizeSpecialty = (specialty: string): string => {
  return specialty.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
};

/**
 * Fuzzy matching function for specialty names (word-based, not letter-based)
 * 
 * @param specialty1 - First specialty name to compare
 * @param specialty2 - Second specialty name to compare
 * @returns True if specialties match, false otherwise
 * 
 * @example
 * ```typescript
 * fuzzyMatchSpecialty('Cardiology', 'Cardiovascular'); // Returns true
 * ```
 */
export const fuzzyMatchSpecialty = (specialty1: string, specialty2: string): boolean => {
  const norm1 = normalizeSpecialty(specialty1);
  const norm2 = normalizeSpecialty(specialty2);

  if (!norm1 || !norm2) return false;

  // Exact or simple contains
  if (norm1 === norm2) return true;
  if (norm1.includes(norm2) || norm2.includes(norm1)) return true;

  const words1 = norm1.split(/\s+/).filter(w => w.length > 2);
  const words2 = norm2.split(/\s+/).filter(w => w.length > 2);
  if (words1.length === 0 || words2.length === 0) return false;

  const common = words1.filter(w => words2.includes(w));
  const jaccard = common.length / new Set([...words1, ...words2]).size;

  return jaccard >= 0.6 || common.length >= Math.min(words1.length, words2.length) * 0.8;
};

/**
 * Finds the best matching specialty from a list of candidates
 * 
 * @param targetSpecialty - The specialty to find a match for
 * @param candidateSpecialties - Array of candidate specialties
 * @returns The best matching specialty or null if no good match found
 * 
 * @example
 * ```typescript
 * findBestSpecialtyMatch('Cardiology', ['Cardiovascular', 'Neurology', 'Orthopedics']); 
 * // Returns 'Cardiovascular'
 * ```
 */
export const findBestSpecialtyMatch = (
  targetSpecialty: string,
  candidateSpecialties: string[]
): string | null => {
  if (!targetSpecialty || candidateSpecialties.length === 0) return null;

  // First try exact match
  const exactMatch = candidateSpecialties.find(
    candidate => normalizeSpecialty(candidate) === normalizeSpecialty(targetSpecialty)
  );
  if (exactMatch) return exactMatch;

  // Then try fuzzy matching
  const fuzzyMatches = candidateSpecialties.filter(candidate =>
    fuzzyMatchSpecialty(targetSpecialty, candidate)
  );

  if (fuzzyMatches.length === 1) {
    return fuzzyMatches[0];
  }

  // If multiple fuzzy matches, return the one with highest similarity
  if (fuzzyMatches.length > 1) {
    return fuzzyMatches.reduce((best, current) => {
      const bestSimilarity = calculateSimilarity(targetSpecialty, best);
      const currentSimilarity = calculateSimilarity(targetSpecialty, current);
      return currentSimilarity > bestSimilarity ? current : best;
    });
  }

  return null;
};

/**
 * Calculates similarity between two specialty names
 * 
 * @param specialty1 - First specialty name
 * @param specialty2 - Second specialty name
 * @returns Similarity score between 0 and 1
 * 
 * @example
 * ```typescript
 * calculateSimilarity('Cardiology', 'Cardiovascular'); // Returns similarity score
 * ```
 */
export const calculateSimilarity = (specialty1: string, specialty2: string): number => {
  const norm1 = normalizeSpecialty(specialty1);
  const norm2 = normalizeSpecialty(specialty2);

  if (norm1 === norm2) return 1;

  const words1 = norm1.split(/\s+/).filter(w => w.length > 2);
  const words2 = norm2.split(/\s+/).filter(w => w.length > 2);

  if (words1.length === 0 || words2.length === 0) return 0;

  const common = words1.filter(w => words2.includes(w));
  const union = new Set([...words1, ...words2]);

  return common.length / union.size;
};

/**
 * Groups specialties by similarity
 * 
 * @param specialties - Array of specialties to group
 * @param similarityThreshold - Minimum similarity to group (default: 0.6)
 * @returns Array of specialty groups
 * 
 * @example
 * ```typescript
 * groupSimilarSpecialties(['Cardiology', 'Cardiovascular', 'Neurology']); 
 * // Returns [['Cardiology', 'Cardiovascular'], ['Neurology']]
 * ```
 */
export const groupSimilarSpecialties = (
  specialties: string[],
  similarityThreshold: number = 0.6
): string[][] => {
  const groups: string[][] = [];
  const used = new Set<number>();

  for (let i = 0; i < specialties.length; i++) {
    if (used.has(i)) continue;

    const group = [specialties[i]];
    used.add(i);

    for (let j = i + 1; j < specialties.length; j++) {
      if (used.has(j)) continue;

      if (calculateSimilarity(specialties[i], specialties[j]) >= similarityThreshold) {
        group.push(specialties[j]);
        used.add(j);
      }
    }

    groups.push(group);
  }

  return groups;
};

/**
 * Standardizes specialty names based on common variations
 * 
 * @param specialty - Raw specialty name
 * @returns Standardized specialty name
 * 
 * @example
 * ```typescript
 * standardizeSpecialty('Cardiology & Heart Surgery'); // Returns 'Cardiology'
 * ```
 */
export const standardizeSpecialty = (specialty: string): string => {
  const normalized = normalizeSpecialty(specialty);
  
  // Common specialty mappings
  const specialtyMappings: Record<string, string> = {
    'cardiology': 'Cardiology',
    'cardiovascular': 'Cardiology',
    'heart': 'Cardiology',
    'cardiac': 'Cardiology',
    'neurology': 'Neurology',
    'neurological': 'Neurology',
    'orthopedics': 'Orthopedics',
    'orthopedic': 'Orthopedics',
    'ortho': 'Orthopedics',
    'dermatology': 'Dermatology',
    'dermatological': 'Dermatology',
    'derm': 'Dermatology',
    'oncology': 'Oncology',
    'cancer': 'Oncology',
    'hematology': 'Hematology',
    'hematological': 'Hematology',
    'hematology oncology': 'Hematology/Oncology',
    'heme onc': 'Hematology/Oncology',
    'pediatrics': 'Pediatrics',
    'pediatric': 'Pediatrics',
    'peds': 'Pediatrics',
    'internal medicine': 'Internal Medicine',
    'family medicine': 'Family Medicine',
    'family practice': 'Family Medicine',
    'emergency medicine': 'Emergency Medicine',
    'emergency': 'Emergency Medicine',
    'em': 'Emergency Medicine',
    'anesthesiology': 'Anesthesiology',
    'anesthesia': 'Anesthesiology',
    'radiology': 'Radiology',
    'diagnostic radiology': 'Radiology',
    'interventional radiology': 'Interventional Radiology',
    'ir': 'Interventional Radiology',
    'psychiatry': 'Psychiatry',
    'psychiatric': 'Psychiatry',
    'psych': 'Psychiatry',
    'surgery': 'General Surgery',
    'general surgery': 'General Surgery',
    'obstetrics gynecology': 'Obstetrics & Gynecology',
    'ob gyn': 'Obstetrics & Gynecology',
    'obstetrics': 'Obstetrics & Gynecology',
    'gynecology': 'Obstetrics & Gynecology',
    'pathology': 'Pathology',
    'pathological': 'Pathology',
    'ophthalmology': 'Ophthalmology',
    'eye': 'Ophthalmology',
    'otolaryngology': 'Otolaryngology',
    'ent': 'Otolaryngology',
    'ear nose throat': 'Otolaryngology',
    'urology': 'Urology',
    'urological': 'Urology',
    'allergy immunology': 'Allergy & Immunology',
    'allergy': 'Allergy & Immunology',
    'immunology': 'Allergy & Immunology',
    'rheumatology': 'Rheumatology',
    'rheumatological': 'Rheumatology',
    'endocrinology': 'Endocrinology',
    'endocrine': 'Endocrinology',
    'gastroenterology': 'Gastroenterology',
    'gi': 'Gastroenterology',
    'pulmonology': 'Pulmonology',
    'pulmonary': 'Pulmonology',
    'respiratory': 'Pulmonology',
    'nephrology': 'Nephrology',
    'renal': 'Nephrology',
    'kidney': 'Nephrology',
    'infectious disease': 'Infectious Disease',
    'infectious': 'Infectious Disease',
    'id': 'Infectious Disease',
    'physical medicine rehabilitation': 'Physical Medicine & Rehabilitation',
    'pmr': 'Physical Medicine & Rehabilitation',
    'rehabilitation': 'Physical Medicine & Rehabilitation',
    'pm r': 'Physical Medicine & Rehabilitation'
  };

  // Try exact match first
  if (specialtyMappings[normalized]) {
    return specialtyMappings[normalized];
  }

  // Try partial matches
  for (const [key, value] of Object.entries(specialtyMappings)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return value;
    }
  }

  // If no match found, return capitalized original
  return capitalizeWords(specialty);
};

/**
 * Capitalizes the first letter of each word in a string
 * 
 * @param text - Text to capitalize
 * @returns Capitalized text
 */
const capitalizeWords = (text: string): string => {
  return text.replace(/\w\S*/g, (txt) => 
    txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
  );
};
