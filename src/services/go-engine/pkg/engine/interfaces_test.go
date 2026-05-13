// بسم الله الرحمن الرحيم
// Interface conformance tests. These exist for two reasons:
//   1. They lock in the contract so a future refactor can't silently
//      narrow a return type or rename a method.
//   2. They serve as the integration point for #H6: when the TwoNN
//      LIDAnalyzer lands, the same tests will exercise it transparently
//      via the LIDAnalyzer interface variable.

package engine

import (
	"context"
	"testing"
)

func TestLIDAnalyzer_MLEImplementsInterface(t *testing.T) {
	var a LIDAnalyzer = NewLIDAnalyzer()
	query := []float64{0.1, 0.2, 0.3, 0.4}
	corpus := [][]float64{
		{1, 0, 0, 0}, {2, 0, 0, 0}, {3, 0, 0, 0}, {4, 0, 0, 0},
		{5, 0, 0, 0}, {6, 0, 0, 0}, {7, 0, 0, 0}, {8, 0, 0, 0},
	}
	got := a.Analyze(query, corpus, 7)
	if got.LID < 1.0 {
		t.Errorf("MLE LID must be >= 1, got %v", got.LID)
	}
}

func TestEntropyAnalyzer_ShannonImplementsInterface(t *testing.T) {
	var a EntropyAnalyzer = NewShannonEntropyAnalyzer()
	got := a.Analyze("hello world")
	if got.TotalEntropy <= 0 {
		t.Errorf("non-trivial text must have positive entropy, got %v", got.TotalEntropy)
	}
}

func TestToneAnalyzer_ImplementsInterface(t *testing.T) {
	var a ToneAnalyzer = NewToneAnalyzer()
	// Empty Arabic-letter signal yields a zero ToneResult by contract.
	got := a.Analyze("")
	if got.ResonancePower != 0 {
		t.Errorf("empty input must yield zero ToneResult, got %+v", got)
	}
}

func TestCompressionAnalyzer_TurboQuantImplementsInterface(t *testing.T) {
	var a CompressionAnalyzer = NewTurboQuantCompressor()
	got := a.Compress([]float64{0, 0.5, 1, 0.5, 0}, 8)
	if len(got.Compressed) != 5 {
		t.Errorf("compressed length: got %d want 5", len(got.Compressed))
	}
}

func TestBatchProcessor_ImplementsInterface(t *testing.T) {
	var p BatchProcessor = NewBatchProcessor()
	resp := p.Process(context.Background(), BatchAnalysisRequest{
		Surahs:        []SurahData{{Number: 1, Verses: []string{"x"}}},
		EnableShannon: true,
		MaxWorkers:    1,
	})
	if resp.ProcessedSurahs != 1 {
		t.Errorf("ProcessedSurahs: got %d want 1", resp.ProcessedSurahs)
	}
}
