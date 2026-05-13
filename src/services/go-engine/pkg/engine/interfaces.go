// بسم الله الرحمن الرحيم
// Small, swappable contracts for the IQRA cognitive engines.
//
// These interfaces exist so that consumers of pkg/engine (and any future
// cross-repo binding such as aix-format's manifest signer) can program
// against a stable surface instead of concrete functions. They also lay
// the ground for #H6, where a TwoNN-based LIDAnalyzer becomes a peer of
// the existing MLE-k implementation without breaking callers.

package engine

import "context"

// LIDAnalyzer estimates the local intrinsic dimension of a query embedding
// against a reference corpus. Implementations document their algorithm in
// the result's Provenance field (see #H7).
type LIDAnalyzer interface {
	Analyze(query []float64, corpus [][]float64, k int) LIDResult
}

// EntropyAnalyzer extracts a ShannonResult from raw text. Implementations
// may differ in tokenisation, diacritic handling, or n-gram scale, but
// the result shape is fixed.
type EntropyAnalyzer interface {
	Analyze(text string) ShannonResult
}

// ToneAnalyzer turns a text into a frequency-domain ToneResult. The
// current implementation maps Arabic letters via Abjad values, but any
// numeric-signal-from-text mapping can satisfy the interface.
type ToneAnalyzer interface {
	Analyze(text string) ToneResult
}

// CompressionAnalyzer reduces an embedding to a quantised form together
// with the codebook needed for reconstruction. The Result type is shared
// so callers can dispatch on Compressed length without knowing which
// concrete compressor produced it.
type CompressionAnalyzer interface {
	Compress(embedding []float64, bits int) TurboQuantResult
}

// BatchProcessor runs a batch analysis. ProcessBatchParallel and
// ProcessBatchParallelContext satisfy this contract via the adapter
// defined below. The interface deliberately takes a context.Context
// so any future implementation (HTTP, gRPC, in-process) can honour cancellation.
type BatchProcessor interface {
	Process(ctx context.Context, req BatchAnalysisRequest) BatchAnalysisResponse
}

// mleLidAdapter is the concrete adapter for CalculateLID (k-MLE estimator).
// Unexported to match the pattern used by the other adapters in this file;
// consumers obtain an instance via NewLIDAnalyzer().
type mleLidAdapter struct{}

// Analyze satisfies LIDAnalyzer.
func (mleLidAdapter) Analyze(query []float64, corpus [][]float64, k int) LIDResult {
	return CalculateLID(query, corpus, k)
}

// NewLIDAnalyzer returns the default k-MLE LID implementation. When the
// TwoNN estimator lands in #H6 it will become a peer of this constructor
// (e.g. NewTwoNNLIDAnalyzer), and the caller will choose which seam to
// instantiate without changing the LIDAnalyzer interface itself.
func NewLIDAnalyzer() LIDAnalyzer { return mleLidAdapter{} }

// shannonAdapter is the concrete adapter for CalculateShannonHEL.
type shannonAdapter struct{}

// Analyze satisfies EntropyAnalyzer.
func (shannonAdapter) Analyze(text string) ShannonResult {
	return CalculateShannonHEL(text)
}

// NewShannonEntropyAnalyzer returns the default Shannon-H_EL implementation.
func NewShannonEntropyAnalyzer() EntropyAnalyzer { return shannonAdapter{} }

// toneAdapter is the concrete adapter for CalculateTone.
type toneAdapter struct{}

// Analyze satisfies ToneAnalyzer.
func (toneAdapter) Analyze(text string) ToneResult { return CalculateTone(text) }

// NewToneAnalyzer returns the default FFT-based tone analyzer.
func NewToneAnalyzer() ToneAnalyzer { return toneAdapter{} }

// turboQuantAdapter is the concrete adapter for TurboQuantCompress.
type turboQuantAdapter struct{}

// Compress satisfies CompressionAnalyzer.
func (turboQuantAdapter) Compress(embedding []float64, bits int) TurboQuantResult {
	return TurboQuantCompress(embedding, bits)
}

// NewTurboQuantCompressor returns the default TurboQuant compressor.
func NewTurboQuantCompressor() CompressionAnalyzer { return turboQuantAdapter{} }

// batchAdapter wraps ProcessBatchParallelContext into a BatchProcessor.
type batchAdapter struct{}

// Process satisfies BatchProcessor.
func (batchAdapter) Process(ctx context.Context, req BatchAnalysisRequest) BatchAnalysisResponse {
	return ProcessBatchParallelContext(ctx, req)
}

// NewBatchProcessor returns the default parallel batch processor.
func NewBatchProcessor() BatchProcessor { return batchAdapter{} }
