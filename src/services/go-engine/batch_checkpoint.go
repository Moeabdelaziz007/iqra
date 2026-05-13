// بسم الله الرحمن الرحيم
// Batch Checkpoint Orchestrator . Phase 5b H3
//
// This file wraps ProcessBatchParallel with chunk-by-chunk execution so a
// long-running batch can be checkpointed mid-flight and resumed cleanly.
// The existing ProcessBatchParallel function in parallel_engine.go stays
// untouched and remains the single in-process compute primitive; this
// orchestrator simply slices the request, calls ProcessBatchParallel on
// each slice, and persists progress between slices.

package main

import (
	"context"
	"encoding/json"
	"errors"
	"log"
	"time"

	"go.opentelemetry.io/otel/attribute"

	"iqra/engine/pkg/lifecycle"
	"iqra/engine/pkg/observability"
)

// DefaultChunkSize is the number of surahs processed in a single
// ProcessBatchParallel invocation before a checkpoint write. Eight balances
// "checkpoint often enough that interrupted work is cheap to redo" against
// "do not spend the run on serialization overhead." Override via the
// BatchAnalysisRequest.MaxWorkers heuristic if a deployment has different
// memory or CPU constraints.
const DefaultChunkSize = 8

// CheckpointReason captures why a checkpoint write happened. It is recorded
// in the on-disk Checkpoint.Reason field so operators can triage stale
// files during incident response.
const (
	reasonProgress = "progress"
	reasonShutdown = "shutdown"
	reasonError    = "error"
)

// BatchOrchestrator wraps ProcessBatchParallel with checkpointing. The
// zero value is ready to use; callers may override ChunkSize for tests.
type BatchOrchestrator struct {
	ChunkSize int
}

// Run executes the batch with periodic checkpoints. If ctx is cancelled
// (typically by SIGINT/SIGTERM via the main signal-driven shutdown) the
// orchestrator stops scheduling new chunks, persists the current state
// with reason="shutdown", and returns the partial response together with
// ctx.Err. The caller is expected to surface the partial response to the
// client so they can decide whether to retry or resume.
//
// resumeFrom is the index in req.Surahs at which to start. previousResults
// holds the ParallelResult entries already computed in a prior run; the
// orchestrator concatenates new results onto this slice.
func (o *BatchOrchestrator) Run(
	ctx context.Context,
	jobID string,
	req BatchAnalysisRequest,
	resumeFrom int,
	previousResults []ParallelResult,
) (BatchAnalysisResponse, error) {
	if jobID == "" {
		jobID = lifecycle.NewJobID()
	}
	chunkSize := o.ChunkSize
	if chunkSize <= 0 {
		chunkSize = DefaultChunkSize
	}

	tracer := observability.Tracer()
	ctx, rootSpan := tracer.Start(ctx, "BatchOrchestrator.Run")
	rootSpan.SetAttributes(
		attribute.String("batch.job_id", jobID),
		attribute.Int("batch.surahs.total", len(req.Surahs)),
		attribute.Int("batch.resume_from", resumeFrom),
		attribute.Int("batch.chunk_size", chunkSize),
	)
	defer rootSpan.End()

	startTime := time.Now()
	accumulated := append([]ParallelResult{}, previousResults...)
	totalSurahs := len(req.Surahs)
	requestBlob, _ := json.Marshal(req)
	lastIndex := resumeFrom

	// Persist an initial checkpoint so the resume path works even if the
	// process is killed before the first chunk completes.
	if err := saveCheckpoint(jobID, req, accumulated, lastIndex, totalSurahs, startTime, requestBlob, reasonProgress); err != nil {
		log.Printf("[checkpoint] initial save failed for job %s: %v", jobID, err)
	}

	for cursor := resumeFrom; cursor < totalSurahs; cursor += chunkSize {
		select {
		case <-ctx.Done():
			// Shutdown signal received. Persist whatever we have and bail.
			if saveErr := saveCheckpoint(jobID, req, accumulated, lastIndex, totalSurahs, startTime, requestBlob, reasonShutdown); saveErr != nil {
				log.Printf("[checkpoint] shutdown save failed for job %s: %v", jobID, saveErr)
			}
			return buildResponse(totalSurahs, accumulated, startTime), ctx.Err()
		default:
		}

		end := cursor + chunkSize
		if end > totalSurahs {
			end = totalSurahs
		}

		chunkReq := req
		chunkReq.Surahs = req.Surahs[cursor:end]

		_, chunkSpan := tracer.Start(ctx, "BatchOrchestrator.Chunk")
		chunkSpan.SetAttributes(
			attribute.String("batch.job_id", jobID),
			attribute.Int("batch.chunk.start", cursor),
			attribute.Int("batch.chunk.end", end),
			attribute.Int("batch.chunk.size", end-cursor),
		)
		chunkResponse := ProcessBatchParallel(chunkReq)
		chunkSpan.SetAttributes(
			attribute.Int("batch.chunk.processed", chunkResponse.ProcessedSurahs),
			attribute.Int64("batch.chunk.duration_ms", chunkResponse.TotalTimeMs),
		)
		chunkSpan.End()

		accumulated = append(accumulated, chunkResponse.Results...)
		lastIndex = end

		if err := saveCheckpoint(jobID, req, accumulated, lastIndex, totalSurahs, startTime, requestBlob, reasonProgress); err != nil {
			// Persistence failures are non-fatal for the compute path; log and
			// keep going. The next chunk's save will try again.
			log.Printf("[checkpoint] progress save failed for job %s: %v", jobID, err)
		}
	}

	response := buildResponse(totalSurahs, accumulated, startTime)
	// Completed cleanly: drop the checkpoint to keep the directory tidy.
	if err := lifecycle.Delete(jobID); err != nil {
		log.Printf("[checkpoint] cleanup failed for job %s: %v", jobID, err)
	}
	return response, nil
}

