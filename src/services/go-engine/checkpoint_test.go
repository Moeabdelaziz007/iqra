// بسم الله الرحمن الرحيم
// Tests for checkpoint serialisation, atomic write, version refusal, and
// context-cancelled batch persisting its state to disk.

package main

import (
	"context"
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestWriteCheckpoint_RoundTrip(t *testing.T) {
	dir := t.TempDir()
	setCheckpointDir(dir)
	t.Cleanup(func() { setCheckpointDir(".generated") })

	want := AgentCheckpoint{
		Request:         BatchAnalysisRequest{EnableShannon: true},
		CompletedSurahs: []int{1, 2, 3},
		PendingSurahs:   []SurahData{{Number: 4, Name: "Nisaa"}},
		PartialResults:  []ParallelResult{{SurahNumber: 1, TotalVerses: 7}},
		Reason:          "test",
	}

	path, err := WriteCheckpoint(want)
	if err != nil {
		t.Fatalf("WriteCheckpoint: %v", err)
	}
	if filepath.Dir(path) != mustAbs(t, dir) {
		t.Errorf("checkpoint written outside expected dir: %s", path)
	}

	got, err := LoadCheckpoint(path)
	if err != nil {
		t.Fatalf("LoadCheckpoint: %v", err)
	}
	if got.Version != CheckpointVersion {
		t.Errorf("Version: got %d want %d", got.Version, CheckpointVersion)
	}
	if got.CompletedSurahs[0] != 1 || got.PendingSurahs[0].Number != 4 {
		t.Errorf("payload not round-tripped: %+v", got)
	}
	if got.EngineVersion == "" {
		t.Error("EngineVersion must be populated on write")
	}
	if got.WrittenAt.IsZero() {
		t.Error("WrittenAt must be populated on write")
	}
}

func TestLoadCheckpoint_RefusesFutureVersion(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "future.json")
	body, _ := json.Marshal(AgentCheckpoint{Version: CheckpointVersion + 1})
	if err := os.WriteFile(path, body, 0o644); err != nil {
		t.Fatal(err)
	}
	_, err := LoadCheckpoint(path)
	if err == nil {
		t.Fatal("must refuse to load a future-version checkpoint")
	}
	if !strings.Contains(err.Error(), "refusing to load") {
		t.Errorf("error must explain the refusal: %v", err)
	}
}

func TestWriteCheckpoint_Atomic(t *testing.T) {
	// The atomic-write contract is that no .tmp file is left behind on
	// the happy path. This protects callers from accidentally picking
	// up a half-written checkpoint as a real one.
	dir := t.TempDir()
	setCheckpointDir(dir)
	t.Cleanup(func() { setCheckpointDir(".generated") })

	_, err := WriteCheckpoint(AgentCheckpoint{Reason: "atomic"})
	if err != nil {
		t.Fatal(err)
	}
	entries, _ := os.ReadDir(dir)
	for _, e := range entries {
		if strings.HasSuffix(e.Name(), ".tmp") {
			t.Errorf("tmp file leaked: %s", e.Name())
		}
	}
}

func TestProcessBatchParallelContext_WritesCheckpointOnCancel(t *testing.T) {
	dir := t.TempDir()
	setCheckpointDir(dir)
	t.Cleanup(func() { setCheckpointDir(".generated") })

	surahs := make([]SurahData, 50)
	for i := range surahs {
		surahs[i] = SurahData{
			Number: i + 1,
			Name:   "test",
			Verses: []string{"verse"},
		}
	}
	req := BatchAnalysisRequest{
		Surahs:        surahs,
		EnableShannon: true,
		MaxWorkers:    1,
	}

	// Cancel BEFORE invoking the engine. With a pre-cancelled context,
	// the dispatcher loop exits on its first select and the workers
	// never pick up any surah, guaranteeing the checkpoint path is
	// exercised deterministically across machines.
	ctx, cancel := context.WithCancel(context.Background())
	cancel()

	resp := ProcessBatchParallelContext(ctx, req)
	if resp.ProcessedSurahs >= len(surahs) {
		t.Fatalf("pre-cancelled batch must not process all surahs; processed %d", resp.ProcessedSurahs)
	}

	entries, _ := os.ReadDir(dir)
	var cpFile string
	for _, e := range entries {
		if strings.HasPrefix(e.Name(), "agent-checkpoint-") && strings.HasSuffix(e.Name(), ".json") {
			cpFile = filepath.Join(dir, e.Name())
		}
	}
	if cpFile == "" {
		t.Fatalf("no checkpoint file written; dir contents: %v", entries)
	}

	got, err := LoadCheckpoint(cpFile)
	if err != nil {
		t.Fatalf("load: %v", err)
	}
	if len(got.PendingSurahs)+len(got.CompletedSurahs) != len(surahs) {
		t.Errorf("checkpoint accounting wrong: %d completed + %d pending != %d total",
			len(got.CompletedSurahs), len(got.PendingSurahs), len(surahs))
	}
	if !strings.Contains(got.Reason, "context cancelled") {
		t.Errorf("Reason should explain cancellation: %q", got.Reason)
	}
}

func TestProcessBatchParallelContext_NoCheckpointOnCleanRun(t *testing.T) {
	// A successful batch with a live context must NOT write a checkpoint.
	dir := t.TempDir()
	setCheckpointDir(dir)
	t.Cleanup(func() { setCheckpointDir(".generated") })

	req := BatchAnalysisRequest{
		Surahs: []SurahData{
			{Number: 1, Name: "a", Verses: []string{"x"}},
			{Number: 2, Name: "b", Verses: []string{"y"}},
		},
		EnableShannon: true,
		MaxWorkers:    2,
	}
	resp := ProcessBatchParallelContext(context.Background(), req)
	if resp.ProcessedSurahs != 2 {
		t.Fatalf("expected 2 processed, got %d", resp.ProcessedSurahs)
	}

	entries, _ := os.ReadDir(dir)
	for _, e := range entries {
		if strings.HasPrefix(e.Name(), "agent-checkpoint-") {
			t.Errorf("checkpoint must not be written on clean run; found %s", e.Name())
		}
	}
}

func TestAggregateResumedResults(t *testing.T) {
	partial := []ParallelResult{{SurahNumber: 1}, {SurahNumber: 2}}
	fresh := []ParallelResult{{SurahNumber: 3}, {SurahNumber: 4}}
	combined := AggregateResumedResults(partial, fresh)
	if len(combined) != 4 {
		t.Fatalf("length: got %d want 4", len(combined))
	}
	for i, want := range []int{1, 2, 3, 4} {
		if combined[i].SurahNumber != want {
			t.Errorf("position %d: got %d want %d", i, combined[i].SurahNumber, want)
		}
	}
}

func mustAbs(t *testing.T, p string) string {
	t.Helper()
	abs, err := filepath.Abs(p)
	if err != nil {
		t.Fatal(err)
	}
	return abs
}
