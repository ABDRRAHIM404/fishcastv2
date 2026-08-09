import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE_KEY,
  LOCALE_STORAGE_KEY,
  SUPPORTED_LOCALES,
  directionForLocale,
  isSupportedLocale,
  localeOrFallback,
  type Locale,
} from '@/i18n/config';
import { createTranslator, DICTIONARIES, getDictionary } from '@/i18n/dictionaries';
import { en } from '@/i18n/dictionaries/en';
import {
  formatCoordinates,
  formatDateTime,
  formatMeasurement,
  formatScore,
  formatShortDate,
  formatTime,
} from '@/i18n/formatting';
import {
  detectLocaleFromLanguages,
  parseLocalePreference,
  preserveLocaleSwitchRoute,
  resolveLocalePreference,
  serializeLocalePreference,
} from '@/i18n/locale';
import {
  fishingStatus,
  forecastCacheLabel,
  providerAvailabilityMessage,
  safetyStatus,
} from '@/i18n/presentation';
import { publicSpotName } from '@/lib/forecast-ui/spots';
import { spotPageSectionOrDefault } from '@/lib/spot-page/state';

describe('locale selection', () => {
  it('validates the three supported locales and falls back safely', () => {
    expect(SUPPORTED_LOCALES).toEqual(['en', 'fr', 'ar']);
    expect(isSupportedLocale('FR')).toBe(true);
    expect(isSupportedLocale('de')).toBe(false);
    expect(localeOrFallback('de')).toBe(DEFAULT_LOCALE);
  });

  it('detects browser and weighted request languages', () => {
    expect(detectLocaleFromLanguages(['fr-MA', 'en-US'])).toBe('fr');
    expect(detectLocaleFromLanguages(['ar-MA', 'fr-FR'])).toBe('ar');
    expect(detectLocaleFromLanguages('en-GB;q=0.5, fr-MA;q=0.9')).toBe('fr');
    expect(detectLocaleFromLanguages('de-DE, es;q=0.8')).toBe('en');
  });

  it('gives a manual persisted preference priority and rejects invalid storage', () => {
    expect(resolveLocalePreference({ persisted: 'ar', languages: 'fr-MA' })).toBe('ar');
    expect(resolveLocalePreference({ persisted: 'invalid', languages: 'fr-MA' })).toBe('en');
    expect(resolveLocalePreference({ persisted: null, languages: 'fr-MA' })).toBe('fr');
    expect(parseLocalePreference('FR')).toBe('fr');
    expect(parseLocalePreference('{broken')).toBe('en');
    expect(serializeLocalePreference('ar')).toBe('ar');
    expect(LOCALE_COOKIE_KEY).toBe('fishcast_locale_v1');
    expect(LOCALE_STORAGE_KEY).toBe('fishcast_locale_v1');
  });

  it('selects document direction without duplicating direction state', () => {
    expect(directionForLocale('en')).toBe('ltr');
    expect(directionForLocale('fr')).toBe('ltr');
    expect(directionForLocale('ar')).toBe('rtl');
  });
});

describe('typed dictionaries', () => {
  it('have identical, non-empty key sets', () => {
    const expectedKeys = Object.keys(en).sort();
    for (const locale of SUPPORTED_LOCALES) {
      const dictionary = DICTIONARIES[locale];
      expect(Object.keys(dictionary).sort()).toEqual(expectedKeys);
      for (const value of Object.values(dictionary)) {
        if (typeof value === 'string') expect(value.trim()).not.toBe('');
      }
    }
  });

  it('contains required shell, forecast, safety and accessibility translations', () => {
    const requiredKeys = [
      'locale.selectorLabel',
      'nav.skip',
      'spot.forecast',
      'forecast.view.timeline',
      'conditions.height',
      'status.fishing.excellent',
      'status.safety.dangerous',
      'safety.noReliance',
      'table.caption',
      'graph.textAlternative',
    ] as const;
    for (const locale of SUPPORTED_LOCALES) {
      const dictionary = getDictionary(locale);
      for (const key of requiredKeys) expect(dictionary[key]).toBeTruthy();
    }
  });

  it('interpolates complete language-specific templates', () => {
    expect(createTranslator('en')('forecast.bestTime', { start: '06:30', end: '08:00' }))
      .toBe('Best 06:30–08:00');
    expect(createTranslator('fr')('forecast.bestTime', { start: '06:30', end: '08:00' }))
      .toBe('Meilleur créneau 06:30–08:00');
    expect(createTranslator('ar')('forecast.bestTime', { start: '06:30', end: '08:00' }))
      .toContain('06:30–08:00');
    expect(createTranslator('fr')('map.spotCount', { count: 0 })).toBe('0 spots');
    expect(createTranslator('ar')('map.spotCount', { count: 2 })).toBe('بقعتان');
  });

  it('uses English as the deterministic runtime dictionary fallback', () => {
    expect(getDictionary('xx' as Locale)).toBe(en);
  });
});

