// بسم الله الرحمن الرحيم
// Correctness tests for the corpus-opt-in LID path in ProcessBatchParallel.

package main

import (
	"strings"
	"testing"
)

// makeSurah returns a SurahData with a deterministic 4-D embedding so we
// don't depend on any external embedding model in tests.
func makeSurah(num int, embed []float64) SurahData {
	return SurahData{
		Number:    num,
		Name:      "test",
		Verses:    []string{"verse one", "verse two"},
		Embedding: embed,
	}
}

// makeCorpus returns `count` linearly-spaced reference embeddings. This
// is intentionally NOT the broken synthetic-noise pattern: each ref is
// a distinct point in 4-D, not a uniform offset from the query.
func makeCorpus(count int) [][]float64 {
	refs := make([][]float64, count)
	for i := range refs {
		f := float64(i + 1)
		refs[i] = []float64{f, -f, f * 0.5, -f * 0.5}
	}
	return refs
}

func TestProcessBatchParallel_LID_SkipsWhenCorpusMissing(t *testing.T) {
	req := BatchAnalysisRequest{
		Surahs:    []SurahData{makeSurah(1, []float64{0.1, 0.2, 0.3, 0.4})},
		EnableLID: true,
		// ReferenceCorpus deliberately empty
	}
	resp := ProcessBatchParallel(req)
	if len(resp.Results) != 1 {
		t.Fatalf("expected 1 result, got %d", len(resp.Results))
	}
	r := resp.Results[0]
	if r.LIDAnalysis != nil {
		t.Errorf("LIDAnalysis must be nil when corpus is missing, got %+v", r.LIDAnalysis)
	}
	if len(r.Warnings) == 0 {
		t.Fatal("expected a Warnings entry explaining the LID skip")
	}
	if !strings.Contains(r.Warnings[0], "LID skipped") {
		t.Errorf("warning message must explain the skip; got %q", r.Warnings[0])
	}
}

func TestProcessBatchParallel_LID_SkipsWhenCorpusTooSmall(t *testing.T) {
	req := BatchAnalysisRequest{
		Surahs:          []SurahData{makeSurah(1, []float64{0.1, 0.2, 0.3, 0.4})},
		EnableLID:       true,
		ReferenceCorpus: makeCorpus(MinLIDCorpusSize - 1), // 7 < 8
	}
	resp := ProcessBatchParallel(req)
	r := resp.Results[0]
	if r.LIDAnalysis != nil {
		t.Errorf("LIDAnalysis must be nil when corpus is under MinLIDCorpusSize")
	}
	if len(r.Warnings) == 0 || !strings.Contains(r.Warnings[0], "LID skipped") {
		t.Errorf("expected size-floor warning; got %v", r.Warnings)
	}
}

func TestProcessBatchParallel_LID_RunsWhenCorpusValid(t *testing.T) {
	req := BatchAnalysisRequest{
		Surahs:          []SurahData{makeSurah(1, []float64{0.5, -0.5, 0.25, -0.25})},
		EnableLID:       true,
		ReferenceCorpus: makeCorpus(MinLIDCorpusSize),
		MaxWorkers:      1,
	}
	resp := ProcessBatchParallel(req)
	r := resp.Results[0]
	if r.LIDAnalysis == nil {
		t.Fatalf("LIDAnalysis must be populated with a valid corpus; warnings=%v", r.Warnings)
	}
	if r.LIDAnalysis.LID < 1.0 {
		t.Errorf("MLE LID must be clamped to >= 1, got %v", r.LIDAnalysis.LID)
	}
	if len(r.LIDAnalysis.NearestNeighbors) != 7 {
		t.Errorf("default k=7 nearest neighbours, got %d", len(r.LIDAnalysis.NearestNeighbors))
	}
}

func TestProcessBatchParallel_LID_LIDDependsOnQuery(t *testing.T) {
	// Regression test for the deleted synthetic-noise bug: distinct queries
	// against the same corpus MUST produce distinct LID values (otherwise
	// LID is independent of the input — the exact failure mode the old code
	// had).
	corpus := makeCorpus(16)
	queryA := []float64{0.1, 0.2, 0.3, 0.4}
	queryB := []float64{5.0, -5.0, 5.0, -5.0}

	req := BatchAnalysisRequest{
		Surahs: []SurahData{
			makeSurah(1, queryA),
			makeSurah(2, queryB),
		},
		EnableLID:       true,
		ReferenceCorpus: corpus,
		MaxWorkers:      2,
	}
	resp := ProcessBatchParallel(req)
	if len(resp.Results) != 2 {
		t.Fatalf("expected 2 results, got %d", len(resp.Results))
	}

	// Locate each result by SurahNumber because parallel workers may reorder.
	var a, b *ParallelResult
	for i := range resp.Results {
		r := &resp.Results[i]
		if r.SurahNumber == 1 {
			a = r
		} else if r.SurahNumber == 2 {
			b = r
		}
	}
	if a == nil || b == nil || a.LIDAnalysis == nil || b.LIDAnalysis == nil {
		t.Fatalf("both surahs must have LID computed; a=%+v b=%+v", a, b)
	}
	if a.LIDAnalysis.LID == b.LIDAnalysis.LID && a.LIDAnalysis.Resonance == b.LIDAnalysis.Resonance {
		t.Errorf(
			"LID must depend on the query embedding. Got identical results for distinct queries: a=%v b=%v. "+
				"This is the synthetic-noise regression the corpus opt-in was added to prevent.",
			a.LIDAnalysis.LID, b.LIDAnalysis.LID,
		)
	}
}

func TestProcessBatchParallel_LIDDisabled_NoCorpusWarning(t *testing.T) {
	// When LID is not requested, we must not emit a noise warning about
	// a missing corpus.
	req := BatchAnalysisRequest{
		Surahs:    []SurahData{makeSurah(1, []float64{0.1, 0.2, 0.3, 0.4})},
		EnableLID: false,
	}
	resp := ProcessBatchParallel(req)
	r := resp.Results[0]
	for _, w := range r.Warnings {
		if strings.Contains(w, "LID skipped") {
			t.Errorf("must not emit LID warning when LID was not requested; got %q", w)
		}
	}
}
