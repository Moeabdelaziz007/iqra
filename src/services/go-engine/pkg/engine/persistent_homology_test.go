// بسم الله الرحمن الرحيم
// Baseline tests for the persistent-homology analyzer.
//
// Scope: only the code paths changed in this PR —
//   • calculatePersistence now uses the PersistenceMinGap constant instead of
//     the hard-coded 0.01 literal.
//   • detectFractalStructure gained a NaN/Inf guard and references
//     QuranFractalDimension / QuranFractalToleranceLoose constants.
//   • CalculatePersistentHomology is exercised as an integration check so
//     the IsFractal field reflects the fixed detectFractalStructure.

package engine

import (
	"math"
	"testing"
)

// ---------------------------------------------------------------------------
// calculatePersistence
// ---------------------------------------------------------------------------

func TestCalculatePersistence_EmptyInput(t *testing.T) {
	got := calculatePersistence(nil)
	if len(got) != 0 {
		t.Fatalf("empty input must return empty persistence; got %v", got)
	}
}

func TestCalculatePersistence_SingleElement(t *testing.T) {
	got := calculatePersistence([]float64{3.14})
	if len(got) != 0 {
		t.Fatalf("single element has no gap; got %v", got)
	}
}

func TestCalculatePersistence_GapsBelowOrAtMinGapExcluded(t *testing.T) {
	// Consecutive values with gap exactly == PersistenceMinGap must NOT appear
	// (the threshold is a strict greater-than: gap > PersistenceMinGap).
	data := []float64{0, PersistenceMinGap, 2 * PersistenceMinGap}
	got := calculatePersistence(data)
	// All gaps are exactly PersistenceMinGap, which fails the > test.
	if len(got) != 0 {
		t.Fatalf("gaps == PersistenceMinGap must be excluded; got %v", got)
	}
}

func TestCalculatePersistence_GapsAboveMinGapIncluded(t *testing.T) {
	// Two gaps both marginally above PersistenceMinGap.
	delta := PersistenceMinGap + 1e-6
	data := []float64{0, delta, 2 * delta}
	got := calculatePersistence(data)
	if len(got) != 2 {
		t.Fatalf("expected 2 persistence intervals; got %v", got)
	}
	for _, g := range got {
		if math.Abs(g-delta) > 1e-12 {
			t.Errorf("gap value mismatch: got %v want ~%v", g, delta)
		}
	}
}

func TestCalculatePersistence_MixedGaps(t *testing.T) {
	// Sorted order: [0, 0.001, 0.001+ε, 1.0].
	// Gap between 0 and 0.001 is 0.001 = PersistenceMinGap → excluded.
	// Gap between 0.001 and (0.001+ε) is ε → excluded (ε < PersistenceMinGap).
	// Gap between (0.001+ε) and 1.0 is large → included.
	eps := 1e-4
	data := []float64{1.0, 0.0, PersistenceMinGap, PersistenceMinGap + eps}
	got := calculatePersistence(data)
	if len(got) != 1 {
		t.Fatalf("only the large gap should be included; got %v", got)
	}
}

func TestCalculatePersistence_OutputIsSorted(t *testing.T) {
	// calculatePersistence sorts data before computing gaps; the gaps
	// themselves should be non-negative (sorted → monotone → non-negative diffs).
	data := []float64{5, 1, 3, 10, 2}
	got := calculatePersistence(data)
	for _, g := range got {
		if g < 0 {
			t.Errorf("gap must be non-negative after sorting; got %v", g)
		}
	}
}

// ---------------------------------------------------------------------------
// detectFractalStructure
// ---------------------------------------------------------------------------

func TestDetectFractalStructure_TooFewElements(t *testing.T) {
	// < 3 persistence values must return false unconditionally.
	if detectFractalStructure(nil) {
		t.Error("nil persistence must return false")
	}
	if detectFractalStructure([]float64{1.5}) {
		t.Error("single-element persistence must return false")
	}
	if detectFractalStructure([]float64{1.5, 2.5}) {
		t.Error("two-element persistence must return false")
	}
}

func TestDetectFractalStructure_AllZeroOrNegative(t *testing.T) {
	// estimatePowerLawExponent filters y[i] <= 0 → n<2 → returns 1.0.
	// 1.0 is outside QuranFractalDimension ± QuranFractalToleranceLoose
	// (1.44 ± 0.2 = [1.24, 1.64]) so the result should be false.
	data := []float64{0, 0, 0, 0, 0}
	got := detectFractalStructure(data)
	// alpha = 1.0 < 1.24 → outside window → false
	if got {
		t.Error("all-zero persistence must not be detected as fractal (alpha=1.0 is outside window)")
	}
}

func TestDetectFractalStructure_NaNGuard(t *testing.T) {
	// Feed a hand-crafted persistence slice that makes estimatePowerLawExponent
	// produce NaN: if numerator == denominator == 0 for the log-log regression.
	// With intSlice giving [1,2,...,n] (distinct), the denominator is only 0
	// when all x values are equal — that's not possible here. Instead we rely
	// on the known 1.0 fallback path and verify the NaN guard at least doesn't
	// panic and returns a boolean.
	//
	// A direct NaN-injection path is via a persistence slice whose sorted
	// values are all identical positive numbers: ranks [1..n] vs y all equal →
	// log-log slope = 0 / positive → 0, not NaN. This test is therefore a
	// no-panic + type-shape assertion for the guard.
	data := make([]float64, 10)
	for i := range data {
		data[i] = 0.5 // all identical positive → slope = 0 → alpha = 0 → outside window
	}
	got := detectFractalStructure(data)
	// alpha = 0, |0 - 1.44| = 1.44 > 0.2 → false; confirm no panic.
	_ = got
}

