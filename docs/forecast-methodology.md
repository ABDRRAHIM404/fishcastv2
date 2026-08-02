# FishCast forecast methodology

FishCast presents seven local forecast days in `Africa/Casablanca`. Open-Meteo
Forecast supplies weather and wind, while Open-Meteo Marine supplies wave,
swell, current, sea-surface-temperature and modelled mean-sea-level data. All
provider calls, cache access and normalization happen on the server. The browser
receives decision-ready FishCast values, never raw provider responses.

## Display intervals

- **30 minutes:** samples the existing five-minute decision timeline on aligned
  half-hour boundaries. Points between provider timestamps are labelled
  **Interpolated estimate**.
- **1 hour:** samples aligned hourly boundaries and therefore prefers native
  provider timestamps where the provider series is available.
- **3 hours and 6 hours:** deterministic display aggregates. Ordinary numeric
  values use a documented mean, gust/wave/swell maxima remain conservative, and
  rain is accumulated. Bearings use a circular mean rather than an ordinary
  numeric average.
- **Safety at every interval:** always uses the worst underlying five-minute
  status, the minimum available safety score and the union of warnings. A brief
  Dangerous period is never hidden by a safe-looking average.

The internal five-minute series remains the source for scoring, safety and best
window detection. The coarser UI does not change scoring weights or safety
thresholds.

## Daily summary

The daily fishing headline uses the recommended window's peak point when a valid
window exists. Otherwise it uses the highest fishing-quality point and clearly
states that no window met recommendation requirements. Daily safety is the worst
status anywhere in the day, not an average. Maximum wave and gust values cover
the full day; representative wind, wave period, weather and confidence come
from the headline point.

Fishing quality and safety are separate decisions. A high fishing score is not
a recommendation to fish when safety is `Dangerous` or `Unknown`.

## Estimated values and limitations

- **Modelled tide:** FishCast derives height, movement and turning points from
  Open-Meteo Marine `sea_level_height_msl`. Values are relative to modelled mean
  sea level, are not official nautical tide predictions and must not be used for
  navigation.
- **Wave metrics:** wavelength, steepness and power are calculated deep-water
  estimates. Coastal bathymetry, breaking waves and local surge can differ.
- **Direction labels:** provider bearings describe where wind and waves come
  from. Onshore/offshore/cross-shore and swell relationship labels use coarse,
  unverified editorial spot orientation and must be locally verified.
- **Species:** a period only names a species linked to that spot, in its recorded
  season, and compatible with any recorded preferred-condition constraints.
  FishCast shows “Not available” rather than inventing a match or technique.
- **Confidence:** reports data completeness and freshness. It does not express
  certainty that real conditions will match the model.

## Browser state

The selected interval and view are stored in versioned browser local storage.
Spot route, date, interval, view and selected-day/all-days scope are also kept in
validated URL query parameters for sharing. No account is needed, and the
selected scrubber timestamp is intentionally not written to the URL.
