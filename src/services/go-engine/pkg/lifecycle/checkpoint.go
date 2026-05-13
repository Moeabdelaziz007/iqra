// Package lifecycle provides graceful-shutdown primitives for the IQRA Go
// engine. Phase 5b H3 ships the checkpoint store: a JSON-on-disk record of
// in-flight batch jobs that lets a SIGINT-interrupted run be resumed via
// the --resume-from CLI flag without losing the partial results already
// computed.
//
// The on-disk shape is intentionally human-readable so operators can grep
// it during incident response. JobIDs combine a Unix-second timestamp with
// eight bytes of cryptographic randomness, giving both monotonic ordering
// in `ls` and collision resistance under burst load.
//
// Default storage location:
//
//	$IQRA_CHECKPOINT_DIR        (if set)
//	${XDG_DATA_HOME}/iqra/...   (if XDG_DATA_HOME set)
//	$HOME/.iqra/checkpoints     (fallback)
//
// Phase 5b H3 stays filesystem-only. The Vercel-compatible cloud backend
// (R2 / Vercel Blob / S3) lives in a follow-up because it requires a
// separate access-credential rollout. The Checkpoint shape is forward
// compatible: a future backend can satisfy the same Save/Load/Delete/List
// contract without touching the batch engine.
package lifecycle

import (
	"crypto/rand"
	"encoding/json"
	"errors"
	"fmt"
	"io/fs"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strings"
	"time"
)

// CheckpointVersion is bumped when the on-disk Checkpoint schema changes in
// a way that makes older files unreadable. Today there is only v1.
const CheckpointVersion = 1

// Checkpoint captures the progress of a single batch job. It is the only
// type written to disk; readers MUST tolerate unknown fields (json package
// already does this via struct tags) so future producers can extend the
// shape without breaking older consumers.
type Checkpoint struct {
	Version            int       `json:"version"`
	JobID              string    `json:"job_id"`
	StartedAt          time.Time `json:"started_at"`
	UpdatedAt          time.Time `json:"updated_at"`
	TotalItems         int       `json:"total_items"`
	LastProcessedIndex int       `json:"last_processed_index"`
	// RequestRaw is the original request payload as raw JSON so the checkpoint
	// is self-describing on resume without coupling lifecycle/ to the engine
	// types. The batch package marshals BatchAnalysisRequest into RequestRaw
	// at job-start and unmarshals back on resume.
	RequestRaw json.RawMessage `json:"request_raw"`
	// ResultsRaw holds the accumulated per-chunk results, same self-describing
	// rationale as RequestRaw.
	ResultsRaw json.RawMessage `json:"results_raw"`
	// Reason records why the checkpoint was saved (`progress`, `shutdown`,
	// `error`). Useful when triaging stale checkpoints.
	Reason string `json:"reason,omitempty"`
}

// jobIDPattern guards Load/Delete against path traversal. Job IDs are
// "<unix-seconds>-<16-hex-chars>", strict ASCII, no slashes.
var jobIDPattern = regexp.MustCompile(`^[0-9]+-[0-9a-f]{16}$`)

// NewJobID returns a fresh job identifier. Format: "<unix-seconds>-<16 hex>".
// The leading timestamp makes `ls -1` ordering chronological, the trailing
// random suffix prevents collisions under burst load.
func NewJobID() string {
	var b [8]byte
	if _, err := rand.Read(b[:]); err != nil {
		// crypto/rand failure is exceptional; fall back to a still-unique-ish
		// nano-time encoding so the engine never panics on shutdown path.
		return fmt.Sprintf("%d-%016x", time.Now().Unix(), time.Now().UnixNano())
	}
	return fmt.Sprintf("%d-%x", time.Now().Unix(), b[:])
}

// DefaultDir returns the directory where checkpoints are stored. It honors
// IQRA_CHECKPOINT_DIR, then XDG_DATA_HOME, then $HOME/.iqra/checkpoints.
func DefaultDir() string {
	if dir := os.Getenv("IQRA_CHECKPOINT_DIR"); dir != "" {
		return dir
	}
	if xdg := os.Getenv("XDG_DATA_HOME"); xdg != "" {
		return filepath.Join(xdg, "iqra", "checkpoints")
	}
	home, err := os.UserHomeDir()
	if err != nil || home == "" {
		return filepath.Join(os.TempDir(), "iqra-checkpoints")
	}
	return filepath.Join(home, ".iqra", "checkpoints")
}

