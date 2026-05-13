// بسم الله الرحمن الرحيم
// Checkpoint format and persistence for in-flight batch jobs.
//
// The AIX vision: "if the platform disappears, the agent does not disappear
// with it". When the engine receives SIGTERM mid-batch, we serialise the
// completed surahs + the still-pending surahs to a single JSON file. A
// subsequent process launched with `--resume-from=path/to/checkpoint.json`
// replays the pending surahs against the same request configuration.
//
// The format is deliberately the simplest workable thing — a single JSON
// document, not an AIX manifest. Promotion to the AIX manifest schema is
// tracked under #H8 (cross-repo bridge), which is where the signature
// layer also lives.

package engine

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sync"
	"time"
)

// CheckpointVersion is bumped whenever the on-disk shape changes in a way
// that older binaries cannot read. Resume() refuses to replay a checkpoint
// whose version it does not understand.
const CheckpointVersion = 1

// AgentCheckpoint is the on-disk representation of a paused batch. It
// captures everything needed to resume the run on another host without
// re-deriving any analysis already completed.
type AgentCheckpoint struct {
	Version         int                  `json:"version"`
	WrittenAt       time.Time            `json:"written_at"`
	EngineVersion   string               `json:"engine_version"`
	Request         BatchAnalysisRequest `json:"request"`
	CompletedSurahs []int                `json:"completed_surahs"`
	PendingSurahs   []SurahData          `json:"pending_surahs"`
	PartialResults  []ParallelResult     `json:"partial_results"`
	Reason          string               `json:"reason,omitempty"`
}

var (
	checkpointDirMu sync.RWMutex
	checkpointDir   = ".generated"
)

// setCheckpointDir is called from main() once per process start.
func SetCheckpointDir(dir string) {
	checkpointDirMu.Lock()
	defer checkpointDirMu.Unlock()
	if dir != "" {
		checkpointDir = dir
	}
}

// getCheckpointDir is goroutine-safe for read-mostly access from
// background batch goroutines that need to write a checkpoint.
func getCheckpointDir() string {
	checkpointDirMu.RLock()
	defer checkpointDirMu.RUnlock()
	return checkpointDir
}

// WriteCheckpoint serialises a paused batch to disk. The file is written
// atomically (tmp + rename) so a partial write cannot corrupt an earlier
// checkpoint. Returns the absolute path of the written file.
func WriteCheckpoint(c AgentCheckpoint) (string, error) {
	c.Version = CheckpointVersion
	if c.WrittenAt.IsZero() {
		c.WrittenAt = time.Now().UTC()
	}
	if c.EngineVersion == "" {
		c.EngineVersion = "iqra-go-engine/0.2.0"
	}

	dir := getCheckpointDir()
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return "", fmt.Errorf("create checkpoint dir: %w", err)
	}

	body, err := json.MarshalIndent(c, "", "  ")
	if err != nil {
		return "", fmt.Errorf("marshal checkpoint: %w", err)
	}

	fname := fmt.Sprintf("agent-checkpoint-%s.json", c.WrittenAt.Format("20060102T150405Z"))
	final := filepath.Join(dir, fname)
	tmp := final + ".tmp"

	if err := os.WriteFile(tmp, body, 0o644); err != nil {
		return "", fmt.Errorf("write tmp checkpoint: %w", err)
	}
	if err := os.Rename(tmp, final); err != nil {
		_ = os.Remove(tmp)
		return "", fmt.Errorf("atomic rename checkpoint: %w", err)
	}

	return filepath.Abs(final)
}

// LoadCheckpoint reads a previously-written checkpoint from disk. Returns
// an error if the on-disk version is newer than CheckpointVersion (we
// refuse to silently lose information from a future engine release).
func LoadCheckpoint(path string) (AgentCheckpoint, error) {
	var c AgentCheckpoint
	body, err := os.ReadFile(path)
	if err != nil {
		return c, fmt.Errorf("read checkpoint: %w", err)
	}
	if err := json.Unmarshal(body, &c); err != nil {
		return c, fmt.Errorf("parse checkpoint: %w", err)
	}
	if c.Version > CheckpointVersion {
		return c, fmt.Errorf(
			"checkpoint version %d > engine version %d; refusing to load",
			c.Version, CheckpointVersion,
		)
	}
	return c, nil
}

// replayCheckpoint loads the checkpoint at path and re-runs only the
// pending surahs against the original request configuration. Completed
// surahs are skipped — the caller can read the partial_results field
// from the checkpoint file if they need them.
//
// The result is logged. Pushing the resumed result through an actual
// output channel (HTTP POST, message bus, etc.) is left to the caller,
// because the engine has no opinion on where the data goes.
func ReplayCheckpoint(ctx context.Context, path string) error {
	c, err := LoadCheckpoint(path)
	if err != nil {
		return err
	}
	if len(c.PendingSurahs) == 0 {
		return nil
	}

	resumed := c.Request
	resumed.Surahs = c.PendingSurahs

	resp := ProcessBatchParallelContext(ctx, resumed)
	combined := AggregateResumedResults(c.PartialResults, resp.Results)
	merged := BatchAnalysisResponse{
		TotalSurahs:     len(c.CompletedSurahs) + len(c.PendingSurahs),
		ProcessedSurahs: len(combined),
		TotalTimeMs:     resp.TotalTimeMs,
		Results:         combined,
		Summary:         calculateSummary(combined),
	}

	body, err := json.MarshalIndent(merged, "", "  ")
	if err != nil {
		return fmt.Errorf("marshal merged result: %w", err)
	}
	fmt.Printf("resumed batch result:\n%s\n", string(body))
	return nil
}

// AggregateResumedResults concatenates pre-checkpoint partials with the
// just-computed pending results. Exported for tests.
func AggregateResumedResults(partial, fresh []ParallelResult) []ParallelResult {
	out := make([]ParallelResult, 0, len(partial)+len(fresh))
	out = append(out, partial...)
	out = append(out, fresh...)
	return out
}
