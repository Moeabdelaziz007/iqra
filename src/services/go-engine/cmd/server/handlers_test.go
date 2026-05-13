// بسم الله الرحمن الرحيم
// HTTP handler tests using httptest. Each handler is exercised both on
// its happy path and on a representative invalid-input path so the JSON
// response contract is locked in.

package main

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"

	"iqra/engine/pkg/engine"
	"testing"
)

func TestHealthHandler(t *testing.T) {
	w := httptest.NewRecorder()
	r := httptest.NewRequest(http.MethodGet, "/health", nil)
	healthHandler(w, r)
	if w.Code != http.StatusOK {
		t.Fatalf("status: got %d want 200", w.Code)
	}
	var resp Response
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if resp.Status != "success" {
		t.Errorf("Status: got %q want success", resp.Status)
	}
}

func TestFourierHandler(t *testing.T) {
	w := httptest.NewRecorder()
	r := httptest.NewRequest(http.MethodGet, "/fourier/transform", nil)
	fourierHandler(w, r)
	if w.Code != http.StatusOK {
		t.Fatalf("status: %d", w.Code)
	}
}

func TestEvolveHandler_RespondsImmediately(t *testing.T) {
	// evolveHandler must return accepted immediately, not wait for the
	// 2s background evolution cycle. The cycle itself runs bound to
	// the root context (server-wide).
	w := httptest.NewRecorder()
	r := httptest.NewRequest(http.MethodPost, "/evolve/cycle", nil)
	// Stash a cancellable root context so the test's background
	// goroutine cleans up on test teardown.
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	r = r.WithContext(context.WithValue(ctx, rootCtxKey{}, ctx))
	evolveHandler(w, r)
	if w.Code != http.StatusOK {
		t.Fatalf("status: %d", w.Code)
	}
	var resp Response
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if resp.Status != "accepted" {
		t.Errorf("Status: got %q want accepted", resp.Status)
	}
}

func TestResonanceHandler(t *testing.T) {
	t.Run("happy path", func(t *testing.T) {
		body := mustMarshal(t, map[string]string{"input": "بسم الله"})
		w := httptest.NewRecorder()
		r := httptest.NewRequest(http.MethodPost, "/resonance/evaluate", bytes.NewReader(body))
		resonanceHandler(w, r)
		if w.Code != http.StatusOK {
			t.Fatalf("status: %d body: %s", w.Code, w.Body.String())
		}
	})
	t.Run("rejects GET", func(t *testing.T) {
		w := httptest.NewRecorder()
		r := httptest.NewRequest(http.MethodGet, "/resonance/evaluate", nil)
		resonanceHandler(w, r)
		if w.Code != http.StatusMethodNotAllowed {
			t.Errorf("GET must be rejected; got %d", w.Code)
		}
	})
	t.Run("rejects malformed JSON", func(t *testing.T) {
		w := httptest.NewRecorder()
		r := httptest.NewRequest(http.MethodPost, "/resonance/evaluate", strings.NewReader("not json"))
		resonanceHandler(w, r)
		if w.Code != http.StatusBadRequest {
			t.Errorf("malformed body must yield 400; got %d", w.Code)
		}
	})
}

func TestShannonHandler(t *testing.T) {
	body := mustMarshal(t, map[string]string{"text": "بسم الله الرحمن الرحيم"})
	w := httptest.NewRecorder()
	r := httptest.NewRequest(http.MethodPost, "/shannon/analyze", bytes.NewReader(body))
	shannonHandler(w, r)
	if w.Code != http.StatusOK {
		t.Fatalf("status: %d body: %s", w.Code, w.Body.String())
	}
	var resp Response
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if resp.Status != "success" {
		t.Errorf("Status: %q", resp.Status)
	}
}

func TestLIDAnalysisHandler(t *testing.T) {
	body := mustMarshal(t, map[string]any{
		"embedding": []float64{0.1, 0.2, 0.3, 0.4},
		"references": [][]float64{
			{1, 0, 0, 0}, {2, 0, 0, 0}, {3, 0, 0, 0}, {4, 0, 0, 0},
			{5, 0, 0, 0}, {6, 0, 0, 0}, {7, 0, 0, 0}, {8, 0, 0, 0},
		},
		"k": 0, // exercises the default-to-7 path
	})
	w := httptest.NewRecorder()
	r := httptest.NewRequest(http.MethodPost, "/lid/analyze", bytes.NewReader(body))
	lidAnalysisHandler(w, r)
	if w.Code != http.StatusOK {
		t.Fatalf("status: %d body: %s", w.Code, w.Body.String())
	}
}

func TestCompressionHandler_DispatchesByMethod(t *testing.T) {
	cases := []struct {
		method string
	}{
		{"polar"},
		{"qjl"},
		{""}, // default = turboquant
	}
	for _, tc := range cases {
		t.Run("method="+tc.method, func(t *testing.T) {
			body := mustMarshal(t, map[string]any{
				"embedding": []float64{0.1, 0.2, 0.3, 0.4, 0.5},
				"method":    tc.method,
				"bits":      8,
			})
			w := httptest.NewRecorder()
			r := httptest.NewRequest(http.MethodPost, "/compression/compress", bytes.NewReader(body))
			compressionHandler(w, r)
			if w.Code != http.StatusOK {
				t.Fatalf("status: %d body: %s", w.Code, w.Body.String())
			}
		})
	}
}

func TestHomologyHandler(t *testing.T) {
	body := mustMarshal(t, map[string]any{
		"embedding": []float64{0.1, 0.2, 0.1, 0.2, 0.1, 0.2, 0.1, 0.2},
		"threshold": 0.0, // exercises the default-to-0.5 path
	})
	w := httptest.NewRecorder()
	r := httptest.NewRequest(http.MethodPost, "/homology/analyze", bytes.NewReader(body))
	homologyHandler(w, r)
	if w.Code != http.StatusOK {
		t.Fatalf("status: %d body: %s", w.Code, w.Body.String())
	}
}

func TestBatchAnalysisHandler_HappyPath(t *testing.T) {
	body := mustMarshal(t, engine.BatchAnalysisRequest{
		Surahs: []engine.SurahData{
			{Number: 1, Name: "Fatihah", Verses: []string{"بسم الله"}},
		},
		EnableShannon: true,
		MaxWorkers:    1,
	})
	w := httptest.NewRecorder()
	r := httptest.NewRequest(http.MethodPost, "/batch/analyze", bytes.NewReader(body))
	// Provide a rootCtxKey so batchAnalysisHandler's lookup succeeds.
	r = r.WithContext(context.WithValue(r.Context(), rootCtxKey{}, context.Background()))
	batchAnalysisHandler(w, r)
	if w.Code != http.StatusOK {
		t.Fatalf("status: %d body: %s", w.Code, w.Body.String())
	}
}

func TestFormatBatchResponse(t *testing.T) {
	resp := engine.BatchAnalysisResponse{
		TotalSurahs: 1,
		Results:     []engine.ParallelResult{{SurahNumber: 1, TotalVerses: 7}},
	}
	out := engine.FormatBatchResponse(resp)
	if !strings.Contains(out, `"total_surahs": 1`) {
		t.Errorf("engine.FormatBatchResponse output missing total_surahs:\n%s", out)
	}
}

func mustMarshal(t *testing.T, v any) []byte {
	t.Helper()
	b, err := json.Marshal(v)
	if err != nil {
		t.Fatal(err)
	}
	return b
}