// ResumeFromCheckpoint rehydrates a Checkpoint into the inputs Run expects,
// then calls Run. It returns os.ErrNotExist-wrapped when the job ID does
// not exist on disk.
func ResumeFromCheckpoint(ctx context.Context, jobID string) (BatchAnalysisResponse, error) {
	cp, err := lifecycle.Load(jobID)
	if err != nil {
		return BatchAnalysisResponse{}, err
	}
	if cp.RequestRaw == nil {
		return BatchAnalysisResponse{}, errors.New("checkpoint: missing request payload")
	}
	var req BatchAnalysisRequest
	if err := json.Unmarshal(cp.RequestRaw, &req); err != nil {
		return BatchAnalysisResponse{}, err
	}
	var previousResults []ParallelResult
	if cp.ResultsRaw != nil {
		if err := json.Unmarshal(cp.ResultsRaw, &previousResults); err != nil {
			return BatchAnalysisResponse{}, err
		}
	}
	orchestrator := &BatchOrchestrator{}
	return orchestrator.Run(ctx, cp.JobID, req, cp.LastProcessedIndex, previousResults)
}

// saveCheckpoint serializes the in-memory state and hands it to the
// lifecycle store. Pulled out so the loop body stays readable.
func saveCheckpoint(
	jobID string,
	req BatchAnalysisRequest,
	accumulated []ParallelResult,
	lastIndex, total int,
	startedAt time.Time,
	requestBlob []byte,
	reason string,
) error {
	resultsBlob, err := json.Marshal(accumulated)
	if err != nil {
		return err
	}
	cp := &lifecycle.Checkpoint{
		Version:            lifecycle.CheckpointVersion,
		JobID:              jobID,
		StartedAt:          startedAt.UTC(),
		UpdatedAt:          time.Now().UTC(),
		TotalItems:         total,
		LastProcessedIndex: lastIndex,
		RequestRaw:         requestBlob,
		ResultsRaw:         resultsBlob,
		Reason:             reason,
	}
	return lifecycle.Save(cp)
}

// buildResponse assembles a BatchAnalysisResponse from the accumulated
// results, mirroring the shape ProcessBatchParallel produces so clients
// cannot tell whether a response came from a single chunk or a resumed
// multi-chunk run.
func buildResponse(total int, accumulated []ParallelResult, startTime time.Time) BatchAnalysisResponse {
	return BatchAnalysisResponse{
		TotalSurahs:     total,
		ProcessedSurahs: len(accumulated),
		TotalTimeMs:     time.Since(startTime).Milliseconds(),
		Results:         accumulated,
		Summary:         calculateSummary(accumulated),
	}
}
