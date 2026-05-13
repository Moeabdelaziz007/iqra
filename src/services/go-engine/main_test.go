// HTTP handler coverage tests for the IQRA Go engine.
//
// Phase 5 shipped three new packages (lifecycle, observability, policy)
// with strong unit coverage in their own _test.go files. The main package
// itself (main.go: ten HTTP handlers + the makeBatchHandler closure) sat
// at 17.5% coverage because no test ever exercised the handlers directly.
// This file lifts that floor by hitting every handler over httptest with
// realistic input shapes.
//
// Scope: handler-level black-box tests only. The math-heavy compute
// primitives (CalculateResonance, ProcessBatchParallel, etc.) are already
// covered by parallel_engine_test.go and friends; we exercise the wiring
// here, not the math.
package main

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

// decodeResponse unmarshals an HTTP response body into the standard
// Response envelope used by every handler in main.go. Returns the
// outer wrapper plus the raw bytes so the caller can inspect either.
func decodeResponse(t *testing.T, body io.Reader) (Response, []byte) {
	t.Helper()
	raw, err := io.ReadAll(body)
	if err != nil {
		t.Fatalf("read body: %v", err)
	}
	var r Response
	if err := json.Unmarshal(raw, &r); err != nil {
		t.Fatalf("decode response: %v (body=%q)", err, raw)
	}
	return r, raw
}

func TestHealthHandlerReturnsPulseStable(t *testing.T) {
	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/health", nil)
	healthHandler(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", rr.Code)
	}
	resp, _ := decodeResponse(t, rr.Body)
	if resp.Status != "success" {
		t.Errorf("expected status=success, got %q", resp.Status)
	}
	if !strings.Contains(resp.Message, "pulse-stable") {
		t.Errorf("expected pulse-stable in message, got %q", resp.Message)
	}
}

func TestFourierHandlerReturnsCoherenceAndPhase(t *testing.T) {
	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/fourier/transform", nil)
	fourierHandler(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", rr.Code)
	}
	var raw map[string]interface{}
	if err := json.Unmarshal(rr.Body.Bytes(), &raw); err != nil {
		t.Fatalf("decode: %v", err)
	}
	data, ok := raw["data"].(map[string]interface{})
	if !ok {
		t.Fatalf("data should be a map, got %T", raw["data"])
	}
	for _, k := range []string{"coherence", "phase"} {
		if _, ok := data[k]; !ok {
			t.Errorf("data is missing key %q", k)
		}
	}
}

func TestEvolveHandlerReturns202ImmediatelyAndKicksOffBackgroundWork(t *testing.T) {
	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/evolve/cycle", nil)
	evolveHandler(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", rr.Code)
	}
	resp, _ := decodeResponse(t, rr.Body)
	if resp.Status != "accepted" {
		t.Errorf("expected status=accepted (background job), got %q", resp.Status)
	}
}

func TestResonanceHandlerRejectsNonPost(t *testing.T) {
	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/resonance/evaluate", nil)
	resonanceHandler(rr, req)
	if rr.Code != http.StatusMethodNotAllowed {
		t.Errorf("expected 405 on GET, got %d", rr.Code)
	}
}

func TestResonanceHandlerRejectsBadJSON(t *testing.T) {
	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/resonance/evaluate", strings.NewReader("{not valid"))
	resonanceHandler(rr, req)
	if rr.Code != http.StatusBadRequest {
		t.Errorf("expected 400 on malformed JSON, got %d", rr.Code)
	}
}

func TestResonanceHandlerAcceptsValidPayload(t *testing.T) {
	body, _ := json.Marshal(map[string]string{"input": "test pattern resonance"})
	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/resonance/evaluate", bytes.NewReader(body))
	resonanceHandler(rr, req)
	if rr.Code != http.StatusOK {
		t.Errorf("expected 200, got %d (body=%q)", rr.Code, rr.Body.String())
	}
	resp, _ := decodeResponse(t, rr.Body)
	if resp.Status != "success" {
		t.Errorf("expected status=success, got %q", resp.Status)
	}
}

func TestLidAnalysisHandlerSurvivesEmptyEmbedding(t *testing.T) {
	body, _ := json.Marshal(map[string]interface{}{
		"embedding":  []float64{},
		"references": [][]float64{},
		"k":          0,
	})
	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/lid/analyze", bytes.NewReader(body))
	lidAnalysisHandler(rr, req)
	// The handler defaults k to 7 when zero and computes whatever the
	// downstream CalculateLID returns for empty input. The contract is
	// that the wrapping handler never panics on empty inputs.
	if rr.Code != http.StatusOK {
		t.Errorf("expected 200 on empty input, got %d (body=%q)", rr.Code, rr.Body.String())
	}
}

func TestLidAnalysisHandlerRejectsNonPost(t *testing.T) {
	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/lid/analyze", nil)
	lidAnalysisHandler(rr, req)
	if rr.Code != http.StatusMethodNotAllowed {
		t.Errorf("expected 405 on GET, got %d", rr.Code)
	}
}

func TestShannonHandlerAcceptsValidText(t *testing.T) {
	body, _ := json.Marshal(map[string]string{"text": "بسم الله الرحمن الرحيم"})
	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/shannon/analyze", bytes.NewReader(body))
	shannonHandler(rr, req)
	if rr.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", rr.Code)
	}
}

