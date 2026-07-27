import type { ConfidenceLabel, ForecastInputKey } from '@/types/forecast';
import type {
  DifficultyFactors,
  DifficultyLevel,
  SpotType,
} from '@/types/spot';
import type { DirectionInterpretation } from '@/lib/spots/exposure';

export type SafetyStatus = 'Safe' | 'Caution' | 'Dangerous' | 'Unknown';
export type SafetyWarningSeverity = 'warning' | 'critical';

export interface SafetyWarning {
  code: string;
  severity: SafetyWarningSeverity;
  message: string;
}

export interface SafetySpotInput {
  slug: string;
  spotType: SpotType;
  difficultyLevel: DifficultyLevel;
  difficultyFactors: DifficultyFactors | null;
}

export interface SafetyResult {
  /** Null when primary safety inputs are unavailable. */
  score: number | null;
  status: SafetyStatus;
  warnings: SafetyWarning[];
  criticalWarnings: SafetyWarning[];
  missingSafetyInputs: ForecastInputKey[];
  confidence: ConfidenceLabel;
  completenessPercentage: number;
  explanation: string;
  direction: DirectionInterpretation;
  limitations: string[];
}