// ensureDir creates the checkpoint directory if it does not exist, with
// permissions tight enough that other users on the same host cannot read
// the partial results.
func ensureDir(dir string) error {
	return os.MkdirAll(dir, 0o700)
}

// Path returns the on-disk path for a given job ID under the given root.
// It rejects malformed job IDs to defeat path traversal.
func Path(dir, jobID string) (string, error) {
	if !jobIDPattern.MatchString(jobID) {
		return "", fmt.Errorf("lifecycle: invalid job id %q", jobID)
	}
	return filepath.Join(dir, jobID+".json"), nil
}

// Save writes the checkpoint atomically: it serializes to a temp file in
// the same directory, fsyncs, then renames over the target. Crash mid-write
// leaves the previous checkpoint intact rather than truncating it.
func Save(cp *Checkpoint) error {
	if cp == nil {
		return errors.New("lifecycle: nil checkpoint")
	}
	if cp.JobID == "" {
		return errors.New("lifecycle: checkpoint missing job id")
	}
	if cp.Version == 0 {
		cp.Version = CheckpointVersion
	}
	if cp.UpdatedAt.IsZero() {
		cp.UpdatedAt = time.Now().UTC()
	}

	dir := DefaultDir()
	if err := ensureDir(dir); err != nil {
		return fmt.Errorf("lifecycle: ensure dir: %w", err)
	}
	path, err := Path(dir, cp.JobID)
	if err != nil {
		return err
	}

	data, err := json.MarshalIndent(cp, "", "  ")
	if err != nil {
		return fmt.Errorf("lifecycle: marshal: %w", err)
	}

	tmp, err := os.CreateTemp(dir, ".cp-*.tmp")
	if err != nil {
		return fmt.Errorf("lifecycle: temp file: %w", err)
	}
	tmpPath := tmp.Name()
	defer os.Remove(tmpPath) // safe even after successful rename

	if _, err := tmp.Write(data); err != nil {
		tmp.Close()
		return fmt.Errorf("lifecycle: write temp: %w", err)
	}
	if err := tmp.Sync(); err != nil {
		tmp.Close()
		return fmt.Errorf("lifecycle: sync temp: %w", err)
	}
	if err := tmp.Close(); err != nil {
		return fmt.Errorf("lifecycle: close temp: %w", err)
	}
	if err := os.Rename(tmpPath, path); err != nil {
		return fmt.Errorf("lifecycle: rename: %w", err)
	}
	return nil
}

// Load reads a checkpoint by job ID. Returns os.ErrNotExist when no such
// checkpoint exists, wrapped so callers can use errors.Is.
func Load(jobID string) (*Checkpoint, error) {
	dir := DefaultDir()
	path, err := Path(dir, jobID)
	if err != nil {
		return nil, err
	}
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}
	var cp Checkpoint
	if err := json.Unmarshal(data, &cp); err != nil {
		return nil, fmt.Errorf("lifecycle: unmarshal %s: %w", path, err)
	}
	if cp.Version != CheckpointVersion {
		return nil, fmt.Errorf("lifecycle: checkpoint version %d not supported (expected %d)", cp.Version, CheckpointVersion)
	}
	return &cp, nil
}

// Delete removes a checkpoint by job ID. Returns nil if the file is already
// gone; that is the desired idempotent behaviour for the "job completed"
// cleanup path.
func Delete(jobID string) error {
	dir := DefaultDir()
	path, err := Path(dir, jobID)
	if err != nil {
		return err
	}
	if err := os.Remove(path); err != nil && !errors.Is(err, fs.ErrNotExist) {
		return fmt.Errorf("lifecycle: remove %s: %w", path, err)
	}
	return nil
}

// List returns the job IDs of all checkpoints currently on disk, sorted by
// timestamp ascending (the natural prefix order of the IDs).
func List() ([]string, error) {
	dir := DefaultDir()
	entries, err := os.ReadDir(dir)
	if err != nil {
		if errors.Is(err, fs.ErrNotExist) {
			return nil, nil
		}
		return nil, fmt.Errorf("lifecycle: read dir: %w", err)
	}
	out := make([]string, 0, len(entries))
	for _, e := range entries {
		name := e.Name()
		if !strings.HasSuffix(name, ".json") {
			continue
		}
		id := strings.TrimSuffix(name, ".json")
		if jobIDPattern.MatchString(id) {
			out = append(out, id)
		}
	}
	sort.Strings(out)
	return out, nil
}
