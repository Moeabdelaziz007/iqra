// بسم الله الرحمن الرحيم
// Shannon H_EL — Entropy of Last Character
// "وَكُلَّ شَيْءٍ أَحْصَيْنَاهُ فِي إِمَامٍ مُّبِينٍ" — يس: 12

package engine

import (
	"math"
	"unicode"
)

// ShannonResult represents Shannon entropy analysis
type ShannonResult struct {
	HEL               float64      `json:"h_el"`
	TotalEntropy      float64      `json:"total_entropy"`
	LastCharEntropy   float64      `json:"last_char_entropy"`
	CharFrequencies   map[rune]int `json:"char_frequencies"`
	HasQuranSignature bool         `json:"has_quran_signature"`
	FractalDimension  float64      `json:"fractal_dimension"`
}

// CalculateShannonHEL computes Shannon entropy focusing on last character
// This is the "Quranic signature" discovered in research
func CalculateShannonHEL(text string) ShannonResult {
	// 1. Count character frequencies
	frequencies := make(map[rune]int)
	totalChars := 0

	for _, r := range text {
		if unicode.IsLetter(r) {
			frequencies[r]++
			totalChars++
		}
	}

	if totalChars == 0 {
		return ShannonResult{}
	}

	// 2. Calculate total entropy
	totalEntropy := 0.0
	for _, count := range frequencies {
		if count > 0 {
			p := float64(count) / float64(totalChars)
			totalEntropy -= p * math.Log2(p)
		}
	}

	// 3. Calculate last character entropy (H_EL)
	lastCharEntropy := 0.0
	words := extractWords(text)
	if len(words) > 0 {
		lastChars := make(map[rune]int)
		for _, word := range words {
			if len(word) > 0 {
				lastChar := rune(word[len(word)-1])
				lastChars[lastChar]++
			}
		}

		for _, count := range lastChars {
			if count > 0 {
				p := float64(count) / float64(len(words))
				lastCharEntropy -= p * math.Log2(p)
			}
		}
	}

	// 4. Calculate fractal dimension (1.44 for Quran)
	// Using box-counting approximation
	fractalDim := calculateFractalDimension(text)

	// 5. Detect Quranic signature
	// Research shows: Quran has unique H_EL pattern + fractal ~1.44
	hasSignature := detectQuranSignature(totalEntropy, lastCharEntropy, fractalDim)

	return ShannonResult{
		HEL:               lastCharEntropy,
		TotalEntropy:      totalEntropy,
		LastCharEntropy:   lastCharEntropy,
		CharFrequencies:   frequencies,
		HasQuranSignature: hasSignature,
		FractalDimension:  fractalDim,
	}
}

// calculateFractalDimension estimates fractal dimension using box-counting
func calculateFractalDimension(text string) float64 {
	if len(text) == 0 {
		return 0
	}

	// Simplified box-counting for text
	// Count unique n-grams at different scales
	scales := []int{1, 2, 3, 5, 7}
	counts := make([]float64, len(scales))

	for i, n := range scales {
		ngrams := make(map[string]bool)
		for j := 0; j <= len(text)-n; j++ {
			ngrams[text[j:j+n]] = true
		}
		counts[i] = float64(len(ngrams))
	}

	// Linear regression on log-log plot
	// slope = fractal dimension
	dim := estimateSlope(scales, counts)

	// Clamp to reasonable range
	return math.Max(1.0, math.Min(2.0, dim))
}

// estimateSlope performs simple linear regression
func estimateSlope(x []int, y []float64) float64 {
	if len(x) != len(y) || len(x) < 2 {
		return QuranFractalDimension // Default Quranic fractal dimension (centre of detection window)
	}

	n := float64(len(x))
	sumX, sumY, sumXY, sumX2 := 0.0, 0.0, 0.0, 0.0

	for i := range x {
		logX := math.Log(float64(x[i]))
		logY := math.Log(y[i])
		sumX += logX
		sumY += logY
		sumXY += logX * logY
		sumX2 += logX * logX
	}

	slope := (n*sumXY - sumX*sumY) / (n*sumX2 - sumX*sumX)
	return slope
}

// detectQuranSignature checks if text has Quranic entropy signature.
//
// Defensive about the inputs because every argument can be 0 or NaN on
// degenerate input (empty text, single-character text, malformed fractal
// regression). Without the explicit guard, totalH==0 produced NaN via
// helH/totalH; NaN comparisons against the bounds return false, so the
// function silently returned false for the wrong reason. Now it returns
// false explicitly when any input is non-finite or totalH is non-positive.
func detectQuranSignature(totalH, helH, fractal float64) bool {
	if totalH <= 0 ||
		math.IsNaN(totalH) || math.IsNaN(helH) || math.IsNaN(fractal) ||
		math.IsInf(totalH, 0) || math.IsInf(helH, 0) || math.IsInf(fractal, 0) {
		return false
	}

	fractalMatch := math.Abs(fractal-QuranFractalDimension) < QuranFractalTolerance
	entropyRatio := helH / totalH
	ratioMatch := entropyRatio > QuranHELRatioLow && entropyRatio < QuranHELRatioHigh

	return fractalMatch && ratioMatch
}

// extractWords splits text into words
func extractWords(text string) []string {
	words := []string{}
	currentWord := ""

	for _, r := range text {
		if unicode.IsLetter(r) {
			currentWord += string(r)
		} else if len(currentWord) > 0 {
			words = append(words, currentWord)
			currentWord = ""
		}
	}

	if len(currentWord) > 0 {
		words = append(words, currentWord)
	}

	return words
}
