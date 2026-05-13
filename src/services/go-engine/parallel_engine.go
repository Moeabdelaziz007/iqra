// بسم الله الرحمن الرحيم
// Parallel Resonance Engine — محرك الرنين المتوازي
// "وَإِن مِّن شَيْءٍ إِلَّا يُسَبِّحُ بِحَمْدِهِ" — الإسراء: 44

package main

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"runtime"
	"sync"
	"time"
)

// ParallelResult represents result from parallel processing
type ParallelResult struct {
	SurahNumber      int             `json:"surah_number"`
	TotalVerses      int             `json:"total_verses"`
	ProcessingTimeMs int64           `json:"processing_time_ms"`
	LIDAnalysis      *LIDResult      `json:"lid_analysis,omitempty"`
	ShannonAnalysis  *ShannonResult  `json:"shannon_analysis,omitempty"`
	HomologyAnalysis *HomologyResult `json:"homology_analysis,omitempty"`
	CompressionRatio float64         `json:"compression_ratio"`
	OverallResonance float64         `json:"overall_resonance"`
	Discoveries      []string        `json:"discoveries"`
	Warnings         []string        `json:"warnings,omitempty"`
	Error            string          `json:"error,omitempty"`
}

// BatchAnalysisRequest represents batch processing request.
//
// LID note: when EnableLID=true, the caller MUST supply ReferenceCorpus
// containing >= MinLIDCorpusSize real embeddings from the SAME model that
// produced SurahData.Embedding. The previous implementation generated
// reference embeddings synthetically by adding a uniform offset to the
// query (`base + (i/count)*0.1*1⃗`), which placed all references on the
// same ray and made the MLE estimator's r_i/r_k ratios constant — meaning
// the returned LID was a function of i and k only, INDEPENDENT of the
// query. That entire code path is removed; callers must now provide a
// real reference corpus or accept that LID is skipped.
type BatchAnalysisRequest struct {
	Surahs            []SurahData `json:"surahs"`
	EnableLID         bool        `json:"enable_lid"`
	EnableShannon     bool        `json:"enable_shannon"`
	EnableHomology    bool        `json:"enable_homology"`
	EnableCompression bool        `json:"enable_compression"`
	MaxWorkers        int         `json:"max_workers"`
	// ReferenceCorpus is the set of real embeddings used as the k-NN
	// reference cloud for every surah's LID analysis in this batch. All
	// embeddings (queries and references) MUST share the same dimensionality
	// and originate from the same embedding model.
	ReferenceCorpus [][]float64 `json:"reference_corpus,omitempty"`
}

// SurahData represents a single surah for processing
type SurahData struct {
	Number    int       `json:"number"`
	Name      string    `json:"name"`
	Verses    []string  `json:"verses"`
	Embedding []float64 `json:"embedding,omitempty"`
}

// BatchAnalysisResponse represents batch processing response
type BatchAnalysisResponse struct {
	TotalSurahs     int              `json:"total_surahs"`
	ProcessedSurahs int              `json:"processed_surahs"`
	TotalTimeMs     int64            `json:"total_time_ms"`
	Results         []ParallelResult `json:"results"`
	Summary         AnalysisSummary  `json:"summary"`
}

// AnalysisSummary provides aggregate statistics
type AnalysisSummary struct {
	AverageResonance     float64 `json:"average_resonance"`
	HighResonanceSurahs  []int   `json:"high_resonance_surahs"`
	TotalDiscoveries     int     `json:"total_discoveries"`
	FractalSurahs        []int   `json:"fractal_surahs"`
	QuranSignatureSurahs []int   `json:"quran_signature_surahs"`
}

// ProcessBatchParallel is the legacy entry point that runs a batch with
// context.Background. New callers should prefer ProcessBatchParallelContext
// so cancellation propagates from the HTTP request or process-level signal
// context. Kept for source-level backward compatibility with any existing
// non-HTTP caller (CLI mode, tests).
func ProcessBatchParallel(req BatchAnalysisRequest) BatchAnalysisResponse {
	return ProcessBatchParallelContext(context.Background(), req)
}

