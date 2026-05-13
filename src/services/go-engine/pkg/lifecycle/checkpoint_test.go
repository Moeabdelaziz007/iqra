package lifecycle

import (
	"encoding/json"
	"errors"
	"io/fs"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

// withTempCheckpointDir points IQRA_CHECKPOINT_DIR at a fresh tmpdir for the
// duration of the test and restores the previous value afterwards. Tests run
// in parallel by default in Go, so we must avoid leaking env state between
// subtests by always restoring in a t.Cleanup.
func withTempCheckpointDir(t *testing.T) string {
	t.Helper()
	dir := t.TempDir()
	prev, hadPrev := os.LookupEnv("IQRA_CHECKPOINT_DIR")
	if err := os.Setenv("IQRA_CHECKPOINT_DIR", dir); err != nil {
		t.Fatalf("set env: %v", err)
	}
	t.Cleanup(func() {
		if hadPrev {
			os.Setenv("IQRA_CHECKPOINT_DIR", prev)
		} else {
			os.Unsetenv("IQRA_CHECKPOINT_DIR")
		}
	})
	return dir
}

func TestNewJobIDIsUniqueAndPatternValid(t *testing.T) {
	seen := make(map[string]struct{}, 64)
	for i := 0; i < 64; i++ {
		id := NewJobID()
		if !jobIDPattern.MatchString(id) {
			t.Fatalf("NewJobID returned malformed id: %q", id)
		}
		if _, dup := seen[id]; dup {
			t.Fatalf("NewJobID produced duplicate: %q", id)
		}
		seen[id] = struct{}{}
	}
}

func TestSaveAndLoadRoundTrip(t *testing.T) {
	withTempCheckpointDir(t)

	cp := &Checkpoint{
		JobID:              NewJobID(),
		StartedAt:          time.Now().UTC().Truncate(time.Millisecond),
		TotalItems:         16,
		LastProcessedIndex: 8,
		RequestRaw:         json.RawMessage(`{"surahs":[]}`),
		ResultsRaw:         json.RawMessage(`[]`),
		Reason:             "progress",
	}
	if err := Save(cp); err != nil {
		t.Fatalf("Save: %v", err)
	}

	loaded, err := Load(cp.JobID)
	if err != nil {
		t.Fatalf("Load: %v", err)
	}
	if loaded.JobID != cp.JobID {
		t.Errorf("JobID mismatch: got %q want %q", loaded.JobID, cp.JobID)
	}
	if loaded.TotalItems != 16 || loaded.LastProcessedIndex != 8 {
		t.Errorf("indices wrong: %+v", loaded)
	}
	if loaded.Version != CheckpointVersion {
		t.Errorf("version mismatch: got %d want %d", loaded.Version, CheckpointVersion)
	}
	if loaded.Reason != "progress" {
		t.Errorf("reason mismatch: got %q", loaded.Reason)
	}
}

func TestSaveAtomicAcrossCrashes(t *testing.T) {
	dir := withTempCheckpointDir(t)

	cp := &Checkpoint{
		JobID:              NewJobID(),
		StartedAt:          time.Now().UTC(),
		TotalItems:         4,
		LastProcessedIndex: 1,
		RequestRaw:         json.RawMessage(`{}`),
		ResultsRaw:         json.RawMessage(`[]`),
	}
	if err := Save(cp); err != nil {
		t.Fatalf("first save: %v", err)
	}

	// Plant a sibling temp file that mimics an interrupted Save. The next
	// Save must not pick it up nor remove it (it's left for human cleanup).
	planted := filepath.Join(dir, ".cp-leftover.tmp")
	if err := os.WriteFile(planted, []byte("partial"), 0o600); err != nil {
		t.Fatalf("plant: %v", err)
	}

	cp.LastProcessedIndex = 3
	if err := Save(cp); err != nil {
		t.Fatalf("second save: %v", err)
	}

	// Final file must reflect the second save, not the planted temp.
	loaded, err := Load(cp.JobID)
	if err != nil {
		t.Fatalf("Load: %v", err)
	}
	if loaded.LastProcessedIndex != 3 {
		t.Errorf("expected index 3, got %d", loaded.LastProcessedIndex)
	}

	// The planted leftover is still on disk; List ignores it because the
	// name does not match the jobIDPattern.
	ids, err := List()
	if err != nil {
		t.Fatalf("List: %v", err)
	}
	if len(ids) != 1 || ids[0] != cp.JobID {
		t.Errorf("List returned %v, expected [%s]", ids, cp.JobID)
	}
}

func TestLoadRejectsPathTraversal(t *testing.T) {
	withTempCheckpointDir(t)

	for _, bad := range []string{
		"../etc/passwd",
		"/absolute/path",
		"contains spaces",
		"contains/slash",
		"",
		"42-WAYTOOLONG-and-not-hex",
	} {
		t.Run("id="+bad, func(t *testing.T) {
			if _, err := Load(bad); err == nil {
				t.Fatalf("Load(%q) should have rejected invalid id", bad)
			}
		})
	}
}

func TestDeleteIsIdempotent(t *testing.T) {
	withTempCheckpointDir(t)
	jobID := NewJobID()
	if err := Delete(jobID); err != nil {
		t.Fatalf("first Delete on missing file should be nil, got %v", err)
	}
	cp := &Checkpoint{JobID: jobID, TotalItems: 1, RequestRaw: json.RawMessage(`{}`), ResultsRaw: json.RawMessage(`[]`)}
	if err := Save(cp); err != nil {
		t.Fatalf("Save: %v", err)
	}
	if err := Delete(jobID); err != nil {
		t.Fatalf("second Delete on existing file: %v", err)
	}
	if _, err := Load(jobID); !errors.Is(err, fs.ErrNotExist) {
		t.Errorf("expected ErrNotExist after Delete, got %v", err)
	}
}

func TestListReturnsSortedByTimestampPrefix(t *testing.T) {
	withTempCheckpointDir(t)

	// Craft three deterministic IDs whose timestamp prefixes are 100/200/300
	// so we know their sort order regardless of NewJobID's freshness.
	ids := []string{
		"100-aaaaaaaaaaaaaaaa",
		"200-bbbbbbbbbbbbbbbb",
		"300-cccccccccccccccc",
	}
	// Save in non-sorted order to make sure List re-sorts.
	for _, id := range []string{ids[2], ids[0], ids[1]} {
		cp := &Checkpoint{JobID: id, TotalItems: 1, RequestRaw: json.RawMessage(`{}`), ResultsRaw: json.RawMessage(`[]`)}
		if err := Save(cp); err != nil {
			t.Fatalf("Save %s: %v", id, err)
		}
	}

	got, err := List()
	if err != nil {
		t.Fatalf("List: %v", err)
	}
	if len(got) != 3 {
		t.Fatalf("expected 3 ids, got %d (%v)", len(got), got)
	}
	for i, want := range ids {
		if got[i] != want {
			t.Errorf("position %d: got %q want %q", i, got[i], want)
		}
	}
}

func TestDefaultDirHonorsEnvAndXDG(t *testing.T) {
	// Cleanup any state set by other subtests by snapshotting all three vars.
	for _, k := range []string{"IQRA_CHECKPOINT_DIR", "XDG_DATA_HOME", "HOME"} {
		prev, had := os.LookupEnv(k)
		t.Cleanup(func() {
			if had {
				os.Setenv(k, prev)
			} else {
				os.Unsetenv(k)
			}
		})
	}

	t.Run("env_wins_over_xdg", func(t *testing.T) {
		os.Setenv("IQRA_CHECKPOINT_DIR", "/explicit/iqra")
		os.Setenv("XDG_DATA_HOME", "/xdg/share")
		got := DefaultDir()
		if got != "/explicit/iqra" {
			t.Errorf("env should win: got %q", got)
		}
	})

	t.Run("xdg_wins_over_home", func(t *testing.T) {
		os.Unsetenv("IQRA_CHECKPOINT_DIR")
		os.Setenv("XDG_DATA_HOME", "/xdg/share")
		os.Setenv("HOME", "/home/x")
		got := DefaultDir()
		want := filepath.Join("/xdg/share", "iqra", "checkpoints")
		if got != want {
			t.Errorf("xdg should win: got %q want %q", got, want)
		}
	})

	t.Run("home_fallback", func(t *testing.T) {
		os.Unsetenv("IQRA_CHECKPOINT_DIR")
		os.Unsetenv("XDG_DATA_HOME")
		os.Setenv("HOME", "/home/x")
		got := DefaultDir()
		want := filepath.Join("/home/x", ".iqra", "checkpoints")
		if got != want {
			t.Errorf("home fallback: got %q want %q", got, want)
		}
	})
}

func TestSaveCreatesDirWithStrictPermissions(t *testing.T) {
	dir := withTempCheckpointDir(t)
	// Remove the tempdir so Save has to create it.
	if err := os.RemoveAll(dir); err != nil {
		t.Fatalf("rm tempdir: %v", err)
	}

	cp := &Checkpoint{JobID: NewJobID(), TotalItems: 1, RequestRaw: json.RawMessage(`{}`), ResultsRaw: json.RawMessage(`[]`)}
	if err := Save(cp); err != nil {
		t.Fatalf("Save: %v", err)
	}
	info, err := os.Stat(dir)
	if err != nil {
		t.Fatalf("stat: %v", err)
	}
	if !info.IsDir() {
		t.Fatal("expected directory")
	}
	// On platforms where 0700 is honored (linux, darwin) check the bits.
	if mode := info.Mode().Perm(); mode != 0o700 {
		// Some sandboxes (CI tmpfs) may relax permissions; assert at most
		// 0700 rather than exactly 0700 to keep the test portable while
		// still catching world-readable regressions.
		if mode&0o077 != 0 {
			t.Errorf("checkpoint dir should not be readable by others: mode=%o", mode)
		}
	}

	// Confirm at least one .json checkpoint file exists in the new dir.
	entries, err := os.ReadDir(dir)
	if err != nil {
		t.Fatalf("readdir: %v", err)
	}
	var found bool
	for _, e := range entries {
		if strings.HasSuffix(e.Name(), ".json") {
			found = true
			break
		}
	}
	if !found {
		t.Errorf("no checkpoint .json written to %s", dir)
	}
}
