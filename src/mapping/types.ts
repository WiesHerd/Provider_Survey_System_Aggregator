/**
 * Core types for the deterministic specialty auto-mapper
 * 
 * This system harmonizes specialties across Gallagher, SullivanCotter, MGMA, and future sources.
 * It maintains strict domain barriers (Adult ↔ Pediatric) and preserves subspecialties.
 */

export type Source = "Gallagher" | "SullivanCotter" | "MGMA" | string;
export type Domain = "ADULT" | "PEDIATRIC" | "APP_OTHER";

/**
 * Canonical specialty definition with stable ID and metadata
 */
export interface CanonicalSpecialty {
  /** Stable ID, e.g. "CARD-INTERVENTIONAL" */
  id: string;
  /** Parent specialty, e.g. "Cardiology" */
  parent: string;
  /** Display name, e.g. "Interventional Cardiology" */
  name: string;
  /** Domain classification */
  domain: Domain;
  /** Tags for matching, e.g. ["interventional", "structural"] */
  tags: string[];
}

/**
 * Raw input from survey sources
 */
export interface RawInput {
  /** Source survey identifier */
  source: Source;
  /** Raw specialty string from survey */
  rawName: string;
  /** Optional source-specific metadata hints */
  meta?: Record<string, string | number | boolean>;
}

/**
 * A candidate match with scoring and reasoning
 */
export interface MatchCandidate {
  /** Canonical specialty ID */
  canonicalId: string;
  /** Confidence score 0-1 */
  score: number;
  /** Reasons for this match, e.g. ["token:interventional", "synonym:obgyn"] */
  reasons: string[];
}

/**
 * Final mapping decision with full explainability
 */
export interface MappingDecision {
  /** Original input */
  input: RawInput;
  /** Decided canonical ID (null if undecided) */
  decidedCanonicalId: string | null;
  /** Overall confidence 0-1 */
  confidence: number;
  /** Rule IDs that were applied */
  appliedRuleIds: string[];
  /** All candidates considered */
  candidates: MatchCandidate[];
  /** Additional notes */
  notes?: string;
}

/**
 * Configuration for mapping engine
 */
export interface MappingConfig {
  /** Minimum confidence threshold for auto-decision */
  minDecisionThreshold: number;
  /** Confidence for hard-mapped rules */
  hardMapConfidence: number;
  /** Scoring weights for different factors */
  weights: {
    token: number;
    synonym: number;
    charSim: number;
    negative: number;
    sourceHint: number;
  };
  /** Feature flags for algorithm selection */
  featureFlags: {
    useJaroWinkler: boolean;
    useTokenSetRatio: boolean;
  };
}

/**
 * Domain hints for classification
 */
export interface DomainHints {
  pediatric: string[];
  adult: string[];
}

/**
 * Parent specialty synonyms
 */
export interface ParentSynonyms {
  [parent: string]: string[];
}

/**
 * Subspecialty tokens for matching
 */
export interface SubspecialtyTokens {
  [token: string]: string[];
}

/**
 * Negative tokens that block certain parent assignments
 */
export interface NegativeTokens {
  [parent: string]: string[];
}

/**
 * Synonyms configuration
 */
export interface SynonymsConfig {
  domainHints: DomainHints;
  parentSynonyms: ParentSynonyms;
  subspecialtyTokens: SubspecialtyTokens;
  negativeTokens: NegativeTokens;
}

/**
 * Hard mapping rule
 */
export interface HardMapRule {
  id: string;
  pattern: string;
  canonicalId: string;
  confidence?: number;
}

/**
 * Blocking rule
 */
export interface BlockRule {
  id: string;
  condition: string;
  reason: string;
}

/**
 * Bucketing hint rule
 */
export interface BucketingHintRule {
  id: string;
  pattern: string;
  parent: string;
  confidence?: number;
}

/**
 * Rules configuration
 */
export interface RulesConfig {
  version: string;
  hardMaps: HardMapRule[];
  blocks: BlockRule[];
  bucketingHints: BucketingHintRule[];
}

/**
 * Human-approved override mapping
 */
export interface OverrideMapping {
  id: string;
  pattern: string;
  canonicalId: string;
  source?: Source;
  addedBy: string;
  addedAt: string;
  reason?: string;
}

/**
 * Evaluation test case
 */
export interface TestCase {
  id: string;
  input: RawInput;
  expectedCanonicalId: string | null;
  expectedConfidence?: number;
  description: string;
  tags: string[];
}

/**
 * Confusion report entry
 */
export interface ConfusionReportEntry {
  input: RawInput;
  decision: MappingDecision;
  parent: string;
  domain: Domain;
}

/**
 * Mapping engine result with statistics
 */
export interface MappingResult {
  decisions: MappingDecision[];
  autoDecided: number;
  undecided: number;
  confusionReport: ConfusionReportEntry[];
  statistics: {
    totalProcessed: number;
    autoDecideRate: number;
    averageConfidence: number;
    sourceBreakdown: Record<Source, number>;
  };
}