// ProcessBatchParallelContext runs the batch under a caller-supplied
// context. When ctx is cancelled mid-run (e.g. SIGTERM observed at the
// process root), the function:
//
//  1. stops dispatching new surahs to workers,
//  2. waits for in-flight workers to finish their current surah,
//  3. writes a checkpoint to disk with the completed + pending split, so
//     a subsequent process can replay the pending surahs via
//     --resume-from=<path>.
//
// The returned BatchAnalysisResponse reflects whatever the workers
// managed to complete before cancellation; the checkpoint path is
// surfaced to the operator via stderr so an automation layer can pick
// it up. The previous process-wide runtime.GOMAXPROCS(maxWorkers) tweak
// is intentionally NOT carried over here — it was a misuse of a global
// knob that applied to the entire Go runtime regardless of which batch
// requested it. The worker-pool size alone is the correct lever for
// batch-level parallelism.
func ProcessBatchParallelContext(ctx context.Context, req BatchAnalysisRequest) BatchAnalysisResponse {
	startTime := time.Now()

	maxWorkers := req.MaxWorkers
	if maxWorkers <= 0 {
		maxWorkers = runtime.NumCPU()
	}

	jobs := make(chan SurahData, len(req.Surahs))
	results := make(chan ParallelResult, len(req.Surahs))

	// completedIDs records surah numbers as soon as a worker emits a
	// result. We read it during checkpoint construction to figure out
	// which surahs still need to run on resume.
	var (
		completedIDsMu sync.Mutex
		completedIDs   = make(map[int]bool, len(req.Surahs))
	)

	var wg sync.WaitGroup
	for w := 0; w < maxWorkers; w++ {
		wg.Add(1)
		go workerCtx(ctx, w, jobs, results, &req, &wg, &completedIDsMu, completedIDs)
	}

	// Dispatcher: feeds the worker pool. Aborts dispatching if ctx
	// cancels so we don't queue surahs that will only be dropped.
	go func() {
		defer close(jobs)
		for _, surah := range req.Surahs {
			select {
			case jobs <- surah:
			case <-ctx.Done():
				return
			}
		}
	}()

	go func() {
		wg.Wait()
		close(results)
	}()

	allResults := make([]ParallelResult, 0, len(req.Surahs))
	for result := range results {
		allResults = append(allResults, result)
	}

	// If we exited because of cancellation, persist a checkpoint with
	// every surah that didn't get processed.
	if ctx.Err() != nil {
		completedIDsMu.Lock()
		pending := make([]SurahData, 0)
		completed := make([]int, 0, len(completedIDs))
		for _, s := range req.Surahs {
			if completedIDs[s.Number] {
				completed = append(completed, s.Number)
			} else {
				pending = append(pending, s)
			}
		}
		completedIDsMu.Unlock()

		if len(pending) > 0 {
			cp := AgentCheckpoint{
				Request:         req,
				CompletedSurahs: completed,
				PendingSurahs:   pending,
				PartialResults:  allResults,
				Reason:          fmt.Sprintf("context cancelled: %v", ctx.Err()),
			}
			if path, err := WriteCheckpoint(cp); err == nil {
				fmt.Fprintf(os.Stderr, "agent-checkpoint written: %s\n", path)
			} else {
				fmt.Fprintf(os.Stderr, "agent-checkpoint write failed: %v\n", err)
			}
		}
	}

	summary := calculateSummary(allResults)
	totalTime := time.Since(startTime).Milliseconds()

	return BatchAnalysisResponse{
		TotalSurahs:     len(req.Surahs),
		ProcessedSurahs: len(allResults),
		TotalTimeMs:     totalTime,
		Results:         allResults,
		Summary:         summary,
	}
}

// workerCtx is the context-aware worker. Each iteration is preceded by a
// non-blocking select on ctx.Done() so a worker that has already drained
// its current surah does not pick up a new one after cancellation.
func workerCtx(
	ctx context.Context,
	id int,
	jobs <-chan SurahData,
	results chan<- ParallelResult,
	req *BatchAnalysisRequest,
	wg *sync.WaitGroup,
	completedMu *sync.Mutex,
	completed map[int]bool,
) {
	defer wg.Done()
	for {
		select {
		case <-ctx.Done():
			return
		case surah, ok := <-jobs:
			if !ok {
				return
			}
			result := processSurah(surah, req)
			results <- result
			completedMu.Lock()
			completed[surah.Number] = true
			completedMu.Unlock()
		}
	}
}

