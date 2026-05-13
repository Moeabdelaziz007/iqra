// بسم الله الرحمن الرحيم
// Baseline tests for Shannon H_EL entropy analyzer.

package engine

import (
	"math"
	"testing"
)

func TestCalculateShannonHEL_EmptyInput(t *testing.T) {
	got := CalculateShannonHEL("")
	if got.TotalEntropy != 0 || got.HEL != 0 || got.HasQuranSignature {
		t.Fatalf("empty input must produce zeroed result; got %+v", got)
	}
}

func TestCalculateShannonHEL_WhitespaceOnly(t *testing.T) {
	got := CalculateShannonHEL("   \t\n  ")
	if got.TotalEntropy != 0 {
		t.Fatalf("whitespace-only input must have zero entropy; got %v", got.TotalEntropy)
	}
}

func TestCalculateShannonHEL_SingleRepeatedChar(t *testing.T) {
	// One unique character → entropy MUST be zero.
	got := CalculateShannonHEL("aaaaaaaa")
	if math.Abs(got.TotalEntropy) > 1e-9 {
		t.Fatalf("single-char entropy must be 0, got %v", got.TotalEntropy)
	}
	// And totalH==0 must NOT propagate NaN into the signature check.
	if got.HasQuranSignature {
		t.Fatal("HasQuranSignature must be false when totalEntropy is zero")
	}
}

func TestCalculateShannonHEL_TwoEqualChars(t *testing.T) {
	// Two equally-probable characters → entropy = 1 bit per symbol.
	got := CalculateShannonHEL("ababab")
	want := 1.0
	if math.Abs(got.TotalEntropy-want) > 1e-9 {
		t.Errorf("totalEntropy for 50/50 mix: got %v want %v", got.TotalEntropy, want)
	}
}

func TestCalculateShannonHEL_FractalDimensionInRange(t *testing.T) {
	// The clamping logic in calculateFractalDimension must keep the
	// returned value in [1.0, 2.0] regardless of input.
	cases := []string{
		"a",
		"ab",
		"the quick brown fox jumps over the lazy dog",
		"بسم الله الرحمن الرحيم",
	}
	for _, in := range cases {
		got := CalculateShannonHEL(in)
		if got.FractalDimension < 1.0 || got.FractalDimension > 2.0 {
			t.Errorf("fractal dimension out of [1,2] for %q: %v", in, got.FractalDimension)
		}
	}
}

func TestExtractWords(t *testing.T) {
	tests := []struct {
		in   string
		want int
	}{
		{"", 0},
		{"hello world", 2},
		{"  spaced   out  ", 2},
		{"بسم الله الرحمن الرحيم", 4},
		// Trailing period acts as a word boundary, so this yields 2 words
		// (the boundary check in extractWords flushes on any non-letter).
		{"trailing punctuation.", 2},
	}
	for _, tt := range tests {
		got := extractWords(tt.in)
		if len(got) != tt.want {
			t.Errorf("extractWords(%q) length: got %d want %d", tt.in, len(got), tt.want)
		}
	}
}
