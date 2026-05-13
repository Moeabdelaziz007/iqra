// بسم الله الرحمن الرحيم
// Correctness tests for detectQuranSignature's NaN-safety contract.

package engine

import (
	"math"
	"testing"
)

func TestDetectQuranSignature_RejectsZeroTotalH(t *testing.T) {
	// Single-character text path: totalEntropy = 0. The previous
	// implementation produced NaN via helH/totalH and silently
	// returned false; we now return false explicitly.
	if detectQuranSignature(0, 0, QuranFractalDimension) {
		t.Error("totalH=0 must short-circuit to false")
	}
}

func TestDetectQuranSignature_RejectsNegativeTotalH(t *testing.T) {
	if detectQuranSignature(-1.0, 0.5, QuranFractalDimension) {
		t.Error("negative totalH must short-circuit to false")
	}
}

func TestDetectQuranSignature_RejectsNaN(t *testing.T) {
	cases := []struct {
		name              string
		totalH, helH, frc float64
	}{
		{"NaN totalH", math.NaN(), 0.5, QuranFractalDimension},
		{"NaN helH", 1.0, math.NaN(), QuranFractalDimension},
		{"NaN fractal", 1.0, 0.5, math.NaN()},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if detectQuranSignature(tc.totalH, tc.helH, tc.frc) {
				t.Error("must reject any NaN input")
			}
		})
	}
}

func TestDetectQuranSignature_RejectsInf(t *testing.T) {
	if detectQuranSignature(math.Inf(1), 0.5, QuranFractalDimension) {
		t.Error("must reject +Inf totalH")
	}
	if detectQuranSignature(1.0, math.Inf(-1), QuranFractalDimension) {
		t.Error("must reject -Inf helH")
	}
}

func TestDetectQuranSignature_AcceptsWindowMatch(t *testing.T) {
	// totalH=1.0, helH=0.75 → ratio=0.75 (inside 0.6..0.9)
	// fractal=1.44 → exactly at centre
	if !detectQuranSignature(1.0, 0.75, QuranFractalDimension) {
		t.Error("clean in-window input must be accepted")
	}
}

func TestDetectQuranSignature_RejectsOutOfWindowRatio(t *testing.T) {
	// ratio = 0.95 → above QuranHELRatioHigh (0.9)
	if detectQuranSignature(1.0, 0.95, QuranFractalDimension) {
		t.Error("ratio above high bound must be rejected")
	}
	// ratio = 0.5 → below QuranHELRatioLow (0.6)
	if detectQuranSignature(1.0, 0.5, QuranFractalDimension) {
		t.Error("ratio below low bound must be rejected")
	}
}

func TestDetectQuranSignature_RejectsOutOfWindowFractal(t *testing.T) {
	// 1.44 + 0.16 > tolerance 0.15
	if detectQuranSignature(1.0, 0.75, 1.6) {
		t.Error("fractal outside tolerance must be rejected")
	}
}

func TestQuranicConstants_AreSensible(t *testing.T) {
	// Sanity asserts so a future contributor can't accidentally swap the
	// low/high bounds or push the tolerance to nonsense.
	if QuranHELRatioLow >= QuranHELRatioHigh {
		t.Errorf("ratio bounds inverted: low=%v high=%v", QuranHELRatioLow, QuranHELRatioHigh)
	}
	if PinkNoiseLow >= PinkNoiseHigh {
		t.Errorf("pink-noise bounds inverted: low=%v high=%v", PinkNoiseLow, PinkNoiseHigh)
	}
	if QuranFractalTolerance <= 0 || QuranFractalTolerance >= 1 {
		t.Errorf("fractal tolerance out of (0,1): %v", QuranFractalTolerance)
	}
	if QuranFractalToleranceLoose < QuranFractalTolerance {
		t.Errorf("loose tolerance must be >= strict tolerance; strict=%v loose=%v",
			QuranFractalTolerance, QuranFractalToleranceLoose)
	}
	if HighResonanceThreshold <= 0 || HighResonanceThreshold >= 1 {
		t.Errorf("high-resonance threshold out of (0,1): %v", HighResonanceThreshold)
	}
}
