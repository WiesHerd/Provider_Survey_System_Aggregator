/**
 * Local AI-powered specialty matching utilities
 * Uses intelligent local algorithms to match and group similar specialties
 * 
 * 🧠 This system provides excellent specialty matching capabilities without any external dependencies.
 * It uses enhanced medical term recognition, intelligent embeddings, and cosine similarity matching.
 */

export interface LLMMatchResult {
  standardizedName: string;
  confidence: number;
  reasoning: string;
  similarSpecialties: string[];
}

export interface LLMGroupingResult {
  groupName: string;
  specialties: string[];
  confidence: number;
}

/**
 * Configuration for local AI-based matching
 */
export interface LLMMatchingConfig {
  similarityThreshold?: number;
  maxRetries?: number;
}

/**
 * Default configuration
 */
export const DEFAULT_LLM_CONFIG: LLMMatchingConfig = {
  similarityThreshold: 0.7,
  maxRetries: 3
};

/**
 * Local AI-powered specialty matcher
 * Uses enhanced medical term recognition and intelligent similarity matching
 */
export class LocalAISpecialtyMatcher {
  private config: LLMMatchingConfig;

  constructor(config: Partial<LLMMatchingConfig> = {}) {
    this.config = { ...DEFAULT_LLM_CONFIG, ...config };
    console.log('🧠 Local AI-powered specialty matching initialized');
  }

  /**
   * Enhanced local embeddings with intelligent medical term weighting
   */
  private getEnhancedLocalEmbeddings(texts: string[]): number[][] {
    console.log('🧠 Using enhanced local AI-powered similarity matching');
    
    const allWords = new Set<string>();
    const normalizedTexts = texts.map(text => 
      text.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
    );

    // Build enhanced vocabulary with medical terms
    normalizedTexts.forEach(text => {
      text.split(/\s+/).forEach(word => {
        if (word.length > 2) allWords.add(word);
      });
    });

    const vocabulary = Array.from(allWords);
    const embeddings: number[][] = [];

    normalizedTexts.forEach(text => {
      const words = text.split(/\s+/).filter(w => w.length > 2);
      
      // Create enhanced embedding with medical term weighting
      const embedding = vocabulary.map(word => {
        const baseValue = words.includes(word) ? 1 : 0;
        
        // Enhanced medical terms with intelligent weighting
        const medicalTerms = [
          // Core medical specialties
          'cardiology', 'neurology', 'surgery', 'medicine', 'pediatric', 
          'emergency', 'family', 'internal', 'orthopedic', 'dermatology',
          'ophthalmology', 'psychiatry', 'radiology', 'anesthesiology', 
          'pathology', 'oncology', 'endocrinology', 'gastroenterology',
          'nephrology', 'pulmonology', 'rheumatology', 'allergy', 
          'immunology', 'hematology', 'infectious', 'critical', 'care',
          
          // Medical practice terms
          'hospitalist', 'nocturnist', 'hospital', 'clinic', 'practice', 
          'group', 'associates', 'partners', 'specialists', 'physicians', 
          'doctors', 'nurse', 'practitioner', 'assistant', 'physician',
          
          // Common medical prefixes/suffixes
          'cardio', 'neuro', 'ortho', 'derm', 'psych', 'radio', 'anesthesia',
          'path', 'onco', 'endo', 'gastro', 'nephro', 'pulmo', 'rheum',
          'allergy', 'immuno', 'hemato', 'infectious', 'critical',
          
          // Medical practice variations
          'primary', 'specialty', 'subspecialty', 'general', 'comprehensive',
          'preventive', 'diagnostic', 'therapeutic', 'interventional'
        ];
        
        const isMedicalTerm = medicalTerms.some(term => 
          word.includes(term) || term.includes(word)
        );
        
        // Medical terms get 50% boost for better matching
        return baseValue * (isMedicalTerm ? 1.5 : 1.0);
      });
      
      embeddings.push(embedding);
    });

    return embeddings;
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Match specialties using intelligent local similarity
   */
  async matchSpecialties(
    specialties: string[],
    existingMappings: string[] = [],
    config: Partial<LLMMatchingConfig> = {}
  ): Promise<LLMMatchResult[]> {
    const finalConfig = { ...this.config, ...config };
    const allTexts = [...specialties, ...existingMappings];
    
    try {
      const embeddings = this.getEnhancedLocalEmbeddings(allTexts);
      const results: LLMMatchResult[] = [];

      // For each specialty, find the best match
      specialties.forEach((specialty, index) => {
        const specialtyEmbedding = embeddings[index];
        let bestMatch = '';
        let bestSimilarity = 0;
        let similarSpecialties: string[] = [];

        // Compare with existing mappings first
        existingMappings.forEach((mapping, mappingIndex) => {
          const mappingEmbedding = embeddings[specialties.length + mappingIndex];
          const similarity = this.cosineSimilarity(specialtyEmbedding, mappingEmbedding);
          
          if (similarity > bestSimilarity) {
            bestSimilarity = similarity;
            bestMatch = mapping;
          }
          
          if (similarity > finalConfig.similarityThreshold!) {
            similarSpecialties.push(mapping);
          }
        });

        // If no good match found in existing mappings, look for similar specialties
        if (bestSimilarity < finalConfig.similarityThreshold!) {
          specialties.forEach((otherSpecialty, otherIndex) => {
            if (index !== otherIndex) {
              const otherEmbedding = embeddings[otherIndex];
              const similarity = this.cosineSimilarity(specialtyEmbedding, otherEmbedding);
              
              if (similarity > bestSimilarity) {
                bestSimilarity = similarity;
                bestMatch = otherSpecialty;
              }
              
              if (similarity > finalConfig.similarityThreshold!) {
                similarSpecialties.push(otherSpecialty);
              }
            }
          });
        }

        results.push({
          standardizedName: bestMatch || specialty,
          confidence: bestSimilarity,
          reasoning: `Local AI similarity: ${(bestSimilarity * 100).toFixed(1)}%`,
          similarSpecialties: [...new Set(similarSpecialties)]
        });
      });

      return results;
    } catch (error) {
      console.error('Error in local AI specialty matching:', error);
      return this.getFallbackResults(specialties);
    }
  }

  /**
   * Group similar specialties together using intelligent clustering
   */
  async groupSimilarSpecialties(
    specialties: string[],
    config: Partial<LLMMatchingConfig> = {}
  ): Promise<LLMGroupingResult[]> {
    const finalConfig = { ...this.config, ...config };
    const embeddings = this.getEnhancedLocalEmbeddings(specialties);
    const groups: LLMGroupingResult[] = [];
    const used = new Set<number>();

    for (let i = 0; i < specialties.length; i++) {
      if (used.has(i)) continue;

      const group = [specialties[i]];
      used.add(i);
      let groupConfidence = 1.0;

      for (let j = i + 1; j < specialties.length; j++) {
        if (used.has(j)) continue;

        const similarity = this.cosineSimilarity(embeddings[i], embeddings[j]);
        if (similarity > finalConfig.similarityThreshold!) {
          group.push(specialties[j]);
          used.add(j);
          groupConfidence = Math.min(groupConfidence, similarity);
        }
      }

      if (group.length > 1) {
        // Use the most common specialty name as group name
        const groupName = this.getBestGroupName(group);
        groups.push({
          groupName,
          specialties: group,
          confidence: groupConfidence
        });
      }
    }

    return groups;
  }

  /**
   * Determine the best name for a group of specialties
   */
  private getBestGroupName(specialties: string[]): string {
    // Simple heuristic: prefer shorter, more standard names
    const normalized = specialties.map(s => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim());
    
    // Look for common patterns
    const commonWords = this.findCommonWords(normalized);
    if (commonWords.length > 0) {
      return commonWords.join(' ').replace(/\b\w/g, l => l.toUpperCase());
    }

    // Fallback to the shortest specialty name
    return specialties.reduce((shortest, current) => 
      current.length < shortest.length ? current : shortest
    );
  }

  /**
   * Find common words across specialty names
   */
  private findCommonWords(specialties: string[]): string[] {
    const wordCounts = new Map<string, number>();
    
    specialties.forEach(specialty => {
      const words = specialty.split(/\s+/).filter(w => w.length > 2);
      words.forEach(word => {
        wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
      });
    });

    const threshold = Math.ceil(specialties.length * 0.5);
    return Array.from(wordCounts.entries())
      .filter(([_, count]) => count >= threshold)
      .map(([word, _]) => word)
      .sort((a, b) => b.length - a.length); // Prefer longer words
  }

  /**
   * Fallback results when matching fails
   */
  public getFallbackResults(specialties: string[]): LLMMatchResult[] {
    return specialties.map(specialty => ({
      standardizedName: specialty,
      confidence: 0.5,
      reasoning: 'Fallback: Local AI matching',
      similarSpecialties: []
    }));
  }
}

/**
 * Main local AI specialty matching service
 */
export class LLMSpecialtyMatchingService {
  private matcher: LocalAISpecialtyMatcher;
  private config: LLMMatchingConfig;

