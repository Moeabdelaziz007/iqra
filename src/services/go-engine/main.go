package main

import (
	"context"
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"runtime"
	"syscall"
	"time"

	"go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp"
	"go.opentelemetry.io/otel/attribute"

	"iqra/engine/pkg/lifecycle"
	"iqra/engine/pkg/observability"
	"iqra/engine/pkg/policy"
)

// policyEngine is initialized in main() and shared across HTTP handlers.
// nil means the engine never started successfully; the policy endpoint
// returns 503 in that case rather than fail-open.
var policyEngine *policy.Engine

type Response struct {
	Status  string      `json:"status"`
	Message string      `json:"message"`
	Data    interface{} `json:"data,omitempty"`
}

func healthHandler(w http.ResponseWriter, r *http.Request) {
	json.NewEncoder(w).Encode(Response{
		Status:  "success",
		Message: "IQRA Go Engine is pulse-stable",
	})
}

func fourierHandler(w http.ResponseWriter, r *http.Request) {
	time.Sleep(100 * time.Millisecond)
	json.NewEncoder(w).Encode(Response{
		Status:  "success",
		Message: "Resonance calculated",
		Data: map[string]float64{
			"coherence": 0.98,
			"phase":     3.14,
		},
	})
}

func evolveHandler(w http.ResponseWriter, r *http.Request) {
	// Use context.Background() to prevent connection leaks
	go func() {
		log.Println("Starting autonomous evolution cycle...")

		// Simulate evolution work
		time.Sleep(2 * time.Second)
		log.Println("Evolution cycle completed.")

		// Don't write to response writer from goroutine
		// Response should be sent immediately to avoid race conditions
	}()

	// Send immediate response
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(Response{
		Status:  "accepted",
		Message: "Evolution cycle started in background",
	})
}

func resonanceHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	var req struct {
		Input string `json:"input"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	_, span := observability.Tracer().Start(r.Context(), "CalculateResonance")
	span.SetAttributes(attribute.Int("input.length", len(req.Input)))
	result := CalculateResonance(req.Input)
	span.End()
	json.NewEncoder(w).Encode(Response{
		Status:  "success",
		Message: "Topological Curiosity Resonance Evaluated",
		Data:    result,
	})
}

// policyEvaluateHandler exposes the Phase 5b OPA policy engine over HTTP so
// TypeScript callers in the IQRA runtime can run a fast pre-flight check
// before paying the cost of the full DAMIR pipeline. Body is policy.Input
// JSON, response is policy.Decision JSON, never both. On any engine error
// the handler still returns a fail-closed Deny decision (the engine itself
// embeds the fail-closed shape) but emits a 200 so the caller's contract
// stays uniform; the response body's outcome=deny is the gate.
func policyEvaluateHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	if policyEngine == nil {
		http.Error(w, "policy engine not initialized", http.StatusServiceUnavailable)
		return
	}
	var input policy.Input
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		http.Error(w, "bad request: "+err.Error(), http.StatusBadRequest)
		return
	}
	decision, _ := policyEngine.Evaluate(r.Context(), input)
	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(decision); err != nil {
		log.Printf("[policy] encode error: %v", err)
	}
}

// makeBatchHandler returns an HTTP handler closed over the engine's root
// context. The handler links the per-request context to the root so that a
// SIGINT/SIGTERM arriving during a long batch propagates down into the
// BatchOrchestrator, which saves a checkpoint and returns a partial result
// rather than being cut off mid-chunk by the server-Shutdown deadline.
func makeBatchHandler(rootCtx context.Context) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}
		var req BatchAnalysisRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		// Combine the request context with the root context so cancellation of
		// either (client disconnect OR engine shutdown) reaches the orchestrator.
		jobCtx, cancelJob := context.WithCancel(r.Context())
		defer cancelJob()
		stopBridge := context.AfterFunc(rootCtx, cancelJob)
		defer stopBridge()

		jobID := lifecycle.NewJobID()
		_, span := observability.Tracer().Start(jobCtx, "ProcessBatchParallel")
		span.SetAttributes(
			attribute.String("batch.job_id", jobID),
			attribute.Int("batch.surahs.requested", len(req.Surahs)),
		)
		orchestrator := &BatchOrchestrator{}
		result, runErr := orchestrator.Run(jobCtx, jobID, req, 0, nil)
		span.SetAttributes(
			attribute.Int("batch.surahs.processed", result.ProcessedSurahs),
			attribute.Int64("batch.duration.ms", int64(result.TotalTimeMs)),
		)
		span.End()

		w.Header().Set("Content-Type", "application/json")
		// Surface the job id so an interrupted run can be resumed via
		// `iqra-engine -resume-from <jobID>`.
		w.Header().Set("X-IQRA-Job-ID", jobID)

		status := "success"
		message := fmt.Sprintf("Processed %d/%d surahs in %dms", result.ProcessedSurahs, result.TotalSurahs, result.TotalTimeMs)
		if runErr != nil {
			status = "partial"
			message = fmt.Sprintf("Interrupted at %d/%d surahs; resume with job_id=%s (reason: %v)",
				result.ProcessedSurahs, result.TotalSurahs, jobID, runErr)
			w.WriteHeader(http.StatusAccepted)
		}
		json.NewEncoder(w).Encode(Response{
			Status:  status,
			Message: message,
			Data:    result,
		})
	}
}

func lidAnalysisHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	var req struct {
		Embedding  []float64   `json:"embedding"`
		References [][]float64 `json:"references"`
		K          int         `json:"k"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	if req.K <= 0 {
		req.K = 7
	}
	_, span := observability.Tracer().Start(r.Context(), "CalculateLID")
	span.SetAttributes(
		attribute.Int("lid.embedding.dim", len(req.Embedding)),
		attribute.Int("lid.references.count", len(req.References)),
		attribute.Int("lid.k", req.K),
	)
	result := CalculateLID(req.Embedding, req.References, req.K)
	span.End()
	json.NewEncoder(w).Encode(Response{
		Status:  "success",
		Message: "LID Analysis Complete",
		Data:    result,
	})
}

func shannonHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	var req struct {
		Text string `json:"text"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	_, span := observability.Tracer().Start(r.Context(), "CalculateShannonHEL")
	span.SetAttributes(attribute.Int("shannon.text.length", len(req.Text)))
	result := CalculateShannonHEL(req.Text)
	span.End()
	json.NewEncoder(w).Encode(Response{
		Status:  "success",
		Message: "Shannon H_EL Analysis Complete",
		Data:    result,
	})
}

func compressionHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	var req struct {
		Embedding []float64 `json:"embedding"`
		Method    string    `json:"method"`
		Bits      int       `json:"bits"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	method := req.Method
	if method == "" {
		method = "turbo"
	}
	_, span := observability.Tracer().Start(r.Context(), "CompressionDispatch")
	span.SetAttributes(
		attribute.String("compression.method", method),
		attribute.Int("compression.embedding.dim", len(req.Embedding)),
		attribute.Int("compression.bits", req.Bits),
	)
	var result interface{}
	switch req.Method {
	case "polar":
		result = PolarQuantCompress(req.Embedding)
	case "qjl":
		result = QJLCompress(req.Embedding)
	default:
		result = TurboQuantCompress(req.Embedding, req.Bits)
	}
	span.End()
	json.NewEncoder(w).Encode(Response{
		Status:  "success",
		Message: "Compression Complete",
		Data:    result,
	})
}

func homologyHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	var req struct {
		Embedding []float64 `json:"embedding"`
		Threshold float64   `json:"threshold"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	if req.Threshold <= 0 {
		req.Threshold = 0.5
	}
	_, span := observability.Tracer().Start(r.Context(), "CalculatePersistentHomology")
	span.SetAttributes(
		attribute.Int("homology.embedding.dim", len(req.Embedding)),
		attribute.Float64("homology.threshold", req.Threshold),
	)
	result := CalculatePersistentHomology(req.Embedding, req.Threshold)
	span.End()
	json.NewEncoder(w).Encode(Response{
		Status:  "success",
		Message: "Persistent Homology Analysis Complete",
		Data:    result,
	})
}

// instrument wraps an http.HandlerFunc with OpenTelemetry auto-instrumentation.
// The operation argument becomes the root span name and is also used as the
// otelhttp route label so trace dashboards can group spans per endpoint.
func instrument(operation string, h http.HandlerFunc) http.Handler {
	return otelhttp.NewHandler(h, operation, otelhttp.WithSpanOptions())
}

func main() {
	cliMode := flag.String("mode", "", "Run in CLI mode (shannon, lid, homology)")
	cliInput := flag.String("input", "", "JSON input for CLI mode")
	port := flag.String("port", "8082", "Port to listen on (server mode)")
	resumeFrom := flag.String("resume-from", "", "Resume an interrupted batch job by its job id (CLI mode)")
	listCheckpoints := flag.Bool("list-checkpoints", false, "List all pending batch-job checkpoints and exit")
	flag.Parse()

	if *listCheckpoints {
		runListCheckpoints()
		return
	}

	if *resumeFrom != "" {
		runResumeBatch(*resumeFrom)
		return
	}

	if *cliMode != "" {
		runCLIMode(*cliMode, *cliInput)
		return
	}

	// Init OpenTelemetry early so even startup logs/spans are captured.
	rootCtx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	shutdownOTel, err := observability.Init(rootCtx)
	if err != nil {
		log.Printf("[otel] init error (continuing without tracing): %v", err)
	}

	// Compile the Phase 5b OPA policy bundle once at boot. A compile error
	// is fatal: running with a broken policy is worse than refusing to
	// start because it silently relaxes the guard. The compiled query is
	// shared across all goroutines via the engine's internal RWMutex.
	engine, policyErr := policy.New(rootCtx)
	if policyErr != nil {
		log.Fatalf("❌ Policy engine failed to compile: %v", policyErr)
	}
	policyEngine = engine
	log.Println("[policy] OPA bundle compiled and ready")

	mux := http.NewServeMux()
	mux.Handle("/health", instrument("health", healthHandler))
	mux.Handle("/fourier/transform", instrument("fourier.transform", fourierHandler))
	mux.Handle("/resonance/evaluate", instrument("resonance.evaluate", resonanceHandler))
	mux.Handle("/evolve/cycle", instrument("evolve.cycle", evolveHandler))
	// Batch handler is wrapped with the root context so SIGINT/SIGTERM
	// reaches the BatchOrchestrator's loop and triggers a checkpoint save.
	mux.Handle("/batch/analyze", instrument("batch.analyze", makeBatchHandler(rootCtx)))
	mux.Handle("/lid/analyze", instrument("lid.analyze", lidAnalysisHandler))
	mux.Handle("/shannon/analyze", instrument("shannon.analyze", shannonHandler))
	mux.Handle("/compression/compress", instrument("compression.compress", compressionHandler))
	mux.Handle("/homology/analyze", instrument("homology.analyze", homologyHandler))
	// Phase 5b: stateless OPA policy evaluator. Callers POST a policy.Input
	// JSON document; the response is a policy.Decision (allow/warn/deny).
	mux.Handle("/policy/evaluate", instrument("policy.evaluate", policyEvaluateHandler))

	addr := fmt.Sprintf("127.0.0.1:%s", *port)
	srv := &http.Server{
		Addr:              addr,
		Handler:           mux,
		ReadHeaderTimeout: 10 * time.Second,
	}

	fmt.Printf("🌙 IQRA Go Engine starting on %s...\n", addr)
	fmt.Printf("📊 Parallel Processing: %d CPUs available\n", runtime.NumCPU())

	serverErr := make(chan error, 1)
	go func() {
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			serverErr <- err
		}
		close(serverErr)
	}()

	select {
	case err := <-serverErr:
		log.Fatalf("❌ Server failed: %v", err)
	case <-rootCtx.Done():
		log.Println("[main] shutdown signal received, draining...")
	}

	// Server drain. 30 seconds is the ceiling: long enough for an in-flight
	// batch handler to recognise the root-context cancellation, persist a
	// checkpoint via lifecycle.Save, and return a partial response cleanly;
	// short enough that a truly stuck handler does not block process exit
	// indefinitely. Most shutdowns complete in well under a second because
	// the BatchOrchestrator's per-chunk select reacts to rootCtx the instant
	// SIGTERM arrives.
	shutCtx, cancelShut := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancelShut()
	if err := srv.Shutdown(shutCtx); err != nil {
		log.Printf("[main] server shutdown error: %v", err)
	}

	// OTEL flush. Use a fresh context so it is not already cancelled.
	if shutdownOTel != nil {
		otelCtx, cancelOTel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancelOTel()
		if err := shutdownOTel(otelCtx); err != nil {
			log.Printf("[otel] shutdown error: %v", err)
		}
	}

	log.Println("[main] shutdown complete")
}

// runListCheckpoints prints every pending batch-job checkpoint and exits.
// Triggered by `iqra-engine -list-checkpoints` for operators inspecting the
// queue without spinning up the server. Output is plain-text columnar so
// pipe-to-grep stays useful.
func runListCheckpoints() {
	ids, err := lifecycle.List()
	if err != nil {
		fmt.Fprintf(os.Stderr, "list-checkpoints: %v\n", err)
		os.Exit(1)
	}
	if len(ids) == 0 {
		fmt.Println("No pending checkpoints. Directory:", lifecycle.DefaultDir())
		return
	}
	fmt.Printf("Pending checkpoints (%d) in %s:\n", len(ids), lifecycle.DefaultDir())
	for _, id := range ids {
		cp, err := lifecycle.Load(id)
		if err != nil {
			fmt.Printf("  %s  (unreadable: %v)\n", id, err)
			continue
		}
		fmt.Printf("  %s  %d/%d  reason=%-8s  updated=%s\n",
			cp.JobID, cp.LastProcessedIndex, cp.TotalItems, cp.Reason, cp.UpdatedAt.Format(time.RFC3339))
	}
}

// runResumeBatch reads the checkpoint for jobID, replays the request against
// ProcessBatchParallel starting at LastProcessedIndex, and writes the final
// (or partial-if-interrupted-again) response to stdout as JSON. Triggered by
// `iqra-engine -resume-from <jobID>`. Honors SIGINT/SIGTERM so a second
// interruption preserves the checkpoint for a third attempt.
func runResumeBatch(jobID string) {
	rootCtx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	shutdownOTel, err := observability.Init(rootCtx)
	if err != nil {
		log.Printf("[otel] init error (continuing without tracing): %v", err)
	}
	defer func() {
		if shutdownOTel == nil {
			return
		}
		otelCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		if err := shutdownOTel(otelCtx); err != nil {
			log.Printf("[otel] shutdown error: %v", err)
		}
	}()

	fmt.Fprintf(os.Stderr, "[resume] loading checkpoint job_id=%s from %s\n", jobID, lifecycle.DefaultDir())
	response, err := ResumeFromCheckpoint(rootCtx, jobID)
	if err != nil {
		fmt.Fprintf(os.Stderr, "[resume] failed: %v\n", err)
		os.Exit(1)
	}
	if rootCtx.Err() != nil {
		fmt.Fprintf(os.Stderr, "[resume] interrupted again at %d/%d surahs; checkpoint preserved\n",
			response.ProcessedSurahs, response.TotalSurahs)
	} else {
		fmt.Fprintf(os.Stderr, "[resume] complete: %d/%d surahs in %dms\n",
			response.ProcessedSurahs, response.TotalSurahs, response.TotalTimeMs)
	}
	if err := json.NewEncoder(os.Stdout).Encode(response); err != nil {
		fmt.Fprintf(os.Stderr, "[resume] encode error: %v\n", err)
		os.Exit(1)
	}
}

func runCLIMode(mode, input string) {
	switch mode {
	case "shannon":
		var req struct {
			Text string `json:"text"`
		}
		if err := json.Unmarshal([]byte(input), &req); err != nil {
			fmt.Printf(`{"error": "%v"}`, err)
			return
		}
		result := CalculateShannonHEL(req.Text)
		json.NewEncoder(os.Stdout).Encode(result)
	case "homology":
		var req struct {
			Embedding []float64 `json:"embedding"`
			Threshold float64   `json:"threshold"`
		}
		if err := json.Unmarshal([]byte(input), &req); err != nil {
			fmt.Printf(`{"error": "%v"}`, err)
			return
		}
		result := CalculatePersistentHomology(req.Embedding, req.Threshold)
		json.NewEncoder(os.Stdout).Encode(result)
	default:
		fmt.Printf(`{"error": "unknown mode %s"}`, mode)
	}
}