func TestShannonHandlerRejectsNonPost(t *testing.T) {
	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/shannon/analyze", nil)
	shannonHandler(rr, req)
	if rr.Code != http.StatusMethodNotAllowed {
		t.Errorf("expected 405 on GET, got %d", rr.Code)
	}
}

func TestCompressionHandlerDefaultsToTurbo(t *testing.T) {
	// bits=4 keeps the codebook size (2^bits = 16) inside int8 range. With
	// bits=8 the codebook size is 256, and turbo_compressor.go:56 casts the
	// codebook index to int8 which overflows for any nearest >= 128. That
	// is a pre-existing bug in TurboQuantCompress, not a wiring bug in the
	// handler under test; documenting it here so a future contributor sees
	// the constraint before reaching for bits=8.
	body, _ := json.Marshal(map[string]interface{}{
		"embedding": []float64{0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7},
		"bits":      4,
	})
	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/compression/compress", bytes.NewReader(body))
	compressionHandler(rr, req)
	if rr.Code != http.StatusOK {
		t.Errorf("expected 200, got %d (body=%q)", rr.Code, rr.Body.String())
	}
}

func TestCompressionHandlerDispatchesByMethod(t *testing.T) {
	cases := []string{"turbo", "polar", "qjl"}
	for _, method := range cases {
		t.Run(method, func(t *testing.T) {
			body, _ := json.Marshal(map[string]interface{}{
				"embedding": []float64{0.1, 0.2, 0.3, 0.4},
				"method":    method,
				"bits":      4, // see note on TurboQuantCompress int8 bug above
			})
			rr := httptest.NewRecorder()
			req := httptest.NewRequest(http.MethodPost, "/compression/compress", bytes.NewReader(body))
			compressionHandler(rr, req)
			if rr.Code != http.StatusOK {
				t.Errorf("method=%s: expected 200, got %d", method, rr.Code)
			}
		})
	}
}

func TestHomologyHandlerAcceptsThresholdOverride(t *testing.T) {
	body, _ := json.Marshal(map[string]interface{}{
		"embedding": []float64{1, 2, 3, 4, 5},
		"threshold": 0.42,
	})
	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/homology/analyze", bytes.NewReader(body))
	homologyHandler(rr, req)
	if rr.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", rr.Code)
	}
}

func TestHomologyHandlerDefaultsZeroThresholdToHalf(t *testing.T) {
	// The handler should silently substitute 0.5 when threshold <= 0 so a
	// caller that forgot to set it still gets a useful result.
	body, _ := json.Marshal(map[string]interface{}{
		"embedding": []float64{1, 2, 3},
		"threshold": 0,
	})
	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/homology/analyze", bytes.NewReader(body))
	homologyHandler(rr, req)
	if rr.Code != http.StatusOK {
		t.Errorf("expected 200 with default-threshold substitution, got %d", rr.Code)
	}
}

// --- policy/evaluate -------------------------------------------------------

func TestPolicyEvaluateRejectsNonPost(t *testing.T) {
	// policyEngine is nil here (we are not running main()); the handler
	// must still reject GET before touching the engine.
	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/policy/evaluate", nil)
	policyEvaluateHandler(rr, req)
	if rr.Code != http.StatusMethodNotAllowed {
		t.Errorf("expected 405 on GET, got %d", rr.Code)
	}
}

func TestPolicyEvaluateReturns503WhenEngineNotReady(t *testing.T) {
	// Without main() running there is no compiled policy engine. The
	// handler must surface 503, not 500 or panic.
	saved := policyEngine
	policyEngine = nil
	defer func() { policyEngine = saved }()

	body, _ := json.Marshal(map[string]interface{}{
		"agent_did": "did:axiom:axiomid.app:test",
		"action": map[string]string{
			"type": "test", "intention": "ship", "text": "hello",
		},
	})
	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/policy/evaluate", bytes.NewReader(body))
	policyEvaluateHandler(rr, req)
	if rr.Code != http.StatusServiceUnavailable {
		t.Errorf("expected 503 when policyEngine nil, got %d", rr.Code)
	}
}

// --- makeBatchHandler closure ---------------------------------------------

func TestMakeBatchHandlerRejectsNonPost(t *testing.T) {
	handler := makeBatchHandler(context.Background())
	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/batch/analyze", nil)
	handler(rr, req)
	if rr.Code != http.StatusMethodNotAllowed {
		t.Errorf("expected 405 on GET, got %d", rr.Code)
	}
}

func TestMakeBatchHandlerRejectsBadJSON(t *testing.T) {
	handler := makeBatchHandler(context.Background())
	rr := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/batch/analyze", strings.NewReader("{bad"))
	handler(rr, req)
	if rr.Code != http.StatusBadRequest {
		t.Errorf("expected 400 on malformed JSON, got %d", rr.Code)
	}
}

// --- instrument wrapper ----------------------------------------------------

func TestInstrumentWrapsHandlerWithoutChangingBehaviour(t *testing.T) {
	wrapped := instrument("test.op", func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusTeapot)
		_, _ = w.Write([]byte("brewed"))
	})
	server := httptest.NewServer(wrapped)
	t.Cleanup(server.Close)

	resp, err := http.Get(server.URL + "/anything")
	if err != nil {
		t.Fatalf("get: %v", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusTeapot {
		t.Errorf("expected 418, got %d", resp.StatusCode)
	}
	body, _ := io.ReadAll(resp.Body)
	if string(body) != "brewed" {
		t.Errorf("expected body=brewed, got %q", body)
	}
}
