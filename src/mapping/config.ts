/**
 * Configuration for the specialty mapping engine
 * 
 * This file contains all the thresholds, weights, and feature flags
 * that control the behavior of the mapping engine.
 */

import { MappingConfig } from './types';

/**
 * Default mapping configuration
 */
export const DEFAULT_MAPPING_CONFIG: MappingConfig = {
  /** Minimum confidence threshold for auto-decision */
  minDecisionThreshold: 0.68,
  
  /** Confidence for hard-mapped rules */
  hardMapConfidence: 0.95,
  
  /** Scoring weights for different factors */
  weights: {
    /** Weight for exact token matches */
    token: 0.40,
    /** Weight for synonym matches */
    synonym: 0.20,
    /** Weight for character similarity */
    charSim: 0.15,
    /** Penalty for negative token matches */
    negative: -0.30,
    /** Weight for source-specific hints */
    sourceHint: 0.05
  },
  
  /** Feature flags for algorithm selection */
  featureFlags: {
    /** Use Jaro-Winkler similarity algorithm */
    useJaroWinkler: true,
    /** Use token set ratio algorithm */
    useTokenSetRatio: false
  }
};

/**
 * Alternative configurations for different use cases
 */
export const CONFIGURATIONS = {
  /** Conservative configuration - higher threshold, fewer auto-decisions */
  conservative: {
    ...DEFAULT_MAPPING_CONFIG,
    minDecisionThreshold: 0.80,
    weights: {
      ...DEFAULT_MAPPING_CONFIG.weights,
      token: 0.50,
      synonym: 0.25,
      charSim: 0.10,
      negative: -0.40,
      sourceHint: 0.05
    }
  },
  
  /** Aggressive configuration - lower threshold, more auto-decisions */
  aggressive: {
    ...DEFAULT_MAPPING_CONFIG,
    minDecisionThreshold: 0.55,
    weights: {
      ...DEFAULT_MAPPING_CONFIG.weights,
      token: 0.35,
      synonym: 0.20,
      charSim: 0.20,
      negative: -0.25,
      sourceHint: 0.10
    }
  },
  
  /** Pediatric-focused configuration */
  pediatric: {
    ...DEFAULT_MAPPING_CONFIG,
    minDecisionThreshold: 0.70,
    weights: {
      ...DEFAULT_MAPPING_CONFIG.weights,
      token: 0.45,
      synonym: 0.20,
      charSim: 0.15,
      negative: -0.35,
      sourceHint: 0.05
    }
  },
  
  /** Adult-focused configuration */
  adult: {
    ...DEFAULT_MAPPING_CONFIG,
    minDecisionThreshold: 0.65,
    weights: {
      ...DEFAULT_MAPPING_CONFIG.weights,
      token: 0.40,
      synonym: 0.20,
      charSim: 0.15,
      negative: -0.30,
      sourceHint: 0.05
    }
  }
} as const;

/**
 * Configuration validation
 */
export function validateConfig(config: MappingConfig): string[] {
  const errors: string[] = [];
  
  if (config.minDecisionThreshold < 0 || config.minDecisionThreshold > 1) {
    errors.push('minDecisionThreshold must be between 0 and 1');
  }
  
  if (config.hardMapConfidence < 0 || config.hardMapConfidence > 1) {
    errors.push('hardMapConfidence must be between 0 and 1');
  }
  
  const weights = config.weights;
  if (weights.token < 0 || weights.token > 1) {
    errors.push('weights.token must be between 0 and 1');
  }
  
  if (weights.synonym < 0 || weights.synonym > 1) {
    errors.push('weights.synonym must be between 0 and 1');
  }
  
  if (weights.charSim < 0 || weights.charSim > 1) {
    errors.push('weights.charSim must be between 0 and 1');
  }
  
  if (weights.negative > 0) {
    errors.push('weights.negative should be negative (penalty)');
  }
  
  if (weights.sourceHint < 0 || weights.sourceHint > 1) {
    errors.push('weights.sourceHint must be between 0 and 1');
  }
  
  // Check that weights sum to approximately 1.0
  const totalWeight = weights.token + weights.synonym + weights.charSim + weights.sourceHint;
  if (Math.abs(totalWeight - 1.0) > 0.1) {
    errors.push(`Weights should sum to approximately 1.0, got ${totalWeight}`);
  }
  
  return errors;
}

/**
 * Get configuration by name
 */
export function getConfig(name: keyof typeof CONFIGURATIONS = 'conservative'): MappingConfig {
  return CONFIGURATIONS[name];
}

/**
 * Create custom configuration
 */
export function createCustomConfig(overrides: Partial<MappingConfig>): MappingConfig {
  const config = { ...DEFAULT_MAPPING_CONFIG, ...overrides };
  
  // Validate the custom configuration
  const errors = validateConfig(config);
  if (errors.length > 0) {
    throw new Error(`Invalid configuration: ${errors.join(', ')}`);
  }
  
  return config;
}
