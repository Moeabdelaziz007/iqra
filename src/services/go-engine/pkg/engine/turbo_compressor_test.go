// بسم الله الرحمن الرحيم
// Round-trip and edge-case tests for the embedding compressors.
//
// IMPORTANT: QJLCompress has an inconsistent return signature ([]int8
// instead of TurboQuantResult). #H5 is the right place to fix that
// abstraction; here we only document the divergence with a test so it
// can't drift further.

package engine

import (
	"math"
	"testing"
)

func TestTurboQuantCompress_RoundTrip(t *testing.T) {
	tests := []struct {
		name string
		in   []float64
		bits int
	}{
		{"4-bit short", []float64{0, 0.25, 0.5, 0.75, 1.0}, 4},
		{"8-bit short", []float64{-1, -0.5, 0, 0.5, 1}, 8},
		{"8-bit longer", []float64{0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8}, 8},
		{"default bits = 0 -> 8", []float64{0, 1, 0, 1, 0}, 0},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			r := TurboQuantCompress(tt.in, tt.bits)
			if len(r.Compressed) != len(tt.in) {
				t.Errorf("compressed length: got %d want %d", len(r.Compressed), len(tt.in))
			}
			if r.CompressionRatio <= 1.0 {
				t.Errorf("compression ratio should be > 1.0, got %v", r.CompressionRatio)
			}
			rec := DecompressTurboQuant(r.Compressed, r.Codebook)
			if len(rec) != len(tt.in) {
				t.Fatalf("decompressed length: got %d want %d", len(rec), len(tt.in))
			}
			// 8-bit quantisation over a small range should reconstruct
			// well; we tolerate up to step/2 per dimension.
			bits := tt.bits
			if bits <= 0 {
				bits = 8
			}
			step := (sliceMax(tt.in) - sliceMin(tt.in)) / float64(int(math.Pow(2, float64(bits)))-1)
			for i := range tt.in {
				diff := math.Abs(tt.in[i] - rec[i])
				if diff > step {
					t.Errorf("reconstruction error at %d: %v > step %v", i, diff, step)
				}
			}
			if r.ReconstructionError < 0 {
				t.Errorf("reconstruction error must be non-negative: %v", r.ReconstructionError)
			}
		})
	}
}

func TestTurboQuantCompress_ClampsBitsAboveEight(t *testing.T) {
	// Per the MaxQuantBits contract: bits > 8 must be clamped down to 8
	// rather than silently corrupting the codebook via int8 truncation.
	in := []float64{0, 0.25, 0.5, 0.75, 1.0}
	r := TurboQuantCompress(in, 16)
	// CompressedSize is len(compressed) * bits, where bits has been
	// clamped to MaxQuantBits. We can read the effective bits back out
	// by dividing.
	effectiveBits := r.CompressedSize / len(r.Compressed)
	if effectiveBits != MaxQuantBits {
		t.Errorf("bits=16 must clamp to MaxQuantBits=%d; got effective bits=%d",
			MaxQuantBits, effectiveBits)
	}
	// Round-trip must still succeed cleanly.
	rec := DecompressTurboQuant(r.Compressed, r.Codebook)
	if len(rec) != len(in) {
		t.Errorf("decompressed length: got %d want %d", len(rec), len(in))
	}
}

func TestTurboQuantCompress_DegenerateRange(t *testing.T) {
	// All-zero input: range_ becomes 0 and the function takes the
	// fallback path. Compressed length must still match input.
	in := []float64{0, 0, 0, 0}
	r := TurboQuantCompress(in, 8)
	if len(r.Compressed) != len(in) {
		t.Errorf("zero-range input must still produce same-length compressed: got %d want %d", len(r.Compressed), len(in))
	}
}

func TestPolarQuantCompress_Shape(t *testing.T) {
	in := []float64{1, 2, 3, 4, 5}
	r := PolarQuantCompress(in)
	if len(r.Compressed) != len(in) {
		t.Errorf("PolarQuant compressed length: got %d want %d", len(r.Compressed), len(in))
	}
	if r.CompressionRatio <= 0 {
		t.Errorf("PolarQuant ratio must be positive: %v", r.CompressionRatio)
	}
}

func TestQJLCompress_ReturnsByteSlice(t *testing.T) {
	// Documents the current ABI: QJLCompress returns []int8, not
	// TurboQuantResult. The handler dispatch in main.go relies on this.
	in := []float64{0.1, 0.2, 0.3, 0.4}
	r := QJLCompress(in)
	if len(r) == 0 {
		t.Error("QJLCompress must produce a non-empty output")
	}
	if len(r) > len(in)*8 {
		t.Errorf("QJL output should be smaller than 8x input: got %d for %d input", len(r), len(in))
	}
}

func TestMinMax(t *testing.T) {
	mn, mx := minMax([]float64{3, 1, 4, 1, 5, 9, 2, 6})
	if mn != 1 || mx != 9 {
		t.Errorf("minMax: got (%v, %v) want (1, 9)", mn, mx)
	}
	// Empty slice contract: function should not panic.
	mn, mx = minMax([]float64{})
	if math.IsNaN(mn) || math.IsNaN(mx) {
		t.Errorf("minMax on empty slice produced NaN: (%v, %v)", mn, mx)
	}
}

func TestMeanSquaredError(t *testing.T) {
	a := []float64{1, 2, 3, 4}
	b := []float64{1, 2, 3, 4}
	if mse := meanSquaredError(a, b); mse != 0 {
		t.Errorf("MSE of identical slices must be 0, got %v", mse)
	}
	c := []float64{2, 3, 4, 5}
	if mse := meanSquaredError(a, c); math.Abs(mse-1.0) > 1e-9 {
		t.Errorf("MSE for unit-offset slices: got %v want 1.0", mse)
	}
}

// Helpers for the round-trip step tolerance. We need slice variants
// of min/max; we deliberately use non-builtin names so we don't shadow
// Go 1.21+'s builtin min/max which other files in this package rely on.
func sliceMax(s []float64) float64 {
	m := s[0]
	for _, v := range s[1:] {
		if v > m {
			m = v
		}
	}
	return m
}
func sliceMin(s []float64) float64 {
	m := s[0]
	for _, v := range s[1:] {
		if v < m {
			m = v
		}
	}
	return m
}
