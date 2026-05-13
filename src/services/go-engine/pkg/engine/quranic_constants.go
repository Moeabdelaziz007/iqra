// بسم الله الرحمن الرحيم
// Quranic signal constants — single source of truth for the empirical
// thresholds used across the analyzers.
//
// Every constant in this file derives from a published research result or
// from internal exploratory analysis; do NOT change a value without
// (a) updating the comment to point at the new source, and
// (b) re-running the affected baseline tests, which assert ranges around
//     these thresholds rather than exact values so small revisions don't
//     break the suite.

package engine

const (
	// QuranFractalDimension is the box-counting fractal dimension empirically
	// observed for Quranic text in the DISCOVERIES corpus. Used as the centre
	// of the QuranFractalTolerance window in detectQuranSignature.
	QuranFractalDimension = 1.44

	// QuranFractalTolerance is the symmetric half-width of the fractal-match
	// window used by Shannon H_EL signature detection (|fractal - 1.44| < 0.15).
	QuranFractalTolerance = 0.15

	// QuranFractalToleranceLoose is a wider half-width used by the topological
	// homology detector for the same fractal-dimension match. Wider because
	// the persistent-homology slope estimator has higher variance than the
	// box-counting estimator. (|alpha - 1.44| < 0.2).
	QuranFractalToleranceLoose = 0.2

	// QuranHELRatioLow / High bound the H_EL / total-entropy ratio that
	// historically marks Quranic text: between 0.6 and 0.9 inclusive of
	// non-strict comparison.
	QuranHELRatioLow  = 0.6
	QuranHELRatioHigh = 0.9

	// PinkNoiseLow / High define the topological-noise window in which the
	// signal is considered 1/f pink noise (often associated with Quranic
	// recitation patterns).
	PinkNoiseLow  = 0.9
	PinkNoiseHigh = 1.1

	// PersistenceMinGap is the minimum gap between sorted samples that we
	// treat as a meaningful persistence interval (anything smaller is
	// considered numerical noise in the simplified Vietoris-Rips
	// approximation).
	PersistenceMinGap = 0.01

	// OverallResonanceFractalBonus is the contribution to a surah's overall
	// resonance score when its homology analysis flagged a fractal structure.
	OverallResonanceFractalBonus = 0.9

	// OverallResonanceBaseline is the contribution when homology was run but
	// no fractal was detected.
	OverallResonanceBaseline = 0.5

	// HighResonanceThreshold is the cut-off above which a surah is reported
	// in AnalysisSummary.HighResonanceSurahs.
	HighResonanceThreshold = 0.7

	// MinLIDCorpusSize is the minimum number of reference points required
	// for the MLE-LID estimator to produce a non-degenerate result. Below
	// this, the LID step in ProcessBatchParallel is skipped and a warning
	// is attached to the surah's ParallelResult.Warnings instead of
	// fabricating a synthetic corpus.
	MinLIDCorpusSize = 8
)
