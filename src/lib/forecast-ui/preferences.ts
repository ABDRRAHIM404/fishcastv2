export type ForecastTableMode = 'compact' | 'detailed';
export type ForecastTableGroup =
  | 'fishing'
  | 'safety'
  | 'wind'
  | 'waves'
  | 'tide'
  | 'environment';

export const FORECAST_TABLE_GROUPS: readonly ForecastTableGroup[] = [
  'fishing',
  'safety',
  'wind',
  'waves',
  'tide',
  'environment',
] as const;

export const MOBILE_DEFAULT_EXPANDED_GROUPS: readonly ForecastTableGroup[] = [
  'fishing',
  'safety',
  'wind',
  'waves',
] as const;

export interface ForecastTablePreference {
  mode: ForecastTableMode;
  expandedGroups: ForecastTableGroup[];
}

export function isForecastTableMode(
  value: unknown
): value is ForecastTableMode {
  return value === 'compact' || value === 'detailed';
}

export function parseForecastTablePreference(
  raw: string | null,
  device: 'mobile' | 'desktop'
): ForecastTablePreference {
  const fallback: ForecastTablePreference = {
    mode: device === 'mobile' ? 'compact' : 'detailed',
    expandedGroups:
      device === 'mobile'
        ? [...MOBILE_DEFAULT_EXPANDED_GROUPS]
        : [...FORECAST_TABLE_GROUPS],
  };
  if (!raw) return fallback;
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return fallback;
    }
    const record = value as Record<string, unknown>;
    if (
      record.version !== 1 ||
      !isForecastTableMode(record.mode) ||
      !Array.isArray(record.expandedGroups)
    ) {
      return fallback;
    }
    const expandedGroups = record.expandedGroups.filter(
      (group): group is ForecastTableGroup =>
        typeof group === 'string' &&
        FORECAST_TABLE_GROUPS.includes(group as ForecastTableGroup)
    );
    return { mode: record.mode, expandedGroups: [...new Set(expandedGroups)] };
  } catch {
    return fallback;
  }
}

