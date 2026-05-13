// بسم الله الرحمن الرحيم
// LID Analyzer — Local Intrinsic Dimension
// "Less is More" — NeurIPS 2025
// انخفاض LID = تحسن الأداء = رنين أعلى

package engine

import (
	"math"
	"sort"
)

// LIDResult represents Local Intrinsic Dimension analysis
type LIDResult struct {
	LID              float64   `json:"lid"`
	Resonance        float64   `json:"resonance"`
	Complexity       float64   `json:"complexity"`
	NearestNeighbors []float64 `json:"nearest_neighbors"`
	IsHighResonance  bool      `json:"is_high_resonance"`
}

// CalculateLID computes Local Intrinsic Dimension using k-NN distances
// Lower LID = Higher Resonance (NeurIPS 2025 finding)
func CalculateLID(embedding []float64, referenceEmbeddings [][]float64, k int) LIDResult {
	if k <= 0 {
		k = 7 // Default: 7 neighbors (sacred number)
	}

	// 1. Calculate distances to all reference embeddings
	distances := make([]float64, len(referenceEmbeddings))
	for i, ref := range referenceEmbeddings {
		distances[i] = euclideanDistance(embedding, ref)
	}

	// 2. Sort and get k nearest neighbors
	sort.Float64s(distances)
	kNearest := distances[:min(k, len(distances))]

	// 3. Calculate LID using Maximum Likelihood Estimation (MLE)
	lid := calculateLIDMLE(kNearest)

	// 4. Calculate resonance (inverse relationship with LID)
	// Lower LID → Higher Resonance
	resonance := 1.0 / (1.0 + lid)

	// 5. Complexity measure (variance of distances)
	complexity := variance(kNearest)

	return LIDResult{
		LID:              lid,
		Resonance:        resonance,
		Complexity:       complexity,
		NearestNeighbors: kNearest,
		IsHighResonance:  resonance > 0.7, // Threshold from research
	}
}

// calculateLIDMLE uses Maximum Likelihood Estimation for LID
// Formula: LID = -k / Σ(log(r_i / r_k))
func calculateLIDMLE(distances []float64) float64 {
	k := len(distances)
	if k < 2 {
		return 1.0
	}

	rk := distances[k-1] // Furthest neighbor
	if rk == 0 {
		return 1.0
	}

	sumLog := 0.0
	for i := 0; i < k-1; i++ {
		if distances[i] > 0 {
			sumLog += math.Log(distances[i] / rk)
		}
	}

	if sumLog == 0 {
		return 1.0
	}

	lid := -float64(k-1) / sumLog
	return math.Max(1.0, lid) // LID >= 1
}

// euclideanDistance calculates Euclidean distance between two vectors
func euclideanDistance(a, b []float64) float64 {
	if len(a) != len(b) {
		return math.MaxFloat64
	}

	sum := 0.0
	for i := range a {
		diff := a[i] - b[i]
		sum += diff * diff
	}
	return math.Sqrt(sum)
}

// variance calculates variance of a slice
func variance(data []float64) float64 {
	if len(data) == 0 {
		return 0
	}

	mean := 0.0
	for _, v := range data {
		mean += v
	}
	mean /= float64(len(data))

	variance := 0.0
	for _, v := range data {
		diff := v - mean
		variance += diff * diff
	}
	return variance / float64(len(data))
}
