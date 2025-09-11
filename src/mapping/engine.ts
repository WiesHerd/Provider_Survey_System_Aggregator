/**
 * Deterministic Specialty Auto-Mapper Engine
 * 
 * This engine harmonizes specialties across Gallagher, SullivanCotter, MGMA, and future sources.
 * It maintains strict domain barriers (Adult ↔ Pediatric) and preserves subspecialties.
 */

import {
  RawInput,
  MappingDecision,
  MatchCandidate,
  CanonicalSpecialty,
  Domain,
  Source,
  MappingConfig,
  SynonymsConfig,
  RulesConfig,
  OverrideMapping
} from './types';
import { DEFAULT_MAPPING_CONFIG } from './config';

/**
 * Main mapping engine class
 */
export class SpecialtyMappingEngine {
  private config: MappingConfig;
  private taxonomy: CanonicalSpecialty[];
  private synonyms: SynonymsConfig;
  private rules: RulesConfig[];
  private overrides: OverrideMapping[];

  constructor(
    config: MappingConfig = DEFAULT_MAPPING_CONFIG,
    taxonomy: CanonicalSpecialty[] = [],
    synonyms: SynonymsConfig,
    rules: RulesConfig[] = [],
    overrides: OverrideMapping[] = []
  ) {
    this.config = config;
    this.taxonomy = taxonomy;
    this.synonyms = synonyms;
    this.rules = rules;
    this.overrides = overrides;
  }

