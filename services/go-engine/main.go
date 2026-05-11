package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
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
	// Simulate heavy Fourier computation for memory resonance
	time.Sleep(100 * time.Millisecond) // Simulated latency
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
	ctx := r.Context()

	// Use proper goroutine management with context
	go func() {
		// Create a separate context for background work
		bgCtx := context.Background()
		log.Println("Starting autonomous evolution cycle...")

		select {
		case <-time.After(2 * time.Second):
			log.Println("Evolution cycle completed.")
		case <-ctx.Done():
			log.Println("Evolution cycle cancelled due to client disconnect")
			return
		}
	}()

	json.NewEncoder(w).Encode(Response{
		Status:  "success",
		Message: "Evolution cycle initiated in background",
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

func main() {
	// Create context for graceful shutdown
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// Setup signal handling for graceful shutdown
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)

	// Setup HTTP server with all handlers
	mux := http.NewServeMux()
	mux.HandleFunc("/health", healthHandler)
	mux.HandleFunc("/fourier/transform", fourierHandler)
	mux.HandleFunc("/resonance/evaluate", resonanceHandler)
	mux.HandleFunc("/evolve/cycle", evolveHandler)

	// New Qalbin VM and Enhanced Pattern endpoints
	mux.HandleFunc("/qalbin/vm", qalbinVMHandler)
	mux.HandleFunc("/homology/persistent", persistentHomologyHandler)
	mux.HandleFunc("/resonance/enhanced", enhancedResonanceHandler)

	// Create server with timeout settings
	server := &http.Server{
		Addr:         "127.0.0.1:8082",
		Handler:      mux,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Start server in goroutine
	go func() {
		fmt.Printf("🌙 IQRA Go Engine with Qalbin VM integration starting on %s...\n", server.Addr)
		fmt.Printf("📡 Available endpoints:\n")
		fmt.Printf("   - GET  /health\n")
		fmt.Printf("   - GET  /fourier/transform\n")
		fmt.Printf("   - POST /resonance/evaluate\n")
		fmt.Printf("   - POST /evolve/cycle\n")
		fmt.Printf("   - POST /qalbin/vm\n")
		fmt.Printf("   - POST /homology/persistent\n")
		fmt.Printf("   - POST /resonance/enhanced\n")

		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatal(err)
		}
	}()

	// Wait for shutdown signal
	<-sigChan
	fmt.Println("\n🛑 Shutdown signal received, gracefully shutting down...")

	// Create shutdown context with timeout
	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer shutdownCancel()

	// Graceful shutdown
	if err := server.Shutdown(shutdownCtx); err != nil {
		log.Printf("❌ Server shutdown error: %v", err)
	} else {
		fmt.Println("✅ Server gracefully stopped")
	}
}