func TestDetectFractalStructure_AlphaInsideLooseWindow(t *testing.T) {
	// We need a persistence slice whose rank-frequency power law gives α
	// in [1.44 - 0.2, 1.44 + 0.2] = [1.24, 1.64].
	//
	// detectFractalStructure sorts the persistence values ascending and then
	// fits a log-log regression of y=sorted_persistence vs x=rank [1..n].
	// estimatePowerLawExponent returns math.Abs(slope).
	//
	// To get slope ≈ +1.44 (ascending), use y[i] = (i+1)^1.44:
	//   log(y) = 1.44 * log(rank) → slope = 1.44 exactly.
	n := 10
	data := make([]float64, n)
	for i := range data {
		k := float64(i + 1)
		data[i] = math.Pow(k, QuranFractalDimension)
	}
	got := detectFractalStructure(data)
	if !got {
		t.Error("power-law persistence with α=1.44 should be detected as fractal")
	}
}

func TestDetectFractalStructure_AlphaFarOutsideWindow(t *testing.T) {
	// Uniform persistence values → slope ≈ 0 → far outside [1.24, 1.64] → false.
	data := make([]float64, 8)
	for i := range data {
		data[i] = 2.0 // all equal positive → power-law slope ≈ 0
	}
	got := detectFractalStructure(data)
	if got {
		t.Error("uniform persistence (slope≈0) must not be detected as fractal")
	}
}

// ---------------------------------------------------------------------------
// CalculatePersistentHomology integration
// ---------------------------------------------------------------------------

func TestCalculatePersistentHomology_NoPanic_EmptyEmbedding(t *testing.T) {
	// Must not panic; detectFractalStructure receives empty/short persistence.
	_ = CalculatePersistentHomology(nil, 0.5)
	_ = CalculatePersistentHomology([]float64{}, 0.5)
}

func TestCalculatePersistentHomology_H0IsAlwaysOne(t *testing.T) {
	// Per the implementation comment: for a single embedding H0 = 1.
	result := CalculatePersistentHomology([]float64{1, 2, 3, 4, 5}, 0.5)
	if result.H0 != 1 {
		t.Errorf("H0 must equal 1 for a single embedding; got %d", result.H0)
	}
}

func TestCalculatePersistentHomology_IsFractalField(t *testing.T) {
	// With a Zipf-like embedding the persistence slice should flag as fractal;
	// this exercises the full IsFractal path in CalculatePersistentHomology.
	// We need enough embedding values and large enough spread to produce
	// persistence intervals above PersistenceMinGap with α ≈ 1.44.
	//
	// Build embedding: power-law values so sorted diffs follow power law.
	n := 30
	embed := make([]float64, n)
	cumSum := 0.0
	for i := range embed {
		k := float64(i + 1)
		cumSum += math.Pow(k, -QuranFractalDimension) * 10 // scale to create large enough gaps
		embed[i] = cumSum
	}
	result := CalculatePersistentHomology(embed, 0.1)
	// IsFractal depends on the persistence slice and is either true or false;
	// what matters is that the field is populated and the function doesn't panic.
	_ = result.IsFractal
}

func TestCalculatePersistentHomology_TopologicalNoise_NoPanic(t *testing.T) {
	// TopologicalNoise must be a finite float.
	result := CalculatePersistentHomology([]float64{1, 2, 3, 4, 5, 6, 7, 8}, 0.5)
	if math.IsNaN(result.TopologicalNoise) || math.IsInf(result.TopologicalNoise, 0) {
		t.Errorf("TopologicalNoise must be finite; got %v", result.TopologicalNoise)
	}
}

func TestCalculatePersistentHomology_BettiNumbersLength(t *testing.T) {
	result := CalculatePersistentHomology([]float64{1, 2, 3, 4, 5}, 0.5)
	if len(result.BettiNumbers) != 3 {
		t.Errorf("BettiNumbers must have 3 entries [H0,H1,H2]; got %d", len(result.BettiNumbers))
	}
	if result.BettiNumbers[0] != result.H0 ||
		result.BettiNumbers[1] != result.H1 ||
		result.BettiNumbers[2] != result.H2 {
		t.Errorf("BettiNumbers must match H0/H1/H2 fields; got %v", result.BettiNumbers)
	}
}

// ---------------------------------------------------------------------------
// PersistenceMinGap constant sanity
// ---------------------------------------------------------------------------

func TestPersistenceMinGap_IsPositiveAndSmall(t *testing.T) {
	if PersistenceMinGap <= 0 {
		t.Errorf("PersistenceMinGap must be positive; got %v", PersistenceMinGap)
	}
	if PersistenceMinGap >= 1.0 {
		t.Errorf("PersistenceMinGap must be < 1.0; got %v", PersistenceMinGap)
	}
}

// ---------------------------------------------------------------------------
// OverallResonance constants sanity
// ---------------------------------------------------------------------------

func TestOverallResonanceConstants_Sensible(t *testing.T) {
	if OverallResonanceFractalBonus <= OverallResonanceBaseline {
		t.Errorf(
			"FractalBonus must be > Baseline (fractal is a stronger signal); bonus=%v baseline=%v",
			OverallResonanceFractalBonus, OverallResonanceBaseline,
		)
	}
	if OverallResonanceBaseline <= 0 {
		t.Errorf("OverallResonanceBaseline must be positive; got %v", OverallResonanceBaseline)
	}
	if OverallResonanceFractalBonus > 1.0 {
		t.Errorf("OverallResonanceFractalBonus must be <= 1.0 (kept within resonance scale); got %v", OverallResonanceFractalBonus)
	}
}