// processSurah analyzes a single surah
func processSurah(surah SurahData, req *BatchAnalysisRequest) ParallelResult {
	startTime := time.Now()

	result := ParallelResult{
		SurahNumber: surah.Number,
		TotalVerses: len(surah.Verses),
		Discoveries: make([]string, 0),
	}

	// Combine all verses into one text
	fullText := ""
	for _, verse := range surah.Verses {
		fullText += verse + " "
	}

	// 1. Shannon H_EL Analysis
	if req.EnableShannon {
		shannon := CalculateShannonHEL(fullText)
		result.ShannonAnalysis = &shannon

		if shannon.HasQuranSignature {
			result.Discoveries = append(result.Discoveries, "QURAN_SIGNATURE")
		}

		if shannon.FractalDimension > 1.35 && shannon.FractalDimension < 1.55 {
			result.Discoveries = append(result.Discoveries, "FRACTAL_1.44")
		}
	}

	// 2. LID Analysis (if embedding + real reference corpus provided).
	// We refuse to run LID against a synthetic corpus because the MLE
	// estimator returns garbage on a collinear point set (see the
	// BatchAnalysisRequest doc comment for the full explanation).
	if req.EnableLID && len(surah.Embedding) > 0 {
		if len(req.ReferenceCorpus) < MinLIDCorpusSize {
			result.Warnings = append(result.Warnings, fmt.Sprintf(
				"LID skipped: needs reference_corpus with >= %d real embeddings, got %d",
				MinLIDCorpusSize, len(req.ReferenceCorpus),
			))
		} else {
			lid := CalculateLID(surah.Embedding, req.ReferenceCorpus, 7)
			result.LIDAnalysis = &lid
			if lid.IsHighResonance {
				result.Discoveries = append(result.Discoveries, "HIGH_RESONANCE")
			}
		}
	}

	// 3. Persistent Homology
	if req.EnableHomology && len(surah.Embedding) > 0 {
		homology := CalculatePersistentHomology(surah.Embedding, 0.5)
		result.HomologyAnalysis = &homology

		if homology.IsFractal {
			result.Discoveries = append(result.Discoveries, "FRACTAL_TOPOLOGY")
		}

		// Check for 1/f pink noise
		if homology.TopologicalNoise > PinkNoiseLow && homology.TopologicalNoise < PinkNoiseHigh {
			result.Discoveries = append(result.Discoveries, "PINK_NOISE_1/f")
		}
	}

	// 4. Compression Analysis
	if req.EnableCompression && len(surah.Embedding) > 0 {
		compressed := TurboQuantCompress(surah.Embedding, 8)
		result.CompressionRatio = compressed.CompressionRatio

		if compressed.CompressionRatio > 6.0 {
			result.Discoveries = append(result.Discoveries, "TURBO_QUANT_6X")
		}
	}

	// 5. Calculate overall resonance
	result.OverallResonance = calculateOverallResonance(result)

	result.ProcessingTimeMs = time.Since(startTime).Milliseconds()

	return result
}

// calculateOverallResonance combines all metrics
func calculateOverallResonance(result ParallelResult) float64 {
	resonance := 0.0
	count := 0.0

	if result.LIDAnalysis != nil {
		resonance += result.LIDAnalysis.Resonance
		count++
	}

	if result.ShannonAnalysis != nil {
		// Normalize entropy to [0, 1]
		normalized := result.ShannonAnalysis.HEL / 5.0 // Assuming max entropy ~5
		resonance += normalized
		count++
	}

	if result.HomologyAnalysis != nil {
		// Fractal structures contribute more to the resonance signal.
		if result.HomologyAnalysis.IsFractal {
			resonance += OverallResonanceFractalBonus
		} else {
			resonance += OverallResonanceBaseline
		}
		count++
	}

	if count == 0 {
		return 0.5
	}

	return resonance / count
}

// calculateSummary aggregates results
func calculateSummary(results []ParallelResult) AnalysisSummary {
	summary := AnalysisSummary{
		HighResonanceSurahs:  make([]int, 0),
		FractalSurahs:        make([]int, 0),
		QuranSignatureSurahs: make([]int, 0),
	}

	totalResonance := 0.0
	totalDiscoveries := 0

	for _, result := range results {
		totalResonance += result.OverallResonance
		totalDiscoveries += len(result.Discoveries)

		if result.OverallResonance > HighResonanceThreshold {
			summary.HighResonanceSurahs = append(summary.HighResonanceSurahs, result.SurahNumber)
		}

		if result.HomologyAnalysis != nil && result.HomologyAnalysis.IsFractal {
			summary.FractalSurahs = append(summary.FractalSurahs, result.SurahNumber)
		}

		if result.ShannonAnalysis != nil && result.ShannonAnalysis.HasQuranSignature {
			summary.QuranSignatureSurahs = append(summary.QuranSignatureSurahs, result.SurahNumber)
		}
	}

	if len(results) > 0 {
		summary.AverageResonance = totalResonance / float64(len(results))
	}
	summary.TotalDiscoveries = totalDiscoveries

	return summary
}

// FormatBatchResponse formats response as JSON
func FormatBatchResponse(resp BatchAnalysisResponse) string {
	data, err := json.MarshalIndent(resp, "", "  ")
	if err != nil {
		return fmt.Sprintf(`{"error": "%s"}`, err.Error())
	}
	return string(data)
}
