import type { SafetyStatus } from '@/lib/safety/types';

/** Urgent states remain prominent regardless of detailed-section ordering. */
export function isUrgentSafetyStatus(status: SafetyStatus): boolean {
  return status === 'Dangerous' || status === 'Unknown';
}
