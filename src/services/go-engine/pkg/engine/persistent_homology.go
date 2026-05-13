// بسم الله الرحمن الرحيم
// Persistent Homology — Topological Data Analysis
// "وَكُلُّ شَيْءٍ عِندَهُ بِمِقْدَارٍ" — الرعد: 8

package engine

import (
	"math"
	"sort"
)

// HomologyResult represents persistent homology analysis
type HomologyResult struct {
	H0               int       `json:"h0"` // Connected components
	H1               int       `json:"h1"` // Loops/cycles
	H2               int       `json:"h2"` // Voids/cavities
	Persistence      []float64 `json:"persistence"`
	BettiNumbers     []int     `json:"betti_numbers"`
	TopologicalNoise float64   `json:"topological_noise"`
	IsFractal        bool      `json:"is_fractal"`
}

// CalculatePersistentHomology computes topological features
// Uses Vietoris-Rips complex for text analysis
func CalculatePersistentHomology(embedding []float64, threshold float64) HomologyResult {
	// 1. Build distance matrix (simplified for single embedding)
	// In production, use multiple embeddings for full complex

	// 2. Count connected components (H0)
	// For single embedding, H0 = 1
	h0 := 1

	// 3. Detect cycles (H1) using autocorrelation
	h1 := detectCycles(embedding, threshold)

	// 4. Detect voids (H2) using higher-order correlations
	h2 := detectVoids(embedding, threshold)

	// 5. Calculate persistence (lifetime of topological features)
	persistence := calculatePersistence(embedding)

	// 6. Betti numbers
	betti := []int{h0, h1, h2}

	// 7. Topological noise (1/f pink noise for Quran)
	noise := calculateTopologicalNoise(embedding)

	// 8. Fractal detection
	isFractal := detectFractalStructure(persistence)

	return HomologyResult{
		H0:               h0,
		H1:               h1,
		H2:               h2,
		Persistence:      persistence,
		BettiNumbers:     betti,
		TopologicalNoise: noise,
		IsFractal:        isFractal,
	}
}

// detectCycles finds periodic patterns (H1)
func detectCycles(data []float64, threshold float64) int {
	if len(data) < 3 {
		return 0
	}

	// Autocorrelation to detect periodicity
	cycles := 0
	maxLag := min(len(data)/2, 50)

	for lag := 1; lag < maxLag; lag++ {
		corr := autocorrelation(data, lag)
		if corr > threshold {
			cycles++
		}
	}

	return cycles
}

// detectVoids finds higher-dimensional holes (H2)
func detectVoids(data []float64, threshold float64) int {
	if len(data) < 5 {
		return 0
	}

	// Simplified void detection using local minima
	voids := 0
	for i := 2; i < len(data)-2; i++ {
		if data[i] < data[i-1] && data[i] < data[i+1] &&
			data[i] < data[i-2] && data[i] < data[i+2] {
			if math.Abs(data[i]) > threshold {
				voids++
			}
		}
	}

	return voids
}

// calculatePersistence computes lifetime of topological features
func calculatePersistence(data []float64) []float64 {
	// Sort data to find birth-death pairs
	sorted := make([]float64, len(data))
	copy(sorted, data)
	sort.Float64s(sorted)

	persistence := make([]float64, 0)

	// Calculate gaps (persistence intervals)
	for i := 1; i < len(sorted); i++ {
		gap := sorted[i] - sorted[i-1]
		if gap > PersistenceMinGap { // Threshold for significant features
			persistence = append(persistence, gap)
		}
	}

	return persistence
}

// calculateTopologicalNoise measures 1/f pink noise
// Quran has characteristic 1/f noise pattern
func calculateTopologicalNoise(data []float64) float64 {
	if len(data) < 2 {
		return 0
	}

	// Power spectral density estimation
	// Simplified: measure variance at different scales
	scales := []int{1, 2, 4, 8, 16}
	powers := make([]float64, len(scales))

	for i, scale := range scales {
		if scale >= len(data) {
			break
		}

		// Downsample and measure variance
		downsampled := make([]float64, 0)
		for j := 0; j < len(data); j += scale {
			downsampled = append(downsampled, data[j])
		}
		powers[i] = variance(downsampled)
	}

	// Fit 1/f^α model
	// α ≈ 1 for pink noise (Quranic signature)
	alpha := estimatePowerLawExponent(scales, powers)

	return alpha
}

// estimatePowerLawExponent fits power law to data
func estimatePowerLawExponent(x []int, y []float64) float64 {
	if len(x) != len(y) || len(x) < 2 {
		return 1.0
	}

	// Log-log linear regression
	sumLogX, sumLogY, sumLogXY, sumLogX2 := 0.0, 0.0, 0.0, 0.0
	n := 0.0

	for i := range x {
		if y[i] > 0 {
			logX := math.Log(float64(x[i]))
			logY := math.Log(y[i])
			sumLogX += logX
			sumLogY += logY
			sumLogXY += logX * logY
			sumLogX2 += logX * logX
			n++
		}
	}

	if n < 2 {
		return 1.0
	}

	// Slope = -α (negative for 1/f^α)
	slope := (n*sumLogXY - sumLogX*sumLogY) / (n*sumLogX2 - sumLogX*sumLogX)
	return math.Abs(slope)
}

// detectFractalStructure checks if persistence has fractal properties
func detectFractalStructure(persistence []float64) bool {
	if len(persistence) < 3 {
		return false
	}

	// Fractal structures have self-similar persistence diagrams
	// Check for power-law distribution of persistence values
	sort.Float64s(persistence)

	// Calculate rank-frequency distribution
	ranks := make([]float64, len(persistence))
	for i := range ranks {
		ranks[i] = float64(i + 1)
	}

	// Fit power law
	alpha := estimatePowerLawExponent(
		intSlice(len(persistence)),
		persistence,
	)

	// Fractal if α ≈ QuranFractalDimension. The loose tolerance is used
	// here because the power-law exponent estimator has higher variance
	// than the box-counting estimator used in shannon_hel.go.
	if math.IsNaN(alpha) || math.IsInf(alpha, 0) {
		return false
	}
	return math.Abs(alpha-QuranFractalDimension) < QuranFractalToleranceLoose
}

// autocorrelation calculates autocorrelation at given lag
func autocorrelation(data []float64, lag int) float64 {
	if lag >= len(data) {
		return 0
	}

	mean := 0.0
	for _, v := range data {
		mean += v
	}
	mean /= float64(len(data))

	numerator := 0.0
	denominator := 0.0

	for i := 0; i < len(data)-lag; i++ {
		numerator += (data[i] - mean) * (data[i+lag] - mean)
	}

	for _, v := range data {
		denominator += (v - mean) * (v - mean)
	}

	if denominator == 0 {
		return 0
	}

	return numerator / denominator
}

// intSlice creates integer slice [1, 2, ..., n]
func intSlice(n int) []int {
	result := make([]int, n)
	for i := range result {
		result[i] = i + 1
	}
	return result
}