  /**
   * Main mapping function - processes a single raw input
   */
  async mapSpecialty(input: RawInput): Promise<MappingDecision> {
    try {
      // Step 1: Normalize the input
      const normalized = this.normalize(input.rawName);
      
      // Step 2: Check overrides first
      const overrideMatch = this.checkOverrides(input, normalized);
      if (overrideMatch) {
        return overrideMatch;
      }
      
      // Step 3: Infer domain
      const domain = this.inferDomain(normalized, input.meta);
      
      // Step 4: Apply hard maps
      const hardMapResult = this.applyHardMaps(normalized, domain, input.source);
      if (hardMapResult) {
        return hardMapResult;
      }
      
      // Step 5: Determine parent bucket
      const parent = this.determineParentBucket(normalized, domain);
      if (!parent) {
        return this.createUndecidedDecision(input, 'No parent bucket determined');
      }
      
      // Step 6: Apply negative guards
      if (this.hasNegativeTokens(normalized, parent)) {
        return this.createUndecidedDecision(input, `Negative tokens found for parent: ${parent}`);
      }
      
      // Step 7: Get candidate set (same domain + parent)
      const candidates = this.getCandidates(domain, parent);
      if (candidates.length === 0) {
        return this.createUndecidedDecision(input, `No candidates found for domain: ${domain}, parent: ${parent}`);
      }
      
      // Step 8: Score candidates
      const scoredCandidates = this.scoreCandidates(normalized, candidates, input);
      
      // Step 9: Make decision
      return this.makeDecision(input, scoredCandidates);
      
    } catch (error) {
      console.error('Error in mapSpecialty:', error);
      return this.createUndecidedDecision(input, `Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Process multiple specialties in batch
   */
  async mapBatch(inputs: RawInput[]): Promise<MappingDecision[]> {
    const results: MappingDecision[] = [];
    
    for (const input of inputs) {
      const result = await this.mapSpecialty(input);
      results.push(result);
    }
    
    return results;
  }

  /**
   * Normalize raw specialty name
   */
  private normalize(rawName: string): string {
    return rawName
      .toLowerCase()
      .trim()
      .replace(/[,:;]/g, ' ') // Replace separators with spaces first
      .replace(/[-_]/g, ' ') // Replace dashes and underscores with spaces
      .replace(/\s+/g, ' ') // Collapse all whitespace to single spaces
      .trim();
  }

  /**
   * Infer domain from normalized name and metadata
   */
  private inferDomain(normalized: string, meta?: Record<string, any>): Domain {
    // Check metadata first
    if (meta?.pediatric === true || meta?.pediatric === 'true') {
      return 'PEDIATRIC';
    }
    
    // Check domain hints
    const pediatricHints = this.synonyms.domainHints.pediatric;
    const adultHints = this.synonyms.domainHints.adult;
    
    for (const hint of pediatricHints) {
      if (normalized.includes(hint.toLowerCase())) {
        return 'PEDIATRIC';
      }
    }
    
    for (const hint of adultHints) {
      if (normalized.includes(hint.toLowerCase())) {
        return 'ADULT';
      }
    }
    
    // Default to adult if no hints found
    return 'ADULT';
  }

  /**
   * Apply hard mapping rules
   */
  private applyHardMaps(normalized: string, domain: Domain, source: Source): MappingDecision | null {
    // Apply rules in order: pediatric -> source-specific -> base
    const ruleSets = [
      ...this.rules.filter(r => r.hardMaps.some(rule => rule.id.includes('PEDS'))),
      ...this.rules.filter(r => r.hardMaps.some(rule => rule.id.includes(source.toUpperCase()))),
      ...this.rules.filter(r => r.hardMaps.some(rule => !rule.id.includes('PEDS') && !rule.id.includes(source.toUpperCase())))
    ];
    
    for (const ruleSet of ruleSets) {
      for (const rule of ruleSet.hardMaps) {
        const regex = new RegExp(rule.pattern, 'i');
        if (regex.test(normalized)) {
          const canonical = this.taxonomy.find(s => s.id === rule.canonicalId);
          if (canonical && canonical.domain === domain) {
            return {
              input: { source, rawName: normalized, meta: {} },
              decidedCanonicalId: rule.canonicalId,
              confidence: rule.confidence || this.config.hardMapConfidence,
              appliedRuleIds: [rule.id],
              candidates: [{
                canonicalId: rule.canonicalId,
                score: rule.confidence || this.config.hardMapConfidence,
                reasons: [`hardmap:${rule.id}`]
              }],
              notes: `Hard mapped by rule: ${rule.id}`
            };
          }
        }
      }
    }
    
    return null;
  }

  /**
   * Determine parent bucket using synonyms and hints
   */
  private determineParentBucket(normalized: string, domain: Domain): string | null {
    // Check parent synonyms
    for (const [parent, synonyms] of Object.entries(this.synonyms.parentSynonyms)) {
      for (const synonym of synonyms) {
        if (normalized.includes(synonym.toLowerCase())) {
          return parent;
        }
      }
    }
    
    // Check bucketing hints
    for (const ruleSet of this.rules) {
      for (const hint of ruleSet.bucketingHints) {
        const regex = new RegExp(hint.pattern, 'i');
        if (regex.test(normalized)) {
          return hint.parent;
        }
      }
    }
    
    return null;
  }

  /**
   * Check for negative tokens that would block this parent
   */
  private hasNegativeTokens(normalized: string, parent: string): boolean {
    const negativeTokens = this.synonyms.negativeTokens[parent] || [];
    
    for (const token of negativeTokens) {
      if (normalized.includes(token.toLowerCase())) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Get candidates with same domain and parent
   */
  private getCandidates(domain: Domain, parent: string): CanonicalSpecialty[] {
    return this.taxonomy.filter(specialty => 
      specialty.domain === domain && specialty.parent === parent
    );
  }

  /**
   * Score candidates based on various factors
   */
  private scoreCandidates(
    normalized: string, 
    candidates: CanonicalSpecialty[], 
    input: RawInput
  ): MatchCandidate[] {
    const scored: MatchCandidate[] = [];
    
    for (const candidate of candidates) {
      let score = 0;
      const reasons: string[] = [];
      
      // Token overlap scoring
      const tokenScore = this.calculateTokenScore(normalized, candidate);
      score += tokenScore * this.config.weights.token;
      if (tokenScore > 0) {
        reasons.push(`token:${tokenScore.toFixed(2)}`);
      }
      
      // Synonym scoring
      const synonymScore = this.calculateSynonymScore(normalized, candidate);
      score += synonymScore * this.config.weights.synonym;
      if (synonymScore > 0) {
        reasons.push(`synonym:${synonymScore.toFixed(2)}`);
      }
      
      // Character similarity scoring
      const charSimScore = this.calculateCharSimScore(normalized, candidate);
      score += charSimScore * this.config.weights.charSim;
      if (charSimScore > 0) {
        reasons.push(`charsim:${charSimScore.toFixed(2)}`);
      }
      
      // Negative token penalty
      if (this.hasNegativeTokens(normalized, candidate.parent)) {
        score += this.config.weights.negative;
        reasons.push('negative:penalty');
      }
      
      // Source-specific hint scoring
      const sourceHintScore = this.calculateSourceHintScore(normalized, candidate, input.source);
      score += sourceHintScore * this.config.weights.sourceHint;
      if (sourceHintScore > 0) {
        reasons.push(`sourcehint:${sourceHintScore.toFixed(2)}`);
      }
      
      // Ensure score is between 0 and 1
      score = Math.max(0, Math.min(1, score));
      
      scored.push({
        canonicalId: candidate.id,
        score,
        reasons
      });
    }
    
    // Sort by score descending
    return scored.sort((a, b) => b.score - a.score);
  }

  /**
   * Calculate token overlap score
   */
  private calculateTokenScore(normalized: string, candidate: CanonicalSpecialty): number {
    const inputTokens = normalized.split(' ').filter(t => t.length > 2);
    const candidateTokens = candidate.tags.map(t => t.toLowerCase());
    
    let matches = 0;
    for (const token of inputTokens) {
      if (candidateTokens.some(ct => ct.includes(token) || token.includes(ct))) {
        matches++;
      }
    }
    
    return inputTokens.length > 0 ? matches / inputTokens.length : 0;
  }

  /**
   * Calculate synonym score
   */
  private calculateSynonymScore(normalized: string, candidate: CanonicalSpecialty): number {
    const subspecialtyTokens = this.synonyms.subspecialtyTokens;
    let score = 0;
    
    for (const [token, synonyms] of Object.entries(subspecialtyTokens)) {
      if (candidate.tags.includes(token)) {
        for (const synonym of synonyms) {
          if (normalized.includes(synonym.toLowerCase())) {
            score += 1.0 / synonyms.length;
          }
        }
      }
    }
    
    return Math.min(1.0, score);
  }

  /**
   * Calculate character similarity score
   */
  private calculateCharSimScore(normalized: string, candidate: CanonicalSpecialty): number {
    if (this.config.featureFlags.useJaroWinkler) {
      return this.jaroWinklerSimilarity(normalized, candidate.name.toLowerCase());
    } else if (this.config.featureFlags.useTokenSetRatio) {
      return this.tokenSetRatio(normalized, candidate.name.toLowerCase());
    } else {
      return this.levenshteinSimilarity(normalized, candidate.name.toLowerCase());
    }
  }

  /**
   * Calculate source-specific hint score
   */
  private calculateSourceHintScore(normalized: string, candidate: CanonicalSpecialty, source: Source): number {
    // This would be implemented based on source-specific rules
    // For now, return 0
    return 0;
  }

  /**
   * Make final decision based on scored candidates
   */
  private makeDecision(input: RawInput, candidates: MatchCandidate[]): MappingDecision {
    if (candidates.length === 0) {
      return this.createUndecidedDecision(input, 'No candidates found');
    }
    
    const topCandidate = candidates[0];
    
    if (topCandidate.score >= this.config.minDecisionThreshold) {
      return {
        input,
        decidedCanonicalId: topCandidate.canonicalId,
        confidence: topCandidate.score,
        appliedRuleIds: ['SCORING'],
        candidates,
        notes: `Auto-decided with confidence ${topCandidate.score.toFixed(3)}`
      };
    } else {
      return {
        input,
        decidedCanonicalId: null,
        confidence: topCandidate.score,
        appliedRuleIds: ['SCORING'],
        candidates,
        notes: `Below threshold (${this.config.minDecisionThreshold}), top candidate: ${topCandidate.canonicalId}`
      };
    }
  }

  /**
   * Check for override mappings
   */
  private checkOverrides(input: RawInput, normalized: string): MappingDecision | null {
    for (const override of this.overrides) {
      if (override.source && override.source !== input.source) {
        continue;
      }
      
      const regex = new RegExp(override.pattern, 'i');
      if (regex.test(normalized)) {
        return {
          input,
          decidedCanonicalId: override.canonicalId,
          confidence: this.config.hardMapConfidence,
          appliedRuleIds: [`OVERRIDE:${override.id}`],
          candidates: [{
            canonicalId: override.canonicalId,
            score: this.config.hardMapConfidence,
            reasons: [`override:${override.id}`]
          }],
          notes: `Override mapping: ${override.reason || 'No reason provided'}`
        };
      }
    }
    
    return null;
  }

  /**
   * Create undecided decision
   */
  private createUndecidedDecision(input: RawInput, reason: string): MappingDecision {
    return {
      input,
      decidedCanonicalId: null,
      confidence: 0,
      appliedRuleIds: [],
      candidates: [],
      notes: reason
    };
  }

  /**
   * Jaro-Winkler similarity algorithm
   */
  private jaroWinklerSimilarity(s1: string, s2: string): number {
    // Simplified Jaro-Winkler implementation
    const jaro = this.jaroSimilarity(s1, s2);
    const prefix = this.commonPrefix(s1, s2, 4);
    return jaro + (0.1 * prefix * (1 - jaro));
  }

  /**
   * Jaro similarity algorithm
   */
  private jaroSimilarity(s1: string, s2: string): number {
    if (s1 === s2) return 1.0;
    
    const len1 = s1.length;
    const len2 = s2.length;
    
    if (len1 === 0 || len2 === 0) return 0.0;
    
    const matchWindow = Math.floor(Math.max(len1, len2) / 2) - 1;
    const s1Matches = new Array(len1).fill(false);
    const s2Matches = new Array(len2).fill(false);
    
    let matches = 0;
    let transpositions = 0;
    
    // Find matches
    for (let i = 0; i < len1; i++) {
      const start = Math.max(0, i - matchWindow);
      const end = Math.min(i + matchWindow + 1, len2);
      
      for (let j = start; j < end; j++) {
        if (s2Matches[j] || s1[i] !== s2[j]) continue;
        s1Matches[i] = true;
        s2Matches[j] = true;
        matches++;
        break;
      }
    }
    
    if (matches === 0) return 0.0;
    
    // Count transpositions
    let k = 0;
    for (let i = 0; i < len1; i++) {
      if (!s1Matches[i]) continue;
      while (!s2Matches[k]) k++;
      if (s1[i] !== s2[k]) transpositions++;
      k++;
    }
    
    return (matches / len1 + matches / len2 + (matches - transpositions / 2) / matches) / 3;
  }

  /**
   * Common prefix length
   */
  private commonPrefix(s1: string, s2: string, maxLen: number): number {
    let prefix = 0;
    for (let i = 0; i < Math.min(s1.length, s2.length, maxLen); i++) {
      if (s1[i] === s2[i]) {
        prefix++;
      } else {
        break;
      }
    }
    return prefix;
  }

  /**
   * Token set ratio algorithm
   */
  private tokenSetRatio(s1: string, s2: string): number {
    const tokens1 = new Set(s1.split(' '));
    const tokens2 = new Set(s2.split(' '));
    
    const intersection = new Set([...tokens1].filter(x => tokens2.has(x)));
    const union = new Set([...tokens1, ...tokens2]);
    
    return intersection.size / union.size;
  }

  /**
   * Levenshtein similarity algorithm
   */
  private levenshteinSimilarity(s1: string, s2: string): number {
    const distance = this.levenshteinDistance(s1, s2);
    const maxLen = Math.max(s1.length, s2.length);
    return maxLen === 0 ? 1.0 : 1.0 - distance / maxLen;
  }

  /**
   * Levenshtein distance algorithm
   */
  private levenshteinDistance(s1: string, s2: string): number {
    const matrix = Array(s2.length + 1).fill(null).map(() => Array(s1.length + 1).fill(null));
    
    for (let i = 0; i <= s1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= s2.length; j++) matrix[j][0] = j;
    
    for (let j = 1; j <= s2.length; j++) {
      for (let i = 1; i <= s1.length; i++) {
        const indicator = s1[i - 1] === s2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,     // deletion
          matrix[j - 1][i] + 1,     // insertion
          matrix[j - 1][i - 1] + indicator // substitution
        );
      }
    }
    
    return matrix[s2.length][s1.length];
  }
}
