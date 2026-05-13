// بسم الله الرحمن الرحيم
// TwoNN intrinsic dimension estimator (Facco et al. 2017,
// "Estimating the intrinsic dimension of datasets by a minimal
// neighborhood information", Scientific Reports 7:12140).
//
// Why this lives next to CalculateLID instead of replacing it:
//
//   - The Levina-Bickel MLE estimator (CalculateLID) is sensitive to k.
//     Two callers running the same data with k=5 vs k=10 get different
//     LID values — that's a portability problem for a "USB stick"
//     manifest where the result must be reproducible by anyone with the
//     same input.
//   - TwoNN is parameter-free. For each query point we look at exactly
//     two neighbours: the nearest (r1) and the second-nearest (r2). The
//     ratio µ = r2/r1 has a known CDF F(µ) = 1 - µ^(-d), and the MLE
//     over a corpus of µᵢ is:
//
//         d = N / Σ log(µᵢ)
//
//   - The Less is More paper (arXiv 2506.01034) — the citation behind
//     the "lower LID = higher resonance" claim in the existing
//     CalculateLID docstring — actually uses TwoNN, not MLE-k. So
//     "agreeing with the paper" and "being reproducible by any verifier"
//     point at the same algorithm.
//
// The MLE-k estimator stays available via CalculateLID + NewLIDAnalyzer
// for any caller that depends on the old behaviour. The default in the
// batch pipeline becomes TwoNN; opting back into MLE is explicit via
// BatchAnalysisRequest.LIDMethod (#H7).

package engine

import (
	"math"
)

// CalculateTwoNN estimates the local intrinsic dimension of `query`
// against the reference cloud using the TwoNN method. The returned
// LIDResult.Method is "twonn".
//
// Unlike CalculateLID, this estimator requires at least 2 reference
// points (instead of k). On smaller corpora it returns LIDResult{} with
// LID = 0 and Method = "twonn-insufficient-corpus" so the caller can
// distinguish "couldn't compute" from "computed and got zero".
//
// Implementation note: for a single query point we need µ = r2/r1, i.e.
// the distances to the two nearest references. We do not need the
// classical TwoNN over an entire dataset (pairwise µᵢ across all
// points), because here the manifold question is "what is the local
// dimension AT this surah's embedding given the reference cloud", not
// "what is the global dimension of the cloud itself".
func CalculateTwoNN(query []float64, referenceEmbeddings [][]float64) LIDResult {
	if len(referenceEmbeddings) < 2 {
		return LIDResult{Method: "twonn-insufficient-corpus"}
	}

	// Distance from the query to every reference.
	distances := make([]float64, len(referenceEmbeddings))
	for i, ref := range referenceEmbeddings {
		distances[i] = euclideanDistance(query, ref)
	}

	// Find r1 (smallest) and r2 (second-smallest) in a single pass so we
	// don't pay an O(n log n) sort for two values.
	r1, r2 := math.MaxFloat64, math.MaxFloat64
	for _, d := range distances {
		if d < r1 {
			r2 = r1
			r1 = d
		} else if d < r2 {
			r2 = d
		}
	}

	// Guard against zero / equal distances. A query that exactly
	// coincides with a reference (r1 = 0) breaks the ratio; we treat it
	// as a degenerate case and return an unhelpful but well-defined
	// answer rather than NaN.
	if r1 <= 0 || r2 <= 0 || r2 == r1 {
		return LIDResult{
			LID:              1.0,
			Resonance:        1.0 / (1.0 + 1.0),
			NearestNeighbors: []float64{r1, r2},
			IsHighResonance:  true,
			Method:           "twonn-degenerate",
		}
	}

	mu := r2 / r1
	logMu := math.Log(mu)
	if logMu <= 0 {
		// r1 < r2 implies mu > 1 implies log(mu) > 0. If we land here,
		// floating-point underflow turned a tiny positive into zero;
		// clamp the LID to 1 (the lower bound a non-degenerate
		// manifold can take) rather than dividing by zero.
		return LIDResult{
			LID:              1.0,
			Resonance:        1.0 / 2.0,
			NearestNeighbors: []float64{r1, r2},
			IsHighResonance:  true,
			Method:           "twonn",
		}
	}

	// Single-point TwoNN: d = 1 / log(µ). For a single sample the
	// MLE collapses to the reciprocal of the log-ratio.
	lid := 1.0 / logMu
	if lid < 1.0 {
		lid = 1.0
	}

	// Complexity uses the same shape as the MLE estimator's so callers
	// that already key off Complexity see consistent semantics.
	complexity := r1 * r2
	resonance := 1.0 / (1.0 + lid)

	return LIDResult{
		LID:              lid,
		Resonance:        resonance,
		Complexity:       complexity,
		NearestNeighbors: []float64{r1, r2},
		IsHighResonance:  lid < 5.0,
		Method:           "twonn",
	}
}

// twoNNAdapter is the concrete adapter for CalculateTwoNN. Unexported,
// reached via NewTwoNNLIDAnalyzer().
type twoNNAdapter struct{}

// Analyze satisfies LIDAnalyzer. The k argument is accepted for
// interface compatibility but is intentionally ignored: TwoNN's whole
// point is being parameter-free.
func (twoNNAdapter) Analyze(query []float64, corpus [][]float64, _ int) LIDResult {
	return CalculateTwoNN(query, corpus)
}

// NewTwoNNLIDAnalyzer returns the parameter-free TwoNN LID estimator.
// Prefer this over NewLIDAnalyzer when manifest reproducibility matters,
// because the result is fully determined by (query, corpus) — no hidden
// k parameter.
func NewTwoNNLIDAnalyzer() LIDAnalyzer { return twoNNAdapter{} }
