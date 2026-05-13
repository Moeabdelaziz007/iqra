package engine

import (
	"math"
	"math/cmplx"

	"gonum.org/v1/gonum/dsp/fourier"
)

// AbjadMap defines the numerical value of Arabic letters
var AbjadMap = map[rune]int{
	'ا': 1, 'أ': 1, 'إ': 1, 'آ': 1, 'ى': 1, 'ء': 1,
	'ب': 2,
	'ج': 3,
	'د': 4,
	'ه': 5, 'ة': 5,
	'و': 6,
	'ز': 7,
	'ح': 8,
	'ط': 9,
	'ي': 10, 'ئ': 10,
	'ك': 20,
	'ل': 30,
	'م': 40,
	'ن': 50,
	'س': 60,
	'ع': 70,
	'ف': 80,
	'ص': 90,
	'ق': 100,
	'ر': 200,
	'ش': 300,
	'ت': 400,
	'ث': 500,
	'خ': 600,
	'ذ': 700,
	'ض': 800,
	'ظ': 900,
	'غ': 1000,
}

// ToneResult contains the frequency analysis of the text
type ToneResult struct {
	DominantFrequency float64   `json:"dominant_frequency"`
	ResonancePower    float64   `json:"resonance_power"`
	Spectrum          []float64 `json:"spectrum"`
}

// CalculateTone treats the text as a signal of Abjad values and finds the dominant frequency
func CalculateTone(text string) ToneResult {
	cleanText := removeArabicDiacritics(text)
	var signal []float64

	for _, r := range cleanText {
		if val, ok := AbjadMap[r]; ok {
			signal = append(signal, float64(val))
		}
	}

	if len(signal) < 2 {
		return ToneResult{}
	}

	// Real-valued FFT via gonum/dsp/fourier. Returns n/2+1 complex
	// coefficients, the same shape the previous O(n^2) DFT loop
	// produced, but in O(n log n) and using a battle-tested
	// FFTPACK-derived implementation. Spectrum semantics, ordering,
	// and the DC-bin convention are preserved.
	n := len(signal)
	fft := fourier.NewFFT(n)
	coeffs := fft.Coefficients(nil, signal)

	spectrum := make([]float64, len(coeffs))
	maxPower := 0.0
	domFreq := 0.0
	for k, c := range coeffs {
		power := cmplx.Abs(c)
		spectrum[k] = power
		// Ignore the DC component (k=0) when picking the dominant
		// frequency, exactly as the original DFT did.
		if k > 0 && power > maxPower {
			maxPower = power
			domFreq = float64(k) / float64(n)
		}
	}

	return ToneResult{
		DominantFrequency: domFreq,
		ResonancePower:    maxPower,
		Spectrum:          spectrum,
	}
}

// referenceDFT is the previous O(n^2) discrete Fourier transform implementation.
// Kept here as a slow but exact reference so tone_analyzer_test.go can pin the
// FFT output to it on small inputs and catch any future library swap that
// silently changes the spectrum shape. Not used in production.
func referenceDFT(signal []float64) []complex128 {
	n := len(signal)
	out := make([]complex128, n/2+1)
	for k := 0; k <= n/2; k++ {
		sum := complex(0, 0)
		for t := 0; t < n; t++ {
			angle := 2.0 * math.Pi * float64(k) * float64(t) / float64(n)
			sum += complex(signal[t], 0) * cmplx.Exp(complex(0, -angle))
		}
		out[k] = sum
	}
	return out
}
