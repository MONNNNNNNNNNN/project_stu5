# Growth reference data

LMS (Box-Cox power/median/coefficient-of-variation) parameter tables used to compute
height/weight/BMI-for-age percentiles and SDS (z-scores), per TOR FR-7/FR-8.

Source: CDC's WHO-based growth charts — WHO Child Growth Standards for birth–2 years
(weight/length), CDC 2000 Growth Charts for 2–20 years (weight/stature/BMI). This is
the standard hybrid reference used in US pediatric practice and is publicly published.

- `weight-infant.json`, `height-infant.json` — birth to 36 months, WHO-based
  (https://www.cdc.gov/growthcharts/data/zscore/wtageinf.csv,
  https://www.cdc.gov/growthcharts/data/zscore/lenageinf.csv)
- `weight-child.json`, `height-child.json`, `bmi-child.json` — 2 to 20 years, CDC 2000
  (https://www.cdc.gov/growthcharts/data/zscore/wtage.csv,
  https://www.cdc.gov/growthcharts/data/zscore/statage.csv,
  https://www.cdc.gov/growthcharts/data/zscore/bmiagerev.csv)

Each row: `{ sex: 1 (male) | 2 (female), ageMonths, L, M, S }`. Retrieved 2026-07-21.

Z = ((x/M)^L − 1) / (L·S) when L ≠ 0, else ln(x/M)/S. Percentile = Φ(Z) × 100.
