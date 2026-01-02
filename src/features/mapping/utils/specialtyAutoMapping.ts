/**
 * Specialty Auto-Mapping Types
 * 
 * NOTE: Auto-mapping suggestion functionality has been removed.
 * Only the type definitions remain for backward compatibility.
 * The system now relies solely on learned mappings from previous manual mappings.
 */

import { IUnmappedSpecialty } from '../types/mapping';

/**
 * Auto-map suggestion interface (kept for type compatibility)
 * @deprecated Auto-mapping suggestions are no longer generated
 */
export interface SpecialtyAutoMapSuggestion {
  source: IUnmappedSpecialty;
  suggestedStandardizedName: string;
  confidence: number;
  reason: string;
  isAmbiguous: boolean;
  candidateCount: number;
  sourceDomain: string;
  targetDomain: string;
  domainMismatch: boolean;
}
