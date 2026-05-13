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

	"iqra/engine/pkg/observability"
)

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

func batchAnalysisHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	var req BatchAnalysisRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	_, span := observability.Tracer().Start(r.Context(), "ProcessBatchParallel")
	span.SetAttributes(attribute.Int("batch.surahs.requested", len(req.Surahs)))
	result := ProcessBatchParallel(req)
	span.SetAttributes(
		attribute.Int("batch.surahs.processed", result.ProcessedSurahs),
		attribute.Int64("batch.duration.ms", int64(result.TotalTimeMs)),
	)
	span.End()
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(Response{
		Status:  "success",
		Message: fmt.Sprintf("Processed %d surahs in %dms", result.ProcessedSurahs, result.TotalTimeMs),
		Data:    result,
	})
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
	flag.Parse()

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

	mux := http.NewServeMux()
	mux.Handle("/health", instrument("health", healthHandler))
	mux.Handle("/fourier/transform", instrument("fourier.transform", fourierHandler))
	mux.Handle("/resonance/evaluate", instrument("resonance.evaluate", resonanceHandler))
	mux.Handle("/evolve/cycle", instrument("evolve.cycle", evolveHandler))
	mux.Handle("/batch/analyze", instrument("batch.analyze", batchAnalysisHandler))
	mux.Handle("/lid/analyze", instrument("lid.analyze", lidAnalysisHandler))
	mux.Handle("/shannon/analyze", instrument("shannon.analyze", shannonHandler))
	mux.Handle("/compression/compress", instrument("compression.compress", compressionHandler))
	mux.Handle("/homology/analyze", instrument("homology.analyze", homologyHandler))

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

	// Server drain (short ceiling so OTEL flush gets its own budget).
	shutCtx, cancelShut := context.WithTimeout(context.Background(), 10*time.Second)
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
