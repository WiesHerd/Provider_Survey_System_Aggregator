/**
 * Integration layer for the new deterministic specialty mapping engine
 * 
 * This file shows how to integrate the new mapping engine into your existing
 * specialty mapping screen while maintaining backward compatibility.
 */

import { SpecialtyMappingEngine } from '../engine';
import { RawInput, MappingDecision, CanonicalSpecialty, SynonymsConfig, RulesConfig } from '../types';
import { DEFAULT_MAPPING_CONFIG } from '../config';
import { ISpecialtyMapping, IUnmappedSpecialty } from '../../types/specialty';

/**
 * Configuration for the mapping engine integration
 */
export interface MappingEngineConfig {
  /** Minimum confidence threshold for auto-decision */
  confidenceThreshold: number;
  /** Whether to use existing mappings as reference */
  useExistingMappings: boolean;
  /** Whether to use fuzzy matching */
  useFuzzyMatching: boolean;
  /** Source identifier for the current survey */
  source: string;
}

/**
 * Result of auto-mapping operation
 */
export interface AutoMappingResult {
  /** Number of specialties successfully mapped */
  mappedCount: number;
  /** Number of specialties that couldn't be mapped */
  unmappedCount: number;
  /** Detailed results for each specialty */
  results: Array<{
    originalSpecialty: string;
    mappedSpecialty: string | null;
    confidence: number;
    reason: string;
  }>;
}

/**
 * Integration class that bridges the new engine with your existing UI
 */
export class SpecialtyMappingIntegration {
  private engine: SpecialtyMappingEngine;
  private config: MappingEngineConfig;

  constructor(config: MappingEngineConfig) {
    this.config = config;
    this.engine = this.createEngine();
  }

  /**
   * Create and configure the mapping engine
   */
  private createEngine(): SpecialtyMappingEngine {
    // Load taxonomy, synonyms, and rules
    const taxonomy = this.loadTaxonomy();
    const synonyms = this.loadSynonyms();
    const rules = this.loadRules();
    const overrides = this.loadOverrides();

    // Create configuration based on user settings
    const engineConfig = {
      ...DEFAULT_MAPPING_CONFIG,
      minDecisionThreshold: this.config.confidenceThreshold,
      featureFlags: {
        useJaroWinkler: this.config.useFuzzyMatching,
        useTokenSetRatio: false
      }
    };

    return new SpecialtyMappingEngine(
      engineConfig,
      taxonomy,
      synonyms,
      rules,
      overrides
    );
  }

  /**
   * Auto-map unmapped specialties using the new engine
   */
  async autoMapSpecialties(unmappedSpecialties: IUnmappedSpecialty[]): Promise<AutoMappingResult> {
    const results: AutoMappingResult['results'] = [];
    let mappedCount = 0;
    let unmappedCount = 0;

    for (const specialty of unmappedSpecialties) {
      try {
        // Convert to RawInput format
        const rawInput: RawInput = {
          source: this.config.source,
          rawName: specialty.name,
          meta: {
            surveySource: specialty.surveySource,
            frequency: specialty.frequency
          }
        };

        // Map the specialty
        const decision = await this.engine.mapSpecialty(rawInput);

        if (decision.decidedCanonicalId && decision.confidence >= this.config.confidenceThreshold) {
          results.push({
            originalSpecialty: specialty.name,
            mappedSpecialty: decision.decidedCanonicalId,
            confidence: decision.confidence,
            reason: decision.notes || 'Auto-mapped by engine'
          });
          mappedCount++;
        } else {
          results.push({
            originalSpecialty: specialty.name,
            mappedSpecialty: null,
            confidence: decision.confidence,
            reason: decision.notes || 'Below confidence threshold'
          });
          unmappedCount++;
        }
      } catch (error) {
        console.error('Error mapping specialty:', specialty.name, error);
        results.push({
          originalSpecialty: specialty.name,
          mappedSpecialty: null,
          confidence: 0,
          reason: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
        });
        unmappedCount++;
      }
    }

    return {
      mappedCount,
      unmappedCount,
      results
    };
  }

