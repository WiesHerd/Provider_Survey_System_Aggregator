/**
 * Simple, reliable specialty matching utilities
 * No complex AI - just straightforward, predictable matching
 */

/**
 * Normalizes a specialty name for comparison
 */
export const normalizeSpecialty = (specialty: string): string => {
  return specialty.toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
};

/**
 * Simple, reliable similarity calculation
 * Returns a score between 0 and 1
 */
export const calculateSimilarity = (specialty1: string, specialty2: string): number => {
  const norm1 = normalizeSpecialty(specialty1);
  const norm2 = normalizeSpecialty(specialty2);

  // Exact match
  if (norm1 === norm2) return 1.0;

  // Contains match (one specialty contains the other)
  if (norm1.includes(norm2) || norm2.includes(norm1)) {
    return 0.9;
  }

  // Word-based similarity
  const words1 = norm1.split(/\s+/).filter(w => w.length > 2);
  const words2 = norm2.split(/\s+/).filter(w => w.length > 2);

  if (words1.length === 0 || words2.length === 0) return 0;

  const common = words1.filter(w => words2.includes(w));
  const union = new Set([...words1, ...words2]);

  let similarity = common.length / union.size;

  // Boost for medical term matches
  const medicalTerms = [
    'neonatal', 'perinatal', 'pediatric', 'cardiology', 'neurology', 
    'orthopedic', 'dermatology', 'oncology', 'hematology', 'endocrinology',
    'gastroenterology', 'nephrology', 'pulmonology', 'rheumatology',
    'allergy', 'immunology', 'infectious', 'critical', 'care', 'medicine',
    'surgery', 'radiology', 'pathology', 'anesthesiology', 'psychiatry',
    'ophthalmology', 'urology', 'gynecology', 'obstetrics', 'emergency',
    'family', 'internal', 'hospitalist', 'nocturnist'
  ];

  const medicalMatches = common.filter(word => 
    medicalTerms.some(term => word.includes(term) || term.includes(word))
  );

  if (medicalMatches.length > 0) {
    similarity = Math.min(1, similarity + 0.2);
  }

  return similarity;
};

/**
 * Simple fuzzy matching - returns true if specialties are similar enough
 */
export const fuzzyMatchSpecialty = (specialty1: string, specialty2: string): boolean => {
  return calculateSimilarity(specialty1, specialty2) >= 0.6;
};

/**
 * Find the best matching specialty from a list
 */
export const findBestSpecialtyMatch = (
  targetSpecialty: string,
  candidateSpecialties: string[]
): string | null => {
  if (!targetSpecialty || candidateSpecialties.length === 0) return null;

  let bestMatch: string | null = null;
  let bestScore = 0;

  candidateSpecialties.forEach(candidate => {
    const score = calculateSimilarity(targetSpecialty, candidate);
    if (score > bestScore) {
      bestScore = score;
      bestMatch = candidate;
    }
  });

  return bestScore >= 0.6 ? bestMatch : null;
};

/**
 * Filter specialty options based on search text with similarity scoring
 */
export const filterSpecialtyOptions = (
  options: string[],
  searchText: string,
  maxResults: number = 10
): string[] => {
  if (!searchText.trim()) {
    return options.slice(0, maxResults);
  }
  
  const normalizedSearch = normalizeSpecialty(searchText);
  
  return options
    .filter(option => {
      const normalizedOption = normalizeSpecialty(option);
      return normalizedOption.includes(normalizedSearch) ||
             normalizedSearch.includes(normalizedOption);
    })
    .sort((a, b) => {
      const aScore = calculateSimilarity(a, searchText);
      const bScore = calculateSimilarity(b, searchText);
      return bScore - aScore;
    })
    .slice(0, maxResults);
};

/**
 * Group specialties by similarity
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
 * Simple specialty standardization
 */
