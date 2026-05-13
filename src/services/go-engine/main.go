package main

import (
	"context"
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"log"
	"net"
	"net/http"
	"os"
	"os/signal"
	"runtime"
	"syscall"
	"time"
)

// shutdownGracePeriod is the absolute time budget for in-flight requests
// to finish and any pending agent-state checkpoint to be flushed to disk
// after a SIGTERM / SIGINT arrives. Kubernetes' default
// terminationGracePeriodSeconds is 30s; 15s leaves room for the kubelet
// to escalate to SIGKILL without us losing the checkpoint.
const shutdownGracePeriod = 15 * time.Second

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
	// The background "evolution" goroutine is bound to the server-wide
	// rootCtx (set on http.Server.BaseContext) so a SIGTERM aborts it
	// cleanly instead of leaving an orphan goroutine running past
	// shutdown. r.Context() cancels as soon as the response is written,
	// which would kill the cycle prematurely; rootCtx is the right scope.
	ctx := r.Context()
	if bc, ok := r.Context().Value(rootCtxKey{}).(context.Context); ok {
		ctx = bc
	}

	go func(ctx context.Context) {
		log.Println("Starting autonomous evolution cycle...")
		select {
		case <-time.After(2 * time.Second):
			log.Println("Evolution cycle completed.")
		case <-ctx.Done():
			log.Println("Evolution cycle cancelled by shutdown signal.")
		}
	}(ctx)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(Response{
		Status:  "accepted",
		Message: "Evolution cycle started in background",
	})
}

// rootCtxKey is a typed context-key marker so handlers can recover the
// server-wide root context from any request context. Unexported to keep
// the key namespaced to this binary.
type rootCtxKey struct{}

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
	result := CalculateResonance(req.Input)
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
	// Prefer the server-wide rootCtx over r.Context() so a long batch
	// is not killed mid-flight just because the HTTP client disconnects.
	// rootCtx cancels only on SIGTERM/SIGINT, which is exactly when we
	// want the worker pool to drain and checkpoint.
	ctx := r.Context()
	if bc, ok := r.Context().Value(rootCtxKey{}).(context.Context); ok {
		ctx = bc
	}
	result := ProcessBatchParallelContext(ctx, req)
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
	result := CalculateLID(req.Embedding, req.References, req.K)
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
	result := CalculateShannonHEL(req.Text)
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
	var result interface{}
	switch req.Method {
	case "polar":
		result = PolarQuantCompress(req.Embedding)
	case "qjl":
		result = QJLCompress(req.Embedding)
	default:
		result = TurboQuantCompress(req.Embedding, req.Bits)
	}
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
	result := CalculatePersistentHomology(req.Embedding, req.Threshold)
	json.NewEncoder(w).Encode(Response{
		Status:  "success",
		Message: "Persistent Homology Analysis Complete",
		Data:    result,
	})
}

func main() {
	cliMode := flag.String("mode", "", "Run in CLI mode (shannon, lid, homology)")
	cliInput := flag.String("input", "", "JSON input for CLI mode")
	port := flag.String("port", "8082", "Port to listen on (server mode)")
	resumeFrom := flag.String("resume-from", "",
		"Optional path to a checkpoint JSON written by a previous shutdown. "+
			"On startup the server loads pending surahs from this file and "+
			"replays them before accepting new traffic. Empty = fresh start.")
	checkpointDir := flag.String("checkpoint-dir", ".generated",
		"Directory where shutdown checkpoints are written. Created on demand.")
	flag.Parse()

	if *cliMode != "" {
		runCLIMode(*cliMode, *cliInput)
		return
	}

	// Root context cancels on SIGINT or SIGTERM. Every long-running
	// goroutine (worker pools, background tickers, evolution cycles)
	// MUST be parented to this context so they wind down cleanly when
	// the platform pulls the plug. This is the engine-level lever that
	// makes the "agent survives platform disappearance" property real:
	// in-flight batches save their state to disk before the process
	// exits, and a subsequent `--resume-from` brings them back.
	rootCtx, stop := signal.NotifyContext(
		context.Background(), syscall.SIGINT, syscall.SIGTERM,
	)
	defer stop()

	// Optional resume: load pending surahs from a prior checkpoint and
	// replay them as if they had just arrived on /batch/analyze.
	if *resumeFrom != "" {
		if err := replayCheckpoint(rootCtx, *resumeFrom); err != nil {
			log.Printf("resume failed: %v", err)
		} else {
			log.Printf("resumed checkpoint: %s", *resumeFrom)
		}
	}

	mux := http.NewServeMux()
	mux.HandleFunc("/health", healthHandler)
	mux.HandleFunc("/fourier/transform", fourierHandler)
	mux.HandleFunc("/resonance/evaluate", resonanceHandler)
	mux.HandleFunc("/evolve/cycle", evolveHandler)
	mux.HandleFunc("/batch/analyze", batchAnalysisHandler)
	mux.HandleFunc("/lid/analyze", lidAnalysisHandler)
	mux.HandleFunc("/shannon/analyze", shannonHandler)
	mux.HandleFunc("/compression/compress", compressionHandler)
	mux.HandleFunc("/homology/analyze", homologyHandler)

	addr := fmt.Sprintf("127.0.0.1:%s", *port)
	srv := &http.Server{
		Addr:         addr,
		Handler:      mux,
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 60 * time.Second, // batch/analyze can be slow
		IdleTimeout:  120 * time.Second,
		// BaseContext propagates rootCtx into every request so handlers
		// can recover it via r.Context().Value(rootCtxKey{}).
		BaseContext: func(net.Listener) context.Context {
			return context.WithValue(rootCtx, rootCtxKey{}, rootCtx)
		},
	}
	setCheckpointDir(*checkpointDir)

	fmt.Printf("🌙 IQRA Go Engine starting on %s...\n", addr)
	fmt.Printf("📊 Parallel Processing: %d CPUs available\n", runtime.NumCPU())

	serverErr := make(chan error, 1)
	go func() {
		if err := srv.ListenAndServe(); !errors.Is(err, http.ErrServerClosed) {
			serverErr <- err
		}
		close(serverErr)
	}()

	select {
	case <-rootCtx.Done():
		log.Println("shutdown signal received, draining in-flight requests...")
	case err, ok := <-serverErr:
		if ok && err != nil {
			log.Fatalf("❌ server crash: %v", err)
		}
		return
	}

	// Drain phase: give the HTTP server up to shutdownGracePeriod to
	// finish in-flight responses. Any batch goroutine that observed
	// rootCtx.Done() will already be persisting its checkpoint.
	shutdownCtx, cancel := context.WithTimeout(context.Background(), shutdownGracePeriod)
	defer cancel()
	if err := srv.Shutdown(shutdownCtx); err != nil {
		log.Printf("graceful shutdown error: %v", err)
	}
	log.Println("shutdown complete.")
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