  /**
   * Get mapping suggestions for a specific specialty
   */
  async getMappingSuggestions(specialty: string): Promise<Array<{
    canonicalId: string;
    name: string;
    confidence: number;
    reasons: string[];
  }>> {
    const rawInput: RawInput = {
      source: this.config.source,
      rawName: specialty
    };

    const decision = await this.engine.mapSpecialty(rawInput);
    
    return decision.candidates.map(candidate => {
      const canonical = this.findCanonicalSpecialty(candidate.canonicalId);
      return {
        canonicalId: candidate.canonicalId,
        name: canonical?.name || candidate.canonicalId,
        confidence: candidate.score,
        reasons: candidate.reasons
      };
    });
  }

  /**
   * Load taxonomy from YAML (simplified - in real implementation, use YAML loader)
   */
  private loadTaxonomy(): CanonicalSpecialty[] {
    // This would load from taxonomy.yaml in a real implementation
    // For now, return a basic set
    return [
      {
        id: 'CARD-GENERAL',
        parent: 'Cardiology',
        name: 'General Cardiology',
        domain: 'ADULT',
        tags: ['cardiology', 'general', 'adult']
      },
      {
        id: 'CARD-INTERVENTIONAL',
        parent: 'Cardiology',
        name: 'Interventional Cardiology',
        domain: 'ADULT',
        tags: ['cardiology', 'interventional', 'invasive', 'adult']
      },
      {
        id: 'PEDS-CARD-GENERAL',
        parent: 'Pediatric Cardiology',
        name: 'General Pediatric Cardiology',
        domain: 'PEDIATRIC',
        tags: ['pediatric', 'cardiology', 'general', 'peds']
      }
      // ... more specialties would be loaded from taxonomy.yaml
    ];
  }

  /**
   * Load synonyms from YAML (simplified)
   */
  private loadSynonyms(): SynonymsConfig {
    return {
      domainHints: {
        pediatric: ['pediatric', 'ped', 'peds', 'neonatal', 'nicu', 'picu'],
        adult: ['adult', 'geriatric', 'elderly']
      },
      parentSynonyms: {
        'Cardiology': ['cardiology', 'cardiovascular', 'cardiac', 'heart'],
        'Pediatric Cardiology': ['pediatric cardiology', 'pediatric cardiovascular', 'peds cardiology'],
        'Neurology': ['neurology', 'neurological', 'neuro', 'brain'],
        'Surgery': ['surgery', 'surgical', 'surgeon'],
        'Radiology': ['radiology', 'radiologist', 'imaging', 'diagnostic radiology']
      },
      subspecialtyTokens: {
        'interventional': ['interventional', 'invasive', 'invasive-interventional'],
        'imaging': ['imaging', 'echo', 'ct', 'mri', 'nuclear'],
        'critical-care': ['critical care', 'intensivist', 'icu'],
        'transplant': ['transplant', 'transplantation', 'txp']
      },
      negativeTokens: {
        'Cardiology': ['surgery', 'surgical', 'surgeon'],
        'Neurology': ['neurosurgery', 'neurosurgeon', 'surgical'],
        'Radiology': ['radiation oncology', 'radiation therapy', 'oncology']
      }
    };
  }

  /**
   * Load rules from YAML files (simplified)
   */
  private loadRules(): RulesConfig[] {
    return [
      {
        version: '1.0.0',
        hardMaps: [
          {
            id: 'EXACT_CARD_GENERAL',
            pattern: '^cardiology$',
            canonicalId: 'CARD-GENERAL',
            confidence: 0.95
          },
          {
            id: 'EXACT_CARD_INTERVENTIONAL',
            pattern: '^(interventional|invasive).*cardiology$',
            canonicalId: 'CARD-INTERVENTIONAL',
            confidence: 0.95
          }
        ],
        blocks: [],
        bucketingHints: [
          {
            id: 'HINT_CARDIOVASCULAR',
            pattern: '.*(cardiovascular|cardiac|heart).*',
            parent: 'Cardiology',
            confidence: 0.8
          }
        ]
      }
    ];
  }

  /**
   * Load overrides from JSON (simplified)
   */
  private loadOverrides(): any[] {
    return [
      {
        id: 'OVERRIDE_001',
        pattern: 'cardiology.*invasive.*interventional',
        canonicalId: 'CARD-INTERVENTIONAL',
        source: this.config.source,
        addedBy: 'system',
        addedAt: new Date().toISOString(),
        reason: 'Human-approved mapping'
      }
    ];
  }

  /**
   * Find canonical specialty by ID
   */
  private findCanonicalSpecialty(id: string): CanonicalSpecialty | undefined {
    const taxonomy = this.loadTaxonomy();
    return taxonomy.find(s => s.id === id);
  }
}