  constructor(config: Partial<LLMMatchingConfig> = {}) {
    this.config = { ...DEFAULT_LLM_CONFIG, ...config };
    this.matcher = new LocalAISpecialtyMatcher(this.config);
  }

  /**
   * Match and group specialties using local AI
   */
  async matchAndGroupSpecialties(
    specialties: string[],
    existingMappings: string[] = []
  ): Promise<{
    matches: LLMMatchResult[];
    groups: LLMGroupingResult[];
  }> {
    try {
      const [matches, groups] = await Promise.all([
        this.matcher.matchSpecialties(specialties, existingMappings, this.config),
        this.matcher.groupSimilarSpecialties(specialties, this.config)
      ]);

      return { matches, groups };
    } catch (error) {
      console.error('Local AI matching failed:', error);
      return {
        matches: this.matcher.getFallbackResults(specialties),
        groups: []
      };
    }
  }

  /**
   * Get standardized name suggestions for a specialty
   */
  async getStandardizedName(
    specialty: string,
    existingMappings: string[] = []
  ): Promise<string> {
    try {
      const matches = await this.matcher.matchSpecialties([specialty], existingMappings, this.config);
      return matches[0]?.standardizedName || specialty;
    } catch (error) {
      console.error('Error getting standardized name:', error);
      return specialty;
    }
  }
}

/**
 * Utility function to test local AI matching
 */
export async function testLocalAIMatching(specialties: string[]): Promise<void> {
  const service = new LLMSpecialtyMatchingService();
  
  console.log('🧪 Testing Local AI specialty matching...');
  console.log('📝 Input specialties:', specialties);
  
  const result = await service.matchAndGroupSpecialties(specialties);
  
  console.log('✅ Matches:', result.matches);
  console.log('✅ Groups:', result.groups);
}

// Expose test function globally for browser console access
if (typeof window !== 'undefined') {
  (window as any).testLocalAIMatching = testLocalAIMatching;
  console.log('🧪 Local AI test function available: window.testLocalAIMatching(["cardiology", "cardiovascular"])');
}
