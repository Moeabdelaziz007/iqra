package main

import (
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"log"
	"net/http"
	"os"
	"runtime"
	"time"
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
		ctx := context.Background()
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
	result := ProcessBatchParallel(req)
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
	flag.Parse()

	if *cliMode != "" {
		runCLIMode(*cliMode, *cliInput)
		return
	}

	http.HandleFunc("/health", healthHandler)
	http.HandleFunc("/fourier/transform", fourierHandler)
	http.HandleFunc("/resonance/evaluate", resonanceHandler)
	http.HandleFunc("/evolve/cycle", evolveHandler)
	http.HandleFunc("/batch/analyze", batchAnalysisHandler)
	http.HandleFunc("/lid/analyze", lidAnalysisHandler)
	http.HandleFunc("/shannon/analyze", shannonHandler)
	http.HandleFunc("/compression/compress", compressionHandler)
	http.HandleFunc("/homology/analyze", homologyHandler)

	addr := fmt.Sprintf("127.0.0.1:%s", *port)
	fmt.Printf("🌙 IQRA Go Engine starting on %s...\n", addr)
	fmt.Printf("📊 Parallel Processing: %d CPUs available\n", runtime.NumCPU())

	if err := http.ListenAndServe(addr, nil); err != nil {
		log.Fatalf("❌ Failed to start server: %v", err)
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
