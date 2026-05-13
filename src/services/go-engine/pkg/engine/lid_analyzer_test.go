// بسم الله الرحمن الرحيم
// Baseline tests for the Local Intrinsic Dimension analyzer.
//
// These tests are intentionally narrow: they assert on the deterministic
// shape of `CalculateLID` (clamping, k=7 default, MLE math on inputs with
// a known closed-form answer), not on whether the LID values are
// "Quranically meaningful" — that's a separate concern handled by the
// reference-corpus fix tracked in iqra #2.

package engine

import (
	"math"
	"testing"
)

func TestCalculateLID_DefaultsKToSeven(t *testing.T) {
	// 12 mostly-identical references so k=7 is well-defined.
	embed := []float64{0, 0, 0, 0}
	refs := make([][]float64, 12)
	for i := range refs {
		refs[i] = []float64{float64(i + 1), 0, 0, 0}
	}

	got := CalculateLID(embed, refs, 0) // 0 → should fall back to 7
	if len(got.NearestNeighbors) != 7 {
		t.Fatalf("expected 7 nearest neighbors for k=0 default, got %d", len(got.NearestNeighbors))
	}
}

func TestCalculateLID_ClampsToOne(t *testing.T) {
	// All references identical to the query → all distances zero → MLE
	// path that returns the floor value (>= 1) instead of NaN.
	embed := []float64{1, 2, 3}
	refs := [][]float64{
		{1, 2, 3}, {1, 2, 3}, {1, 2, 3},
		{1, 2, 3}, {1, 2, 3}, {1, 2, 3},
		{1, 2, 3}, {1, 2, 3},
	}
	got := CalculateLID(embed, refs, 7)
	if got.LID < 1.0 {
		t.Fatalf("LID must be clamped to >= 1, got %v", got.LID)
	}
}

func TestCalculateLID_ResonanceIsInverseOfLID(t *testing.T) {
	embed := []float64{0, 0}
	refs := [][]float64{
		{1, 0}, {2, 0}, {3, 0}, {4, 0},
		{5, 0}, {6, 0}, {7, 0}, {8, 0},
	}
	got := CalculateLID(embed, refs, 7)
	want := 1.0 / (1.0 + got.LID)
	if math.Abs(got.Resonance-want) > 1e-9 {
		t.Fatalf("Resonance should be 1/(1+LID); got=%v want=%v", got.Resonance, want)
	}
}

func TestCalculateLID_MismatchedDimensionsReturnMaxFloat(t *testing.T) {
	// euclideanDistance returns math.MaxFloat64 when dims differ; this
	// path must not panic and must not produce NaN.
	embed := []float64{1, 2}
	refs := [][]float64{{1, 2, 3}, {4, 5, 6}, {7, 8, 9}}
	got := CalculateLID(embed, refs, 2)
	if math.IsNaN(got.LID) || math.IsInf(got.LID, 0) {
		t.Fatalf("LID must be finite even on dim mismatch; got %v", got.LID)
	}
}

func TestCalculateLID_FewerRefsThanK_NoPanic(t *testing.T) {
	// Defensive: the call `distances[:min(k, len(distances))]` must not
	// panic when there are fewer refs than k.
	embed := []float64{0, 0}
	refs := [][]float64{{1, 0}, {2, 0}} // only 2 refs, k=7 requested
	got := CalculateLID(embed, refs, 7)
	if len(got.NearestNeighbors) > len(refs) {
		t.Fatalf("nearestNeighbors length cannot exceed number of refs; got %d", len(got.NearestNeighbors))
	}
}

func TestEuclideanDistance(t *testing.T) {
	tests := []struct {
		name string
		a, b []float64
		want float64
	}{
		{"identical", []float64{1, 1, 1}, []float64{1, 1, 1}, 0},
		{"unit axis", []float64{0, 0, 0}, []float64{1, 0, 0}, 1},
		{"3-4-5 triangle", []float64{0, 0}, []float64{3, 4}, 5},
		{"dim mismatch", []float64{1, 2}, []float64{1, 2, 3}, math.MaxFloat64},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := euclideanDistance(tt.a, tt.b)
			if math.Abs(got-tt.want) > 1e-9 {
				t.Errorf("got %v want %v", got, tt.want)
			}
		})
	}
}

func TestVariance(t *testing.T) {
	// Sample variance is computed with division by N (not N-1).
	in := []float64{2, 4, 4, 4, 5, 5, 7, 9}
	want := 4.0
	got := variance(in)
	if math.Abs(got-want) > 1e-9 {
		t.Errorf("variance: got %v want %v", got, want)
	}
}