describe('localized presentation', () => {
  it('translates stable fishing and safety statuses rather than engine prose', () => {
    const fr = createTranslator('fr');
    const ar = createTranslator('ar');
    expect(fishingStatus(fr, 'Excellent')).toBe('Excellente');
    expect(fishingStatus(ar, 'Good')).toBe('جيدة');
    expect(safetyStatus(fr, 'Dangerous')).toBe('Dangereux');
    expect(safetyStatus(ar, 'Unknown')).toBe('غير معروف');
  });

  it('translates partial-provider and relative cache-age templates', () => {
    const fr = createTranslator('fr');
    expect(providerAvailabilityMessage(fr, {
      forecastFetchedAt: '2026-08-03T10:00:00+01:00',
      marineFetchedAt: null,
    })).toContain('marée modélisée');
    expect(forecastCacheLabel(fr, true, 18, false))
      .toBe('En cache il y a 18 min · actualisation');
  });
});

describe('Intl formatting', () => {
  it('uses French decimal conventions', () => {
    expect(formatMeasurement('fr', 1.5, 'm', 1)).toBe('1,5 m');
    expect(formatScore('fr', 74)).toBe('74/100');
  });

  it('uses readable Latin numerals in Arabic', () => {
    expect(formatMeasurement('ar', 1.5, 'm', 1)).toBe('1,5 m');
    const coordinates = formatCoordinates('ar', 30.1234, -9.5678);
    expect(coordinates.replace(/[\u200e\u200f]/g, '')).toBe('30,1234 ; -9,5678');
    expect(coordinates).not.toMatch(/[\u0660-\u0669]/);
  });

  it('always formats forecast timestamps in Africa/Casablanca', () => {
    expect(formatTime('en', '2026-08-03T05:30:00Z')).toBe('06:30');
    expect(formatTime('fr', '2026-08-03T05:30:00Z')).toBe('06:30');
    expect(formatTime('ar', '2026-08-03T05:30:00Z')).toBe('06:30');
    expect(formatDateTime('en', '2026-08-03T05:30:00Z')).toContain('06:30');
    expect(formatShortDate('fr', '2026-08-03')).toBe('03/08/2026');
  });
});

describe('language-neutral product and route state', () => {
  it('preserves the verified Am9erss display mapping', () => {
    expect(publicSpotName('massa', 'Massa')).toBe('Am9erss');
    expect(publicSpotName('am9erss', 'Massa')).toBe('Am9erss');
  });

  it('keeps translated labels separate from stable section identifiers', () => {
    expect(spotPageSectionOrDefault('forecast')).toBe('forecast');
    expect(spotPageSectionOrDefault('التوقعات')).toBe('overview');
  });

  it('preserves route, spot, section, date, interval, view, scope and hash on switch', () => {
    expect(preserveLocaleSwitchRoute(
      '/spots/massa',
      '?section=forecast&date=2026-08-04&interval=1h&view=graph&scope=seven-days',
      '#forecast-graph'
    )).toBe(
      '/spots/massa?section=forecast&date=2026-08-04&interval=1h&view=graph&scope=seven-days#forecast-graph'
    );
  });
});

describe('localized source audit', () => {
  it('does not leave literal English accessibility attributes or common UI text in active localized components', () => {
    const files = [
      'src/components/shared/app-shell.tsx',
      'src/components/shared/language-selector.tsx',
      'src/components/home/homepage-experience.tsx',
      'src/components/home/homepage-standard-content.tsx',
      'src/components/home/sequence/homepage-cinematic-story.tsx',
      'src/components/forecast/forecast-experience.tsx',
      'src/components/forecast/forecast-overview.tsx',
      'src/components/forecast/forecast-conditions.tsx',
      'src/components/forecast/forecast-table.tsx',
      'src/components/forecast/forecast-graphs.tsx',
      'src/components/forecast/forecast-timeline.tsx',
      'src/components/forecast/forecast-comparison.tsx',
      'src/components/map/fishing-map.tsx',
      'src/components/species/species-catalog.tsx',
      'src/components/spot/spot-page-experience.tsx',
    ];
    const literalAttribute = /(?:aria-label|aria-description|aria-valuetext|placeholder)=["'][A-Za-z][^"']*["']/;
    const literalText = />\s*(?:Home|Overview|Forecast|Conditions|Species|Spot guide|Try again|Close|Previous|Next|Loading[^<{]*)\s*</;
    for (const file of files) {
      const source = readFileSync(file, 'utf8');
      expect(source, file).not.toMatch(literalAttribute);
      expect(source, file).not.toMatch(literalText);
    }
  });
});
