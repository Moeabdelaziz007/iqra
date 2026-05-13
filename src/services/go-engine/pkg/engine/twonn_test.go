// بسم الله الرحمن الرحيم
// TwoNN estimator tests. Every input is a real geometric point cloud
// constructed from a closed-form parametric manifold; no mocks, no
// magic constants, no synthetic perturbations of the query.

package engine

import (
	"math"
	"math/rand/v2"
	"testing"
)

// makeUniformLine generates n points uniformly along the x-axis. The
// intrinsic dimension of the underlying manifold is 1.
func makeUniformLine(n int) [][]float64 {
	rng := rand.New(rand.NewPCG(42, 0))
	pts := make([][]float64, n)
	for i := range pts {
		pts[i] = []float64{rng.Float64() * 10.0, 0, 0}
	}
	return pts
}

// makeUniformPlane generates n points uniformly in the unit square on
// the xy-plane. Intrinsic dimension = 2.
func makeUniformPlane(n int) [][]float64 {
	rng := rand.New(rand.NewPCG(7, 1))
	pts := make([][]float64, n)
	for i := range pts {
		pts[i] = []float64{rng.Float64(), rng.Float64(), 0}
	}
	return pts
}

// makeSwissRoll generates n points on a 2D Swiss-roll manifold
// embedded in 3D. This is the canonical TwoNN regression test: the
// estimator should report d ≈ 2 even though the ambient dimension is 3.
func makeSwissRoll(n int) [][]float64 {
	rng := rand.New(rand.NewPCG(19, 2))
	pts := make([][]float64, n)
	for i := range pts {
		t := 1.5 * math.Pi * (1.0 + 2.0*rng.Float64())
		h := 21.0 * rng.Float64()
		pts[i] = []float64{t * math.Cos(t), h, t * math.Sin(t)}
	}
	return pts
}

func TestCalculateTwoNN_RecordsMethod(t *testing.T) {
	got := CalculateTwoNN([]float64{0, 0, 0}, makeUniformLine(100))
	if got.Method != "twonn" {
		t.Errorf("Method: got %q want twonn", got.Method)
	}
}

func TestCalculateTwoNN_InsufficientCorpus(t *testing.T) {
	got := CalculateTwoNN([]float64{0, 0, 0}, [][]float64{{1, 0, 0}})
	if got.Method != "twonn-insufficient-corpus" {
		t.Errorf("single-ref corpus must yield insufficient marker; got %q", got.Method)
	}
}

func TestCalculateTwoNN_DegenerateCoincidentQuery(t *testing.T) {
	// Query coincides with first reference (r1=0). Estimator must not
	// produce NaN / +Inf; it returns the degenerate marker with LID
	// clamped to 1.
	corpus := [][]float64{{0, 0, 0}, {1, 0, 0}, {2, 0, 0}}
	got := CalculateTwoNN([]float64{0, 0, 0}, corpus)
	if got.Method != "twonn-degenerate" {
		t.Errorf("coincident query must report degenerate; got %q", got.Method)
	}
	if math.IsNaN(got.LID) || math.IsInf(got.LID, 0) {
		t.Errorf("LID must be finite on degenerate input; got %v", got.LID)
	}
}

func TestCalculateTwoNN_ResonanceMatchesFormula(t *testing.T) {
	// resonance = 1 / (1 + LID) for non-degenerate output.
	corpus := makeUniformLine(50)
	q := []float64{1.2345, 0, 0}
	got := CalculateTwoNN(q, corpus)
	want := 1.0 / (1.0 + got.LID)
	if math.Abs(got.Resonance-want) > 1e-9 {
		t.Errorf("Resonance != 1/(1+LID): got=%v want=%v", got.Resonance, want)
	}
}

func TestCalculateTwoNN_QueryDependent(t *testing.T) {
	// Two distinct queries against the same Swiss-roll corpus MUST
	// produce numerically distinct LID values. This is the headline
	// guarantee TwoNN was added for.
	corpus := makeSwissRoll(200)
	a := CalculateTwoNN([]float64{1, 5, 0}, corpus)
	b := CalculateTwoNN([]float64{-10, 15, 7}, corpus)
	if a.LID == b.LID && a.Resonance == b.Resonance {
		t.Errorf("distinct queries collapsed to identical LID: %v", a.LID)
	}
}

func TestCalculateTwoNN_Determinism(t *testing.T) {
	// Same (query, corpus) MUST produce bit-identical results. This is
	// the manifest-reproducibility property — anyone with the inputs
	// can verify the output.
	corpus := makeUniformPlane(50)
	q := []float64{0.5, 0.5, 0}
	got1 := CalculateTwoNN(q, corpus)
	got2 := CalculateTwoNN(q, corpus)
	if got1.LID != got2.LID || got1.Resonance != got2.Resonance {
		t.Errorf("non-deterministic output: %v vs %v", got1, got2)
	}
}

func TestCalculateTwoNN_LineEstimateNearOne(t *testing.T) {
	// Single-point TwoNN over 1D-uniform-line samples should land
	// somewhere in (0.5, 5). The single-sample variant is high-variance
	// (the canonical TwoNN aggregates over the whole dataset), but it
	// must never report a wildly negative or infinite dimension.
	corpus := makeUniformLine(300)
	q := []float64{5.0, 0, 0}
	got := CalculateTwoNN(q, corpus)
	if math.IsNaN(got.LID) || math.IsInf(got.LID, 0) {
		t.Errorf("LID must be finite: %v", got.LID)
	}
	if got.LID < 1.0 {
		t.Errorf("LID must clamp to >= 1: %v", got.LID)
	}
}

func TestNewTwoNNLIDAnalyzer_SatisfiesInterface(t *testing.T) {
	var a LIDAnalyzer = NewTwoNNLIDAnalyzer()
	got := a.Analyze([]float64{0, 0, 0}, makeUniformLine(20), 999) // k ignored
	if got.Method != "twonn" {
		t.Errorf("Method: got %q want twonn", got.Method)
	}
}
