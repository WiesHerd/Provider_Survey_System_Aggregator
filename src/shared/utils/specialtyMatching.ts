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
 * Check if search text matches specialty with flexible word order
 * Returns true if all search words are found in the specialty (order independent)
 * Handles colon-separated specialties (e.g., "pediatrics:surgery")
 */
export const flexibleWordMatch = (specialty: string, searchText: string): boolean => {
  if (!searchText.trim()) return true;
  
  const normalizedSpecialty = normalizeSpecialty(specialty);
  const normalizedSearch = normalizeSpecialty(searchText);
  
  // Split into words and filter out short words (less than 2 characters)
  // Also split by colons to handle colon-separated specialties
  const specialtyParts = normalizedSpecialty.split(/[\s:]+/).filter(word => word.length >= 2);
  const searchWords = normalizedSearch.split(/\s+/).filter(word => word.length >= 2);
  
  if (searchWords.length === 0) return true;
  
  // Check if all search words are found in specialty parts (including colon-separated parts)
  return searchWords.every(searchWord => 
    specialtyParts.some(specialtyPart => 
      specialtyPart.includes(searchWord) || searchWord.includes(specialtyPart)
    )
  );
};

/**
 * Calculate flexible similarity score for word-order independent matching
 */
export const calculateFlexibleSimilarity = (specialty: string, searchText: string): number => {
  if (!searchText.trim()) return 1;
  
  const normalizedSpecialty = normalizeSpecialty(specialty);
  const normalizedSearch = normalizeSpecialty(searchText);
  
  // Handle colon-separated specialties (e.g., "pediatrics:surgery")
  // Split by both spaces and colons to capture all parts
  const specialtyParts = normalizedSpecialty.split(/[\s:]+/).filter(word => word.length >= 2);
  const searchWords = normalizedSearch.split(/\s+/).filter(word => word.length >= 2);
  
  if (searchWords.length === 0) return 1;
  if (specialtyParts.length === 0) return 0;
  
  // Count matching words
  let matchedWords = 0;
  let exactMatches = 0;
  const usedSpecialtyParts = new Set<number>();
  
  searchWords.forEach(searchWord => {
    // First try to find exact match
    const exactMatchIndex = specialtyParts.findIndex((specialtyPart, index) => 
      !usedSpecialtyParts.has(index) && specialtyPart === searchWord
    );
    
    if (exactMatchIndex !== -1) {
      matchedWords++;
      exactMatches++;
      usedSpecialtyParts.add(exactMatchIndex);
    } else {
      // Then try partial match
      const partialMatchIndex = specialtyParts.findIndex((specialtyPart, index) => 
        !usedSpecialtyParts.has(index) && 
        (specialtyPart.includes(searchWord) || searchWord.includes(specialtyPart))
      );
      
      if (partialMatchIndex !== -1) {
        matchedWords++;
        usedSpecialtyParts.add(partialMatchIndex);
      }
    }
  });
  
  // Base score from word matches
  let score = matchedWords / searchWords.length;
  
  // Strong boost for exact word matches (more important than partial)
  if (exactMatches > 0) {
    score += (exactMatches / searchWords.length) * 0.4;
  }
  
  // Boost for specialties with multiple matching words (e.g., both "pediatrics" and "surgery" match)
  if (matchedWords === searchWords.length && specialtyParts.length > 1) {
    const allPartsMatched = searchWords.every(searchWord =>
      specialtyParts.some(part => part.includes(searchWord) || searchWord.includes(part))
    );
    if (allPartsMatched) {
      score += 0.2; // Boost for multi-part specialties that match all search words
    }
  }
  
  // Boost for medical term matches
  const medicalTerms = [
    'neonatal', 'perinatal', 'pediatric', 'cardiology', 'neurology', 
    'orthopedic', 'dermatology', 'oncology', 'hematology', 'endocrinology',
    'gastroenterology', 'nephrology', 'pulmonology', 'rheumatology',
    'allergy', 'immunology', 'infectious', 'critical', 'care', 'medicine',
    'surgery', 'radiology', 'pathology', 'anesthesiology', 'psychiatry',
    'ophthalmology', 'urology', 'gynecology', 'obstetrics', 'emergency',
    'family', 'internal', 'hospitalist', 'nocturnist', 'general'
  ];
  
  const medicalMatches = searchWords.filter(searchWord =>
    medicalTerms.some(term => 
      searchWord.includes(term) || term.includes(searchWord)
    )
  ).length;
  
  if (medicalMatches > 0) {
    score += (medicalMatches / searchWords.length) * 0.2;
  }
  
  return Math.min(1, score);
};

/**
 * Filter specialty options based on search text with flexible word order matching
 */
export const filterSpecialtyOptions = (
  options: string[],
  searchText: string,
  maxResults: number = 10
): string[] => {
  if (!searchText.trim()) {
    return options.slice(0, maxResults);
  }
  
  return options
    .filter(option => flexibleWordMatch(option, searchText))
    .sort((a, b) => {
      const aScore = calculateFlexibleSimilarity(a, searchText);
      const bScore = calculateFlexibleSimilarity(b, searchText);
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