export const standardizeSpecialty = (specialty: string): string => {
  const normalized = normalizeSpecialty(specialty);
  
  // Simple mappings for common variations
  const mappings: Record<string, string> = {
    'neonatal medicine': 'Neonatal Medicine',
    'neonatal perinatal medicine': 'Neonatal-Perinatal Medicine',
    'cardiology': 'Cardiology',
    'cardiovascular': 'Cardiology',
    'neurology': 'Neurology',
    'orthopedics': 'Orthopedics',
    'dermatology': 'Dermatology',
    'oncology': 'Oncology',
    'pediatrics': 'Pediatrics',
    'internal medicine': 'Internal Medicine',
    'family medicine': 'Family Medicine',
    'emergency medicine': 'Emergency Medicine',
    'anesthesiology': 'Anesthesiology',
    'radiology': 'Radiology',
    'psychiatry': 'Psychiatry',
    'surgery': 'General Surgery',
    'obstetrics gynecology': 'Obstetrics & Gynecology',
    'pathology': 'Pathology',
    'ophthalmology': 'Ophthalmology',
    'urology': 'Urology',
    'allergy immunology': 'Allergy & Immunology',
    'rheumatology': 'Rheumatology',
    'endocrinology': 'Endocrinology',
    'gastroenterology': 'Gastroenterology',
    'pulmonology': 'Pulmonology',
    'nephrology': 'Nephrology',
    'infectious disease': 'Infectious Disease'
  };

  // Try exact match first
  if (mappings[normalized]) {
    return mappings[normalized];
  }

  // Try partial matches
  for (const [key, value] of Object.entries(mappings)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return value;
    }
  }

  // Return capitalized original
  return specialty.split(' ').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  ).join(' ');
};

/**
 * Shared specialty filtering for Autocomplete components.
 * Provides order-insensitive token matching, light stemming/synonyms, and
 * token-level fuzzy tolerance for small typos.
 */
export const filterSpecialtyOptions = (
  options: string[],
  inputValue: string
): string[] => {
  if (!inputValue) return options;

  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
  const toTokens = (s: string) => normalize(s).split(' ').filter(Boolean);
  const stem = (t: string) => {
    const synonyms: Record<string, string> = {
      pediatrics: 'pediatric',
      pediatric: 'pediatric',
      pedia: 'pediatric',
      cardio: 'cardiology',
      ent: 'otolaryngology',
      gyn: 'gynecology',
      ob: 'obstetrics'
    };
    const singular = t.endsWith('s') ? t.slice(0, -1) : t;
    return synonyms[t] || synonyms[singular] || singular;
  };
  const levenshtein = (a: string, b: string): number => {
    const m = a.length, n = b.length;
    if (m === 0) return n;
    if (n === 0) return m;
    const dp: number[] = new Array(n + 1).fill(0);
    for (let j = 0; j <= n; j++) dp[j] = j;
    for (let i = 1; i <= m; i++) {
      let prev = i - 1;
      dp[0] = i;
      for (let j = 1; j <= n; j++) {
        const temp = dp[j];
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        dp[j] = Math.min(
          dp[j] + 1,
          dp[j - 1] + 1,
          prev + cost
        );
        prev = temp;
      }
    }
    return dp[n];
  };
  const tokenMatch = (query: string, candidate: string) => {
    const qTokens = toTokens(query).map(stem);
    const cTokens = toTokens(candidate).map(stem);
    return qTokens.every(qt => cTokens.includes(qt));
  };
  const tokenFuzzyMatch = (query: string, candidate: string) => {
    const qTokens = toTokens(query).map(stem);
    const cTokens = toTokens(candidate).map(stem);
    if (qTokens.length === 0 || cTokens.length === 0) return false;
    return qTokens.every(qt => cTokens.some(ct => {
      if (ct.includes(qt) || qt.includes(ct)) return true;
      const dist = levenshtein(qt, ct);
      const allowed = qt.length <= 5 ? 1 : 2;
      return dist <= allowed;
    }));
  };

  return options.filter((option: string) => {
    if (option === '') return true;
    return (
      tokenMatch(inputValue, option) ||
      tokenFuzzyMatch(inputValue, option) ||
      fuzzyMatchSpecialty(inputValue, option) ||
      fuzzyMatchSpecialty(inputValue, standardizeSpecialty(option))
    );
  });
};