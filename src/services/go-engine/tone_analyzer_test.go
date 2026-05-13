// بسم الله الرحمن الرحيم
// Baseline tests for the Abjad tone analyzer.
//
// The DFT loop in CalculateTone uses each rune's Abjad value as a signal
// sample. These tests check that the deterministic shape of the result
// matches expectations on small, hand-tractable inputs.

package main

import (
	"math"
	"testing"
)

func TestCalculateTone_EmptyText(t *testing.T) {
	got := CalculateTone("")
	if got.DominantFrequency != 0 || got.ResonancePower != 0 || got.Spectrum != nil {
		t.Fatalf("empty input must return zero-valued ToneResult; got %+v", got)
	}
}

func TestCalculateTone_NonArabicText(t *testing.T) {
	// Non-Arabic chars are not in AbjadMap → signal stays empty → zero.
	got := CalculateTone("hello world")
	if got.DominantFrequency != 0 || got.ResonancePower != 0 {
		t.Fatalf("non-Arabic input should produce empty signal; got %+v", got)
	}
}

func TestCalculateTone_SingleArabicChar(t *testing.T) {
	// len(signal) < 2 → early return with zero result.
	got := CalculateTone("ا")
	if got.DominantFrequency != 0 || got.ResonancePower != 0 {
		t.Fatalf("single-character signal must short-circuit; got %+v", got)
	}
}

func TestCalculateTone_SpectrumLengthIsHalfPlusOne(t *testing.T) {
	// 8 sample DFT → spectrum length n/2 + 1 = 5.
	in := "ابجدابجد" // 8 mapped runes
	got := CalculateTone(in)
	if len(got.Spectrum) != 5 {
		t.Fatalf("expected spectrum length 5 for n=8 signal, got %d", len(got.Spectrum))
	}
}

func TestCalculateTone_DominantFrequencyIsNormalised(t *testing.T) {
	// CalculateTone reports domFreq = k/n where k>0 and k <= n/2,
	// so domFreq must be in (0, 0.5].
	in := "ابجدابجد"
	got := CalculateTone(in)
	if got.DominantFrequency <= 0 || got.DominantFrequency > 0.5 {
		t.Fatalf("dominant frequency out of (0, 0.5]: %v", got.DominantFrequency)
	}
}

func TestCalculateTone_ResonancePowerNonNegative(t *testing.T) {
	cases := []string{
		"ابجد",
		"ابجدابجد",
		"بسم الله الرحمن الرحيم",
	}
	for _, in := range cases {
		got := CalculateTone(in)
		if got.ResonancePower < 0 || math.IsNaN(got.ResonancePower) || math.IsInf(got.ResonancePower, 0) {
			t.Errorf("resonancePower must be non-negative finite for %q: %v", in, got.ResonancePower)
		}
	}
}
